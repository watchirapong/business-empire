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

// Gacha Item Schema
const gachaItemSchema = new mongoose.Schema({
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
  image: { 
    type: String, 
    required: true,
    trim: true
  },
  rarity: { 
    type: String, 
    required: true,
    enum: ['common', 'rare', 'epic', 'legendary', 'mythic']
  },
  dropRate: { 
    type: Number, 
    required: true,
    min: 0,
    max: 100
  },
  isActive: { 
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

gachaItemSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const GachaItem = mongoose.models.GachaItem || mongoose.model('GachaItem', gachaItemSchema);

// Check if user is admin
const isAdmin = (userId: string) => {
  const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917', '315548736388333568'];
  return ADMIN_USER_IDS.includes(userId);
};

// GET - Get all gacha items (public for viewing, admin for management)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const adminView = searchParams.get('admin') === 'true';
    
    await connectDB();

    let items;
    if (adminView) {
      // Admin view - show all items including inactive ones
      if (!session?.user || !isAdmin((session.user as any).id)) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
      items = await GachaItem.find().sort({ rarity: 1, dropRate: -1 });
    } else {
      // Public view - show only active items
      items = await GachaItem.find({ isActive: true }).sort({ rarity: 1, dropRate: -1 });
    }

    const itemsWithId = items.map(item => ({
      id: item._id.toString(),
      name: item.name,
      description: item.description,
      image: item.image,
      rarity: item.rarity,
      dropRate: item.dropRate,
      isActive: item.isActive
    }));

    return NextResponse.json({ items: itemsWithId });
  } catch (error) {
    console.error('Error fetching gacha items:', error);
    return NextResponse.json({ error: 'Failed to fetch gacha items' }, { status: 500 });
  }
}

// POST - Add new gacha item (admin only)
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
    const { name, description, image, rarity, dropRate, isActive } = body;

    // Validate required fields
    if (!name || !description || !image || !rarity || dropRate === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate drop rate
    if (dropRate < 0 || dropRate > 100) {
      return NextResponse.json({ error: 'Drop rate must be between 0 and 100' }, { status: 400 });
    }

    await connectDB();

    // Create new gacha item
    const newItem = new GachaItem({
      name,
      description,
      image,
      rarity,
      dropRate,
      isActive: isActive !== undefined ? isActive : true
    });

    const savedItem = await newItem.save();

    const itemWithId = {
      id: savedItem._id.toString(),
      name: savedItem.name,
      description: savedItem.description,
      image: savedItem.image,
      rarity: savedItem.rarity,
      dropRate: savedItem.dropRate,
      isActive: savedItem.isActive
    };

    return NextResponse.json({ 
      message: 'Gacha item added successfully', 
      item: itemWithId 
    });
  } catch (error) {
    console.error('Error adding gacha item:', error);
    return NextResponse.json({ error: 'Failed to add gacha item' }, { status: 500 });
  }
}

// PUT - Update gacha item (admin only)
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
    const { id, name, description, image, rarity, dropRate, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    await connectDB();

    // Find and update item
    const updateData: any = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (image) updateData.image = image;
    if (rarity) updateData.rarity = rarity;
    if (dropRate !== undefined) {
      if (dropRate < 0 || dropRate > 100) {
        return NextResponse.json({ error: 'Drop rate must be between 0 and 100' }, { status: 400 });
      }
      updateData.dropRate = dropRate;
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedItem = await GachaItem.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      return NextResponse.json({ error: 'Gacha item not found' }, { status: 404 });
    }

    const itemWithId = {
      id: updatedItem._id.toString(),
      name: updatedItem.name,
      description: updatedItem.description,
      image: updatedItem.image,
      rarity: updatedItem.rarity,
      dropRate: updatedItem.dropRate,
      isActive: updatedItem.isActive
    };

    return NextResponse.json({ 
      message: 'Gacha item updated successfully', 
      item: itemWithId 
    });
  } catch (error) {
    console.error('Error updating gacha item:', error);
    return NextResponse.json({ error: 'Failed to update gacha item' }, { status: 500 });
  }
}

// DELETE - Delete gacha item (admin only)
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

    const deletedItem = await GachaItem.findByIdAndDelete(id);

    if (!deletedItem) {
      return NextResponse.json({ error: 'Gacha item not found' }, { status: 404 });
    }

    const itemWithId = {
      id: deletedItem._id.toString(),
      name: deletedItem.name,
      description: deletedItem.description,
      image: deletedItem.image,
      rarity: deletedItem.rarity,
      dropRate: deletedItem.dropRate,
      isActive: deletedItem.isActive
    };

    return NextResponse.json({ 
      message: 'Gacha item deleted successfully', 
      item: itemWithId 
    });
  } catch (error) {
    console.error('Error deleting gacha item:', error);
    return NextResponse.json({ error: 'Failed to delete gacha item' }, { status: 500 });
  }
}
