import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI!);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Shop Item Schema
const shopItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, required: true, trim: true },
  fileUrl: { type: String, trim: true },
  fileName: { type: String, trim: true },
  contentType: { type: String, default: 'none' },
  textContent: { type: String, default: '' },
  linkUrl: { type: String, default: '' },
  hasFile: { type: Boolean, default: false },
  inStock: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ShopItem = mongoose.models.ShopItem || mongoose.model('ShopItem', shopItemSchema);

// Check if user is admin
const isAdmin = (userId: string) => {
  const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917'];
  return ADMIN_USER_IDS.includes(userId);
};

export async function POST(request: NextRequest) {
  try {
    console.log('File upload API called');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      console.log('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    console.log('User ID:', userId);
    
    if (!isAdmin(userId)) {
      console.log('User is not admin');
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    console.log('MongoDB connected');

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const itemId = formData.get('itemId') as string;

    console.log('File received:', file ? file.name : 'No file');
    console.log('Item ID received:', itemId);

    if (!file) {
      console.log('No file provided');
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!itemId) {
      console.log('No item ID provided');
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    // Validate item ID format
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      console.log('Invalid item ID format:', itemId);
      return NextResponse.json({ error: 'Invalid item ID format' }, { status: 400 });
    }

    // Check if item exists
    const existingItem = await ShopItem.findById(itemId);
    if (!existingItem) {
      console.log('Item not found:', itemId);
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    console.log('Item found:', existingItem.name);

    // Create uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'shop-files');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('Created uploads directory:', uploadsDir);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name;
    const fileName = `${timestamp}-${originalName}`;
    const filePath = path.join(uploadsDir, fileName);

    console.log('Saving file as:', fileName);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(filePath, buffer);

    console.log('File saved successfully');

    // Update item with file information
    const fileUrl = `/uploads/shop-files/${fileName}`;
    const updatedItem = await ShopItem.findByIdAndUpdate(
      itemId,
      {
        fileUrl,
        fileName: originalName,
        hasFile: true,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedItem) {
      console.log('Failed to update item');
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
    }

    console.log('Item updated successfully:', updatedItem.name);

    return NextResponse.json({ 
      success: true,
      fileUrl,
      fileName: originalName,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
