import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

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

// Comprehensive shop items data with all features
const shopItems = [
  {
    id: '1',
    name: 'Premium Avatar Frame',
    description: 'Exclusive golden avatar frame for your profile',
    price: 500,
    image: '👑',
    inStock: true,
    category: 'cosmetic',
    contentType: 'none' as const,
    allowMultiplePurchases: true,
    requiresRole: false,
    hasFile: false,
    purchaseCount: 45,
    totalRevenue: 22500,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'VIP Badge',
    description: 'Show your VIP status with this exclusive badge',
    price: 1000,
    image: '⭐',
    inStock: true,
    category: 'cosmetic',
    contentType: 'text' as const,
    textContent: 'Congratulations! You are now a VIP member. This badge grants you access to exclusive channels and priority support.',
    allowMultiplePurchases: false,
    requiresRole: true,
    requiredRoleId: '1388546120912998554',
    requiredRoleName: 'Starway',
    hasFile: false,
    purchaseCount: 23,
    totalRevenue: 23000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Extra Lives Pack',
    description: 'Get 5 extra lives for games',
    price: 200,
    image: '❤️',
    inStock: true,
    category: 'gaming',
    contentType: 'link' as const,
    linkUrl: 'https://example.com/download-extra-lives',
    allowMultiplePurchases: true,
    requiresRole: false,
    hasFile: true,
    fileName: 'extra-lives-pack.zip',
    purchaseCount: 67,
    totalRevenue: 13400,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Lucky Charm',
    description: 'Increase your luck in all games by 10%',
    price: 300,
    image: '🍀',
    inStock: false,
    category: 'gaming',
    contentType: 'youtube' as const,
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    allowMultiplePurchases: true,
    requiresRole: false,
    hasFile: false,
    purchaseCount: 12,
    totalRevenue: 3600,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '5',
    name: 'Game Pass Ultimate',
    description: 'Access to all premium games and features',
    price: 2500,
    image: '🎮',
    inStock: true,
    category: 'gaming',
    contentType: 'file' as const,
    fileUrl: '/downloads/game-pass-ultimate.exe',
    fileName: 'game-pass-ultimate.exe',
    allowMultiplePurchases: false,
    requiresRole: true,
    requiredRoleId: '1388546120912998554',
    requiredRoleName: 'Starway',
    hasFile: true,
    purchaseCount: 8,
    totalRevenue: 20000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function GET() {
  try {
    await connectDB();

    // Fetch items from MongoDB instead of using hardcoded array
    const ShopItem = mongoose.models.ShopItem || mongoose.model('ShopItem', new mongoose.Schema({
      name: String,
      description: String,
      price: Number,
      image: String,
      inStock: Boolean,
      category: String,
      contentType: String,
      textContent: String,
      linkUrl: String,
      fileUrl: String,
      fileName: String,
      hasFile: Boolean,
      requiresRole: Boolean,
      requiredRoleId: String,
      requiredRoleName: String,
      allowMultiplePurchases: Boolean,
      youtubeUrl: String,
      purchaseCount: Number,
      totalRevenue: Number,
      createdAt: Date,
      updatedAt: Date
    }));

    const items = await ShopItem.find().sort({ createdAt: -1 });

    // Convert MongoDB documents to plain objects and add id field
    const itemsWithId = items.map(item => ({
      id: item._id.toString(),
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
      inStock: item.inStock,
      category: item.category || 'other',
      contentType: item.contentType || 'none',
      textContent: item.textContent || '',
      linkUrl: item.linkUrl || '',
      fileUrl: item.fileUrl || '',
      fileName: item.fileName || '',
      hasFile: item.hasFile || false,
      requiresRole: item.requiresRole || false,
      requiredRoleId: item.requiredRoleId || '',
      requiredRoleName: item.requiredRoleName || '',
      allowMultiplePurchases: item.allowMultiplePurchases !== undefined ? item.allowMultiplePurchases : true,
      youtubeUrl: item.youtubeUrl || '',
      purchaseCount: item.purchaseCount || 0,
      totalRevenue: item.totalRevenue || 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    return NextResponse.json({ items: itemsWithId });
  } catch (error) {
    console.error('Error fetching shop items:', error);
    return NextResponse.json({ error: 'Failed to fetch shop items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Check if request contains FormData (file upload) or JSON
    let body: any = {};
    let uploadedImageUrl = '';

    if (request.headers.get('content-type')?.includes('multipart/form-data')) {
      // Handle FormData with file upload
      const formData = await request.formData();

      // Extract all form fields
      for (const [key, value] of formData.entries()) {
        if (key === 'imageFile' && value instanceof File) {
          // Handle file upload
          const bytes = await value.arrayBuffer();
          const buffer = Buffer.from(bytes);

          // Create uploads directory if it doesn't exist
          const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'shop-images');

          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          // Generate unique filename
          const fileName = `${Date.now()}-${value.name}`;
          const filePath = path.join(uploadsDir, fileName);

          // Save file
          fs.writeFileSync(filePath, buffer);

          // Set image URL for database
          uploadedImageUrl = `/uploads/shop-images/${fileName}`;
        } else {
          // Handle regular form fields
          body[key] = value;
        }
      }

      // Override image field if file was uploaded
      if (uploadedImageUrl) {
        body.image = uploadedImageUrl;
      }
    } else {
      // Handle regular JSON request
      body = await request.json();
    }

    // If it has itemId, it's a purchase request
    if (body.itemId) {
      const { itemId } = body;

      // Simple purchase simulation
      const item = shopItems.find(item => item.id === itemId);
      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      if (!item.inStock) {
        return NextResponse.json({ error: 'Item out of stock' }, { status: 400 });
      }

      // Mock purchase success
      return NextResponse.json({
        success: true,
        message: 'Purchase successful',
        item: item,
        purchaseId: Date.now().toString()
      });
    }

    // If no itemId, it's an admin creating a new item
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const {
      name,
      description,
      price,
      image,
      category,
      contentType,
      textContent,
      linkUrl,
      youtubeUrl,
      inStock,
      allowMultiplePurchases,
      requiresRole,
      requiredRoleId,
      requiredRoleName
    } = body;

    // Validate required fields
    if (!name || !description || !price || !image || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create new item
    const newItem = {
      id: Date.now().toString(),
      name,
      description,
      price: parseFloat(price),
      image,
      category,
      contentType: contentType || 'none',
      textContent: textContent || '',
      linkUrl: linkUrl || '',
      youtubeUrl: youtubeUrl || '',
      inStock: inStock !== undefined ? inStock : true,
      allowMultiplePurchases: allowMultiplePurchases || false,
      requiresRole: requiresRole || false,
      requiredRoleId: requiredRoleId || '',
      requiredRoleName: requiredRoleName || '',
      hasFile: false,
      fileUrl: '',
      fileName: '',
      purchaseCount: 0,
      totalRevenue: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await connectDB();

    // Save to MongoDB
    const ShopItem = mongoose.models.ShopItem || mongoose.model('ShopItem', new mongoose.Schema({
      name: String,
      description: String,
      price: Number,
      image: String,
      inStock: Boolean,
      category: String,
      contentType: String,
      textContent: String,
      linkUrl: String,
      fileUrl: String,
      fileName: String,
      hasFile: Boolean,
      requiresRole: Boolean,
      requiredRoleId: String,
      requiredRoleName: String,
      allowMultiplePurchases: Boolean,
      youtubeUrl: String,
      purchaseCount: Number,
      totalRevenue: Number,
      createdAt: Date,
      updatedAt: Date
    }));

    const savedItem = new ShopItem({
      name,
      description,
      price: Number(price),
      image,
      category,
      contentType: contentType || 'none',
      textContent: textContent || '',
      linkUrl: linkUrl || '',
      youtubeUrl: youtubeUrl || '',
      inStock: inStock !== undefined ? inStock : true,
      allowMultiplePurchases: allowMultiplePurchases !== undefined ? allowMultiplePurchases : false,
      requiresRole: requiresRole !== undefined ? requiresRole : false,
      requiredRoleId: requiredRoleId || '',
      requiredRoleName: requiredRoleName || '',
      hasFile: false,
      fileUrl: '',
      fileName: '',
      purchaseCount: 0,
      totalRevenue: 0
    });

    await savedItem.save();

    return NextResponse.json({
      success: true,
      message: 'Item created successfully',
      item: {
        id: savedItem._id.toString(),
        name: savedItem.name,
        description: savedItem.description,
        price: savedItem.price,
        image: savedItem.image,
        inStock: savedItem.inStock,
        category: savedItem.category,
        contentType: savedItem.contentType,
        textContent: savedItem.textContent,
        linkUrl: savedItem.linkUrl,
        youtubeUrl: savedItem.youtubeUrl,
        fileUrl: savedItem.fileUrl,
        fileName: savedItem.fileName,
        hasFile: savedItem.hasFile,
        requiresRole: savedItem.requiresRole,
        requiredRoleId: savedItem.requiredRoleId,
        requiredRoleName: savedItem.requiredRoleName,
        allowMultiplePurchases: savedItem.allowMultiplePurchases,
        purchaseCount: savedItem.purchaseCount,
        totalRevenue: savedItem.totalRevenue,
        createdAt: savedItem.createdAt,
        updatedAt: savedItem.updatedAt
      }
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if request contains FormData (file upload) or JSON
    let body: any = {};
    let uploadedImageUrl = '';

    if (request.headers.get('content-type')?.includes('multipart/form-data')) {
      // Handle FormData with file upload
      const formData = await request.formData();

      // Extract all form fields
      for (const [key, value] of formData.entries()) {
        if (key === 'imageFile' && value instanceof File) {
          // Handle file upload
          const bytes = await value.arrayBuffer();
          const buffer = Buffer.from(bytes);

          // Create uploads directory if it doesn't exist
          const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'shop-images');

          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          // Generate unique filename
          const fileName = `${Date.now()}-${value.name}`;
          const filePath = path.join(uploadsDir, fileName);

          // Save file
          fs.writeFileSync(filePath, buffer);

          // Set image URL for database
          uploadedImageUrl = `/uploads/shop-images/${fileName}`;
        } else {
          // Handle regular form fields
          body[key] = value;
        }
      }

      // Override image field if file was uploaded
      if (uploadedImageUrl) {
        body.image = uploadedImageUrl;
      }
    } else {
      // Handle regular JSON request
      body = await request.json();
    }

    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    await connectDB();

    // Find and update item in MongoDB
    const ShopItem = mongoose.models.ShopItem || mongoose.model('ShopItem', new mongoose.Schema({
      name: String,
      description: String,
      price: Number,
      image: String,
      inStock: Boolean,
      category: String,
      contentType: String,
      textContent: String,
      linkUrl: String,
      fileUrl: String,
      fileName: String,
      hasFile: Boolean,
      requiresRole: Boolean,
      requiredRoleId: String,
      requiredRoleName: String,
      allowMultiplePurchases: Boolean,
      youtubeUrl: String,
      purchaseCount: Number,
      totalRevenue: Number,
      createdAt: Date,
      updatedAt: Date
    }));

    const updatedItem = await ShopItem.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Item updated successfully',
      item: {
        id: updatedItem._id.toString(),
        name: updatedItem.name,
        description: updatedItem.description,
        price: updatedItem.price,
        image: updatedItem.image,
        inStock: updatedItem.inStock,
        category: updatedItem.category,
        contentType: updatedItem.contentType,
        textContent: updatedItem.textContent,
        linkUrl: updatedItem.linkUrl,
        youtubeUrl: updatedItem.youtubeUrl,
        fileUrl: updatedItem.fileUrl,
        fileName: updatedItem.fileName,
        hasFile: updatedItem.hasFile,
        requiresRole: updatedItem.requiresRole,
        requiredRoleId: updatedItem.requiredRoleId,
        requiredRoleName: updatedItem.requiredRoleName,
        allowMultiplePurchases: updatedItem.allowMultiplePurchases,
        purchaseCount: updatedItem.purchaseCount,
        totalRevenue: updatedItem.totalRevenue,
        createdAt: updatedItem.createdAt,
        updatedAt: updatedItem.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    await connectDB();

    // Find and delete item from MongoDB
    const ShopItem = mongoose.models.ShopItem || mongoose.model('ShopItem', new mongoose.Schema({
      name: String,
      description: String,
      price: Number,
      image: String,
      inStock: Boolean,
      category: String,
      contentType: String,
      textContent: String,
      linkUrl: String,
      fileUrl: String,
      fileName: String,
      hasFile: Boolean,
      requiresRole: Boolean,
      requiredRoleId: String,
      requiredRoleName: String,
      allowMultiplePurchases: Boolean,
      youtubeUrl: String,
      purchaseCount: Number,
      totalRevenue: Number,
      createdAt: Date,
      updatedAt: Date
    }));

    const deletedItem = await ShopItem.findByIdAndDelete(id);

    if (!deletedItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Item deleted successfully',
      item: {
        id: deletedItem._id.toString(),
        name: deletedItem.name,
        description: deletedItem.description,
        price: deletedItem.price,
        image: deletedItem.image,
        inStock: deletedItem.inStock,
        category: deletedItem.category,
        contentType: deletedItem.contentType,
        textContent: deletedItem.textContent,
        linkUrl: deletedItem.linkUrl,
        youtubeUrl: deletedItem.youtubeUrl,
        fileUrl: deletedItem.fileUrl,
        fileName: deletedItem.fileName,
        hasFile: deletedItem.hasFile,
        requiresRole: deletedItem.requiresRole,
        requiredRoleId: deletedItem.requiredRoleId,
        requiredRoleName: deletedItem.requiredRoleName,
        allowMultiplePurchases: deletedItem.allowMultiplePurchases,
        purchaseCount: deletedItem.purchaseCount,
        totalRevenue: deletedItem.totalRevenue,
        createdAt: deletedItem.createdAt,
        updatedAt: deletedItem.updatedAt
      }
    });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
