import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

// File Storage Schema
const fileStorageSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  fileData: { type: String, required: true },
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: String, required: true },
  fileHash: { type: String },
  isActive: { type: Boolean, default: true },
  downloadCount: { type: Number, default: 0 }
});

// Download Log Schema
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

// GET - List all files with statistics
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userId = (session.user as any).id;
    const adminIds = ['898059066537029692'];
    if (!adminIds.includes(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Connect to database
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'uploadedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    const query: any = { isActive: true };
    if (search) {
      query.$or = [
        { fileName: { $regex: search, $options: 'i' } },
        { originalName: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get files with pagination
    const files = await FileStorage.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const totalFiles = await FileStorage.countDocuments(query);

    // Get statistics
    const stats = await FileStorage.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$fileSize' },
          totalDownloads: { $sum: '$downloadCount' },
          avgFileSize: { $avg: '$fileSize' }
        }
      }
    ]);

    // Format file data
    const formattedFiles = files.map(file => ({
      id: file._id,
      itemId: file.itemId,
      fileName: file.fileName,
      originalName: file.originalName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      uploadedAt: file.uploadedAt,
      uploadedBy: file.uploadedBy,
      downloadCount: file.downloadCount,
      fileSizeFormatted: formatFileSize(file.fileSize),
      uploadedAtFormatted: new Date(file.uploadedAt).toLocaleDateString()
    }));

    return NextResponse.json({
      success: true,
      files: formattedFiles,
      pagination: {
        page,
        limit,
        total: totalFiles,
        totalPages: Math.ceil(totalFiles / limit)
      },
      statistics: stats[0] || {
        totalFiles: 0,
        totalSize: 0,
        totalDownloads: 0,
        avgFileSize: 0
      }
    });

  } catch (error) {
    console.error('File management GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }
}

// DELETE - Soft delete a file
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userId = (session.user as any).id;
    const adminIds = ['898059066537029692'];
    if (!adminIds.includes(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Connect to database
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    // Get file ID from request body
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    // Soft delete the file
    const result = await FileStorage.findByIdAndUpdate(
      fileId,
      { isActive: false },
      { new: true }
    );

    if (!result) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    console.log(`File soft deleted: ${result.originalName} by user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
      file: {
        id: result._id,
        fileName: result.fileName,
        originalName: result.originalName
      }
    });

  } catch (error) {
    console.error('File management DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
