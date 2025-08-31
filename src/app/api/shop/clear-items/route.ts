import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import { unlink, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('MongoDB Connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Shop Item Schema
const shopItemSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String, 
    required: true,
    trim: true
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },

  image: { 
    type: String, 
    required: true,
    trim: true
  },
  fileUrl: { 
    type: String, 
    trim: true
  },
  fileName: { 
    type: String, 
    trim: true
  },
  contentType: { 
    type: String, 
    default: 'none'
  },
  textContent: { 
    type: String, 
    default: ''
  },
  linkUrl: { 
    type: String, 
    default: ''
  },
  hasFile: { 
    type: Boolean, 
    default: false
  },
  inStock: { 
    type: Boolean, 
    default: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

const ShopItem = mongoose.models.ShopItem || mongoose.model('ShopItem', shopItemSchema);

// Check if user is admin
const isAdmin = (userId: string) => {
  const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917'];
  return ADMIN_USER_IDS.includes(userId);
};

// DELETE - Clear all shop items (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    // Clean up all associated files before deleting items
    try {
      // 1. Delete all files from FileStorage collection
      const FileStorage = mongoose.models.FileStorage || mongoose.model('FileStorage', new mongoose.Schema({
        itemId: mongoose.Schema.Types.ObjectId,
        fileName: String,
        originalName: String,
        fileData: String,
        fileSize: Number,
        mimeType: String,
        uploadedAt: Date,
        uploadedBy: String,
        fileHash: String,
        isActive: Boolean,
        downloadCount: Number
      }));

      const fileResult = await FileStorage.deleteMany({});
      console.log(`Deleted ${fileResult.deletedCount} file records from database`);

      // 2. Clean up physical image files from uploads directory
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'shop');
      if (existsSync(uploadsDir)) {
        const files = await readdir(uploadsDir);
        for (const file of files) {
          if (file.startsWith('shop-')) {
            const filePath = join(uploadsDir, file);
            await unlink(filePath);
            console.log(`Deleted image file: ${filePath}`);
          }
        }
      }

      // 3. Clean up shop-files directory
      const shopFilesDir = join(process.cwd(), 'public', 'uploads', 'shop-files');
      if (existsSync(shopFilesDir)) {
        const files = await readdir(shopFilesDir);
        for (const file of files) {
          const filePath = join(shopFilesDir, file);
          await unlink(filePath);
          console.log(`Deleted shop file: ${filePath}`);
        }
      }

    } catch (fileError) {
      console.error('Error cleaning up files:', fileError);
      // Continue with item deletion even if file cleanup fails
    }

    // Delete all shop items
    const result = await ShopItem.deleteMany({});

    return NextResponse.json({ 
      message: `Successfully deleted ${result.deletedCount} items and all associated files from the shop`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Error clearing shop items:', error);
    return NextResponse.json({ error: 'Failed to clear shop items' }, { status: 500 });
  }
}
