import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

// Purchase History Schema
const purchaseHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopItem', required: true },
  itemName: { type: String, required: true },
  price: { type: Number, required: true },
  purchaseDate: { type: Date, default: Date.now },
  hasFile: { type: Boolean, default: false },
  fileUrl: { type: String },
  fileName: { type: String },
  contentType: { type: String },
  textContent: { type: String },
  linkUrl: { type: String }
});

// File Storage Schema - Updated to match upload/download schemas
const fileStorageSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  fileData: { type: Buffer, required: true }, // Binary file data - matches upload/download schemas
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: String, required: true },
  fileHash: { type: String },
  isActive: { type: Boolean, default: true },
  downloadCount: { type: Number, default: 0 }
});

const PurchaseHistory = mongoose.models.PurchaseHistory || mongoose.model('PurchaseHistory', purchaseHistorySchema);
const FileStorage = mongoose.models.FileStorage || mongoose.model('FileStorage', fileStorageSchema);

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { purchaseId } = await request.json();
    const userId = (session.user as any).id;

    if (!purchaseId) {
      return NextResponse.json({ error: 'Purchase ID required' }, { status: 400 });
    }

    // Get purchase record
    const purchase = await PurchaseHistory.findById(purchaseId);
    if (!purchase) {
      return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
    }

    // Verify ownership
    if (purchase.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if file exists
    if (!purchase.hasFile || !purchase.fileUrl || purchase.fileUrl === '') {
      console.log('Download API - No file available:', {
        hasFile: purchase.hasFile,
        fileUrl: purchase.fileUrl,
        fileName: purchase.fileName
      });
      return NextResponse.json({ error: 'No file available' }, { status: 404 });
    }

    // Connect to database
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    // Get file from database
    const fileRecord = await FileStorage.findOne({ 
      itemId: purchase.itemId 
    });

    if (!fileRecord) {
      console.log(`Download API - File not found in database for item ${purchase.itemId}`);
      return NextResponse.json({ error: 'File not found in database' }, { status: 404 });
    }

    console.log(`Download API - File found in database: ${fileRecord.originalName}`);
    console.log(`Download API - File data type: ${typeof fileRecord.fileData}, isBuffer: ${Buffer.isBuffer(fileRecord.fileData)}`);

    // Handle file data properly - it might be stored as Buffer or base64 string
    let fileBuffer: Buffer;
    if (Buffer.isBuffer(fileRecord.fileData)) {
      fileBuffer = fileRecord.fileData;
    } else if (typeof fileRecord.fileData === 'string') {
      // If it's stored as base64 string, convert it back to buffer
      fileBuffer = Buffer.from(fileRecord.fileData, 'base64');
    } else {
      console.error(`Invalid file data format for item ${purchase.itemId}`);
      return NextResponse.json({ error: 'File data format error. Please contact support.' }, { status: 500 });
    }

    const fileName = fileRecord.originalName || purchase.fileName || 'download';
    console.log('Download API - Purchase fileName:', purchase.fileName);
    console.log('Download API - Final fileName for download:', fileName);

    // Use the MIME type from the database
    const contentType = fileRecord.mimeType || 'application/octet-stream';
    
    console.log('Download API - Content type from database:', contentType);

    // Ensure filename is properly encoded for Content-Disposition
    const encodedFileName = encodeURIComponent(fileName);
    console.log('Download API - Encoded filename:', encodedFileName);
    
    return new NextResponse(fileBuffer as any, {
      headers: {
        'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`,
        'Content-Type': contentType,
      },
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
