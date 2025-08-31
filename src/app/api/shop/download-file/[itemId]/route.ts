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

    // Check if user has purchased this item (optional security check)
    // You can add purchase verification here if needed
    
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

    // File data is already a buffer
    const fileBuffer = fileRecord.fileData;

    // Verify file integrity (optional)
    const calculatedHash = crypto.createHash('md5').update(fileBuffer).digest('hex');
    if (fileRecord.fileHash && calculatedHash !== fileRecord.fileHash) {
      console.error(`File integrity check failed for item ${itemId}`);
      return NextResponse.json({ error: 'File corrupted. Please contact support.' }, { status: 500 });
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
    return new NextResponse(fileBuffer, { headers });

  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json({ 
      error: 'Download failed. Please try again or contact support if the problem persists.' 
    }, { status: 500 });
  }
}
