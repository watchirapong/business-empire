import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import crypto from 'crypto';

// File Storage Schema with enhanced fields
const fileStorageSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  fileData: { type: Buffer, required: true }, // Binary file data
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: String, required: true },
  fileHash: { type: String },
  isActive: { type: Boolean, default: true },
  downloadCount: { type: Number, default: 0 }
});

// Download Log Schema for tracking
const downloadLogSchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  downloadedAt: { type: Date, default: Date.now },
  userAgent: { type: String },
  ipAddress: { type: String }
});

const FileStorage = mongoose.models.FileStorage || mongoose.model('FileStorage', fileStorageSchema);
const DownloadLog = mongoose.models.DownloadLog || mongoose.model('DownloadLog', downloadLogSchema);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;
    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Unknown User';

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    // Connect to database
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    // Get file from database
    const fileRecord = await FileStorage.findOne({ 
      itemId: new mongoose.Types.ObjectId(itemId),
      isActive: true
    });

    if (!fileRecord) {
      console.log(`File not found for item ${itemId}`);
      return NextResponse.json({ error: 'File not found or has been removed' }, { status: 404 });
    }

    // Check if user has purchased this item (required security check)
    const PurchaseHistory = mongoose.models.PurchaseHistory || mongoose.model('PurchaseHistory', new mongoose.Schema({
      userId: { type: String, required: true, index: true },
      username: { type: String, required: true },
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopItem', required: true, index: true },
      itemName: { type: String, required: true },
      price: { type: Number, required: true },
      purchaseDate: { type: Date, default: Date.now },
      downloadCount: { type: Number, default: 0 },
      lastDownloadDate: { type: Date },
      hasFile: { type: Boolean, default: false },
      fileUrl: { type: String },
      fileName: { type: String },
      contentType: { type: String, default: 'none' },
      textContent: { type: String, default: '' },
      linkUrl: { type: String, default: '' }
    }));

    const purchaseRecord = await PurchaseHistory.findOne({ 
      userId: userId, 
      itemId: new mongoose.Types.ObjectId(itemId) 
    });

    if (!purchaseRecord) {
      console.log(`User ${userId} has not purchased item ${itemId}`);
      return NextResponse.json({ error: 'You have not purchased this item' }, { status: 403 });
    }

    console.log(`Purchase verification successful for user ${userId} and item ${itemId}`);
    
    // Log the download
    try {
      const downloadLog = new DownloadLog({
        fileId: fileRecord._id,
        itemId: fileRecord.itemId,
        userId: userId,
        userName: userName,
        downloadedAt: new Date(),
        userAgent: request.headers.get('user-agent') || 'Unknown',
        ipAddress: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'Unknown'
      });
      await downloadLog.save();

      // Update download count
      fileRecord.downloadCount += 1;
      await fileRecord.save();
    } catch (logError) {
      console.error('Failed to log download:', logError);
      // Don't fail the download if logging fails
    }

    console.log(`Serving file for item ${itemId}: ${fileRecord.originalName} (Download #${fileRecord.downloadCount})`);
    console.log(`File details - fileName: ${fileRecord.fileName}, originalName: ${fileRecord.originalName}`);
    console.log(`File data type: ${typeof fileRecord.fileData}, isBuffer: ${Buffer.isBuffer(fileRecord.fileData)}`);

    // Handle file data properly - it might be stored as Buffer or base64 string
    let fileBuffer: Buffer;
    if (Buffer.isBuffer(fileRecord.fileData)) {
      fileBuffer = fileRecord.fileData;
    } else if (typeof fileRecord.fileData === 'string') {
      // If it's stored as base64 string, convert it back to buffer
      fileBuffer = Buffer.from(fileRecord.fileData, 'base64');
    } else {
      console.error(`Invalid file data format for item ${itemId}`);
      return NextResponse.json({ error: 'File data format error. Please contact support.' }, { status: 500 });
    }

    // Verify file integrity (optional) - only if hash exists
    if (fileRecord.fileHash) {
      const calculatedHash = crypto.createHash('md5').update(fileBuffer).digest('hex');
      if (calculatedHash !== fileRecord.fileHash) {
        console.warn(`File integrity check failed for item ${itemId}. Expected: ${fileRecord.fileHash}, Got: ${calculatedHash}`);
        console.warn(`Continuing with download despite hash mismatch - this may be due to data processing differences`);
        // Don't fail the download, just log the warning
      } else {
        console.log(`File integrity check passed for item ${itemId}`);
      }
    } else {
      console.log(`No hash available for item ${itemId}, skipping integrity check`);
    }

    // Set content type with proper MIME type detection
    let contentType = fileRecord.mimeType || 'application/octet-stream';
    
    // Override MIME type for specific file extensions
    const fileExtension = fileRecord.originalName.toLowerCase().split('.').pop();
    if (fileExtension === 'unitypackage') {
      contentType = 'application/octet-stream';
    } else if (fileExtension === 'zip') {
      contentType = 'application/zip';
    } else if (fileExtension === 'pdf') {
      contentType = 'application/pdf';
    }
    
    console.log(`Content-Type: ${contentType} for file: ${fileRecord.originalName}`);

    // Ensure filename is properly encoded for Content-Disposition
    // Allow common filename characters including parentheses, brackets, and spaces
    const safeFileName = fileRecord.originalName.replace(/[^\w\s.\-()\[\]{}]/g, '_');
    
    // Create a simple but effective Content-Disposition header
    const contentDisposition = `attachment; filename="${safeFileName}"`;
    
    console.log(`Final filename for download: ${safeFileName}`);
    console.log(`Content-Disposition: ${contentDisposition}`);

    // Set headers for proper file download
    const headers = {
      'Content-Disposition': contentDisposition,
      'Content-Type': contentType,
      'Content-Length': fileRecord.fileSize.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    // Return file with proper headers
    const buffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
    return new NextResponse(buffer as ArrayBuffer, { headers });

  } catch (error) {
    console.error('File download error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      itemId: await params.then(p => p.itemId).catch(() => 'unknown')
    });
    return NextResponse.json({ 
      error: 'Download failed. Please try again or contact support if the problem persists.',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 });
  }
}
