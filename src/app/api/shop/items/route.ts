import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

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

// Check if user is admin
const isAdmin = (userId: string) => {
  const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917'];
  return ADMIN_USER_IDS.includes(userId);
};

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
      inStock: item.inStock
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
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, price, category, image, inStock } = body;

    // Validate required fields
    if (!name || !description || !price || !category || !image) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    // Create new item in MongoDB
    const newItem = new ShopItem({
      name,
      description,
      price: parseFloat(price),
      category,
      image,
      inStock: inStock !== undefined ? inStock : true
    });

    const savedItem = await newItem.save();

    // Return the saved item with id field
    const itemWithId = {
      id: savedItem._id.toString(),
      name: savedItem.name,
      description: savedItem.description,
      price: savedItem.price,
      category: savedItem.category,
      image: savedItem.image,
      inStock: savedItem.inStock
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
    const { id, name, description, price, category, image, inStock } = body;

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    await connectDB();

    // Find and update item in MongoDB
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (price) updateData.price = parseFloat(price);
    if (category) updateData.category = category;
    if (image) updateData.image = image;
    if (inStock !== undefined) updateData.inStock = inStock;

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
      category: updatedItem.category,
      image: updatedItem.image,
      inStock: updatedItem.inStock
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

    // Find and delete item from MongoDB
    const deletedItem = await ShopItem.findByIdAndDelete(id);

    if (!deletedItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

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
      message: 'Item deleted successfully', 
      item: itemWithId 
    });
  } catch (error) {
    console.error('Error deleting shop item:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
