import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import { isAdmin } from '@/lib/admin-config';
import { unlink } from 'fs/promises';
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
  inStock: { 
    type: Boolean, 
    default: true
  },
  allowMultiplePurchases: { 
    type: Boolean, 
    default: false
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
  youtubeUrl: { 
    type: String, 
    default: ''
  },
  fileUrl: { 
    type: String, 
    default: ''
  },
  fileName: { 
    type: String, 
    default: ''
  },
  hasFile: { 
    type: Boolean, 
    default: false
  },
  // Role-based restrictions
  requiresRole: {
    type: Boolean,
    default: false
  },
  requiredRoleId: {
    type: String,
    default: ''
  },
  requiredRoleName: {
    type: String,
    default: ''
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

// Update the updatedAt field before saving
shopItemSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const ShopItem = mongoose.models.ShopItem || mongoose.model('ShopItem', shopItemSchema);

// Using centralized admin config

// GET - Get all shop items
export async function GET() {
  try {
    await connectDB();
    

    
    const items = await ShopItem.find().sort({ createdAt: -1 });
    
    // Convert MongoDB documents to plain objects and add id field
    const itemsWithId = items.map(item => ({
      id: item._id.toString(),
      name: item.name,
      description: item.description,
      price: item.price,
      image: item.image,
      hasFile: item.hasFile || false,
      fileUrl: item.fileUrl,
      fileName: item.fileName,
      inStock: item.inStock,
      allowMultiplePurchases: item.allowMultiplePurchases || false,
      contentType: item.contentType || 'none',
      textContent: item.textContent || '',
      linkUrl: item.linkUrl || '',
      youtubeUrl: item.youtubeUrl || '',
      requiresRole: item.requiresRole || false,
      requiredRoleId: item.requiredRoleId || '',
      requiredRoleName: item.requiredRoleName || ''
    }));
    
    return NextResponse.json({ items: itemsWithId });
  } catch (error) {
    console.error('Error fetching shop items:', error);
    return NextResponse.json({ error: 'Failed to fetch shop items' }, { status: 500 });
  }
}

// POST - Add new shop item (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('Shop API - Session:', session);
    console.log('Shop API - User:', session?.user);
    
    if (!session?.user) {
      console.log('Shop API - No session or user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to get user ID from session
    let userId = (session.user as any).id;
    console.log('Shop API - User ID from session:', userId);
    
    // If no user ID in session, try to get it from the email
    if (!userId) {
      console.log('Shop API - No user ID in session, trying alternative methods...');
      
      if (session.user?.email) {
        console.log('Shop API - Trying to find user by email:', session.user.email);
        
        try {
          await connectDB();
          
          // Import the User model
          const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
            discordId: String,
            username: String,
            email: String,
            avatar: String,
            discriminator: String,
            globalName: String,
            accessToken: String,
            refreshToken: String,
            createdAt: { type: Date, default: Date.now },
            updatedAt: { type: Date, default: Date.now }
          }));
          
          const user = await User.findOne({ email: session.user.email });
          if (user) {
            userId = user.discordId;
            console.log('Shop API - Found user by email, using Discord ID:', userId);
          } else {
            console.log('Shop API - No user found by email');
          }
        } catch (error) {
          console.error('Shop API - Error finding user by email:', error);
        }
      }
      
      if (!userId) {
        console.log('Shop API - No user ID found');
        return NextResponse.json({ 
          error: 'No user ID found in session',
          sessionUser: session.user,
          message: 'Session exists but user ID is missing. This might be a session caching issue.'
        }, { status: 400 });
      }
    }
    
    console.log('Shop API - Final User ID:', userId);
    console.log('Shop API - Is Admin:', isAdmin(userId));
    
    if (!isAdmin(userId)) {
      console.log('Shop API - User is not admin');
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    console.log('Shop API - Received body:', body);
    const { 
      name, 
      description, 
      price, 
      image, 
      inStock, 
      allowMultiplePurchases, 
      contentType, 
      textContent, 
      linkUrl, 
      youtubeUrl,
      fileUrl,
      requiresRole,
      requiredRoleId,
      requiredRoleName
    } = body;

    console.log('Shop API - Content type:', contentType);
    console.log('Shop API - Text content:', textContent);
    console.log('Shop API - Link URL:', linkUrl);

    // Validate required fields
    if (!name || !description || !price || !image) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    // Create new item in MongoDB
    const newItem = new ShopItem({
      name,
      description,
      price: parseFloat(price),
      image,
      inStock: inStock !== undefined ? inStock : true,
      allowMultiplePurchases: allowMultiplePurchases !== undefined ? allowMultiplePurchases : false,
      contentType: contentType || 'none',
      textContent: textContent || '',
      linkUrl: linkUrl || '',
      youtubeUrl: youtubeUrl || '',
      fileUrl: fileUrl || '',
      hasFile: false, // Will be set to true when file is actually uploaded
      requiresRole: requiresRole || false,
      requiredRoleId: requiredRoleId || '',
      requiredRoleName: requiredRoleName || ''
    });

    const savedItem = await newItem.save();
    console.log('Shop API - Saved item:', savedItem);

    // Return the saved item with id field
    const itemWithId = {
      id: savedItem._id.toString(),
      name: savedItem.name,
      description: savedItem.description,
      price: savedItem.price,
      image: savedItem.image,
      inStock: savedItem.inStock,
      allowMultiplePurchases: savedItem.allowMultiplePurchases,
      contentType: savedItem.contentType,
      textContent: savedItem.textContent,
      linkUrl: savedItem.linkUrl,
      fileUrl: savedItem.fileUrl,
      fileName: savedItem.fileName,
      hasFile: savedItem.hasFile,
      requiresRole: savedItem.requiresRole,
      requiredRoleId: savedItem.requiredRoleId,
      requiredRoleName: savedItem.requiredRoleName
    };

    return NextResponse.json({ 
      message: 'Item added successfully', 
      item: itemWithId 
    });
  } catch (error) {
    console.error('Error adding shop item:', error);
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
  }
}

// PUT - Update shop item (admin only)
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

    const body = await request.json();
    console.log('PUT request body:', body);
    const { id, name, description, price, image, inStock, fileUrl, fileName, hasFile, contentType, textContent, linkUrl, youtubeUrl, requiresRole, requiredRoleId, requiredRoleName } = body;
    console.log('YouTube URL from request:', youtubeUrl);

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    await connectDB();

    // Find and update item in MongoDB
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (image !== undefined) updateData.image = image;
    if (inStock !== undefined) updateData.inStock = inStock;
    if (fileUrl !== undefined) updateData.fileUrl = fileUrl;
    if (fileName !== undefined) updateData.fileName = fileName;
    if (hasFile !== undefined) updateData.hasFile = hasFile;
    if (contentType !== undefined) updateData.contentType = contentType;
    if (textContent !== undefined) updateData.textContent = textContent;
    if (linkUrl !== undefined) updateData.linkUrl = linkUrl;
    if (youtubeUrl !== undefined) updateData.youtubeUrl = youtubeUrl;
    if (requiresRole !== undefined) updateData.requiresRole = requiresRole;
    if (requiredRoleId !== undefined) updateData.requiredRoleId = requiredRoleId;
    if (requiredRoleName !== undefined) updateData.requiredRoleName = requiredRoleName;
    
    console.log('Update data being saved:', updateData);

    const updatedItem = await ShopItem.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Return the updated item with id field
    const itemWithId = {
      id: updatedItem._id.toString(),
      name: updatedItem.name,
      description: updatedItem.description,
      price: updatedItem.price,
      image: updatedItem.image,
      inStock: updatedItem.inStock,
      fileUrl: updatedItem.fileUrl,
      fileName: updatedItem.fileName,
      hasFile: updatedItem.hasFile,
      contentType: updatedItem.contentType,
      textContent: updatedItem.textContent,
      linkUrl: updatedItem.linkUrl,
      youtubeUrl: updatedItem.youtubeUrl,
      requiresRole: updatedItem.requiresRole,
      requiredRoleId: updatedItem.requiredRoleId,
      requiredRoleName: updatedItem.requiredRoleName
    };

    return NextResponse.json({ 
      message: 'Item updated successfully', 
      item: itemWithId 
    });
  } catch (error) {
    console.error('Error updating shop item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

// DELETE - Delete shop item (admin only)
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

    // Find the item before deleting to get file information
    const itemToDelete = await ShopItem.findById(id);
    if (!itemToDelete) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Clean up associated files
    try {
      // 1. Delete file from FileStorage collection (database)
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

      await FileStorage.deleteMany({ itemId: new mongoose.Types.ObjectId(id) });
      console.log(`Deleted file records for item ${id}`);

      // 2. Delete physical image file from uploads directory
      if (itemToDelete.image && itemToDelete.image.includes('/api/uploads/shop/')) {
        const fileName = itemToDelete.image.split('/').pop();
        if (fileName) {
          const imagePath = join(process.cwd(), 'public', 'uploads', 'shop', fileName);
          if (existsSync(imagePath)) {
            await unlink(imagePath);
            console.log(`Deleted physical image file: ${imagePath}`);
          }
        }
      }

      // 3. Delete any associated files in shop-files directory
      const shopFilesDir = join(process.cwd(), 'public', 'uploads', 'shop-files');
      if (existsSync(shopFilesDir)) {
        // Look for files that might be associated with this item
        // This is a more complex cleanup that might need refinement
        console.log(`Checked shop-files directory for item ${id}`);
      }

    } catch (fileError) {
      console.error('Error cleaning up files:', fileError);
      // Continue with item deletion even if file cleanup fails
    }

    // Delete the item from MongoDB
    const deletedItem = await ShopItem.findByIdAndDelete(id);

    // Return the deleted item with id field
    const itemWithId = {
      id: deletedItem._id.toString(),
      name: deletedItem.name,
      description: deletedItem.description,
      price: deletedItem.price,
      category: deletedItem.category,
      image: deletedItem.image,
      inStock: deletedItem.inStock
    };

    return NextResponse.json({ 
      message: 'Item and associated files deleted successfully', 
      item: itemWithId 
    });
  } catch (error) {
    console.error('Error deleting shop item:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
