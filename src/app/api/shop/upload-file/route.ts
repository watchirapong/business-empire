import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import crypto from 'crypto';

// Configure for large file uploads
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

// Custom configuration for large file uploads
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// File Storage Schema with enhanced fields
const fileStorageSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  fileData: { type: String, required: true }, // Base64 encoded file data
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: String, required: true }, // Track who uploaded
  fileHash: { type: String }, // For file integrity
  isActive: { type: Boolean, default: true }, // Soft delete support
  downloadCount: { type: Number, default: 0 } // Track downloads
});

const FileStorage = mongoose.models.FileStorage || mongoose.model('FileStorage', fileStorageSchema);

// Supported file types and their max sizes
const ALLOWED_FILE_TYPES: { [key: string]: { maxSize: number; name: string } } = {
  // Documents
  'application/pdf': { maxSize: 50 * 1024 * 1024, name: 'PDF Document' },
  'application/msword': { maxSize: 20 * 1024 * 1024, name: 'Word Document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { maxSize: 20 * 1024 * 1024, name: 'Word Document' },
  'text/plain': { maxSize: 10 * 1024 * 1024, name: 'Text File' },
  
  // Images
  'image/jpeg': { maxSize: 20 * 1024 * 1024, name: 'JPEG Image' },
  'image/png': { maxSize: 20 * 1024 * 1024, name: 'PNG Image' },
  'image/gif': { maxSize: 20 * 1024 * 1024, name: 'GIF Image' },
  'image/webp': { maxSize: 20 * 1024 * 1024, name: 'WebP Image' },
  
  // Archives
  'application/zip': { maxSize: 100 * 1024 * 1024, name: 'ZIP Archive' },
  'application/x-rar-compressed': { maxSize: 100 * 1024 * 1024, name: 'RAR Archive' },
  'application/x-7z-compressed': { maxSize: 100 * 1024 * 1024, name: '7-Zip Archive' },
  
  // 3D and Game Files
  'application/octet-stream': { maxSize: 200 * 1024 * 1024, name: 'Binary File' }, // For .blend, .unitypackage, etc.
  
  // Code Files
  'text/javascript': { maxSize: 10 * 1024 * 1024, name: 'JavaScript File' },
  'text/x-python': { maxSize: 10 * 1024 * 1024, name: 'Python File' },
  'text/x-java-source': { maxSize: 10 * 1024 * 1024, name: 'Java File' },
  'text/css': { maxSize: 5 * 1024 * 1024, name: 'CSS File' },
  'text/html': { maxSize: 5 * 1024 * 1024, name: 'HTML File' },
  
  // Default for unknown types
  'default': { maxSize: 50 * 1024 * 1024, name: 'File' }
};

export async function POST(request: NextRequest) {
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const itemId = formData.get('itemId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    // Validate file type and size
    const fileType = file.type || 'application/octet-stream';
    const allowedType = ALLOWED_FILE_TYPES[fileType] || ALLOWED_FILE_TYPES['default'];
    
    if (file.size > allowedType.maxSize) {
      return NextResponse.json({ 
        error: `File too large. Max size for ${allowedType.name} is ${Math.round(allowedType.maxSize / (1024 * 1024))}MB.` 
      }, { status: 400 });
    }

    // Validate file name
    const fileName = file.name.trim();
    if (!fileName || fileName.length > 255) {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
    }

    // Check for potentially dangerous file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (dangerousExtensions.includes(fileExtension)) {
      return NextResponse.json({ error: 'File type not allowed for security reasons' }, { status: 400 });
    }

    // Connect to database
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    // Convert file to Base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');

    // Generate simple hash for file integrity (optional)
    const fileHash = crypto.createHash('md5').update(buffer).digest('hex');

    // Check if file already exists for this item
    const existingFile = await FileStorage.findOne({ itemId });
    if (existingFile) {
      // Update existing file
      existingFile.fileName = fileName;
      existingFile.originalName = fileName;
      existingFile.fileData = base64Data;
      existingFile.fileSize = file.size;
      existingFile.mimeType = fileType;
      existingFile.uploadedAt = new Date();
      existingFile.uploadedBy = userId;
      existingFile.fileHash = fileHash;
      existingFile.isActive = true;
      await existingFile.save();
      
      console.log(`File updated for item ${itemId}: ${fileName} (${file.size} bytes)`);
    } else {
      // Create new file record
      const fileStorage = new FileStorage({
        itemId: new mongoose.Types.ObjectId(itemId),
        fileName: fileName,
        originalName: fileName,
        fileData: base64Data,
        fileSize: file.size,
        mimeType: fileType,
        uploadedBy: userId,
        fileHash: fileHash,
        isActive: true,
        downloadCount: 0
      });
      await fileStorage.save();
      
      console.log(`File uploaded successfully for item ${itemId}: ${fileName} (${file.size} bytes)`);
    }

    // Return enhanced file info
    return NextResponse.json({
      success: true,
      fileName: fileName,
      fileUrl: `/api/shop/download-file/${itemId}`,
      fileSize: file.size,
      fileType: fileType,
      fileTypeName: allowedType.name,
      uploadedAt: new Date().toISOString(),
      uploadedBy: userId
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ 
      error: 'Upload failed. Please try again or contact support if the problem persists.' 
    }, { status: 500 });
  }
}
