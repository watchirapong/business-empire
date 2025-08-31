import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import { hasDiscordRole } from '@/lib/admin-config';

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

// Purchase History Schema
const purchaseHistorySchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  itemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ShopItem',
    required: true,
    index: true
  },
  itemName: {
    type: String,
    required: true
  },
  price: { 
    type: Number, 
    required: true 
  },
  purchaseDate: { 
    type: Date, 
    default: Date.now 
  },
  downloadCount: { 
    type: Number, 
    default: 0 
  },
  lastDownloadDate: { 
    type: Date 
  },
  hasFile: {
    type: Boolean,
    default: false
  },
  fileUrl: {
    type: String
  },
  fileName: {
    type: String
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
  }
});

const ShopItem = mongoose.models.ShopItem || mongoose.model('ShopItem', shopItemSchema);
const PurchaseHistory = mongoose.models.PurchaseHistory || mongoose.model('PurchaseHistory', purchaseHistorySchema);

// POST - Purchase an item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { itemId } = await request.json();
    const userId = (session.user as any).id;
    const username = (session.user as any).name || 'Unknown User';

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    // Get the item
    const item = await ShopItem.findById(itemId);
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (!item.inStock) {
      return NextResponse.json({ error: 'Item is out of stock' }, { status: 400 });
    }

    // Check role restrictions
    if (item.requiresRole && item.requiredRoleId) {
      console.log(`Checking role requirement for item: ${item.name}`);
      console.log(`Required role ID: ${item.requiredRoleId}`);
      
      const hasRequiredRole = await hasDiscordRole(userId, item.requiredRoleId);
      if (!hasRequiredRole) {
        return NextResponse.json({ 
          error: `This item requires the role: ${item.requiredRoleName || item.requiredRoleId}`,
          requiredRole: item.requiredRoleName || item.requiredRoleId
        }, { status: 403 });
      }
      console.log(`User ${userId} has required role for item ${item.name}`);
    }

    // Check if user already purchased this item (only if multiple purchases are not allowed)
    const existingPurchase = await PurchaseHistory.findOne({ userId, itemId });
    if (existingPurchase && !item.allowMultiplePurchases) {
      return NextResponse.json({ 
        error: 'You have already purchased this item',
        purchase: existingPurchase
      }, { status: 400 });
    }

    // Create purchase record
    const purchase = new PurchaseHistory({
      userId,
      username,
      itemId,
      itemName: item.name,
      price: item.price,
      hasFile: item.hasFile,
      fileUrl: item.fileUrl,
      fileName: item.fileName,
      contentType: item.contentType || 'none',
      textContent: item.textContent || '',
      linkUrl: item.linkUrl || ''
    });

    await purchase.save();

    // Also update any existing purchases for this item to include content
    await PurchaseHistory.updateMany(
      { itemId: item._id },
      { 
        $set: {
          contentType: item.contentType || 'none',
          textContent: item.textContent || '',
          linkUrl: item.linkUrl || ''
        }
      }
    );

    return NextResponse.json({ 
      success: true,
      purchase,
      message: 'Item purchased successfully'
    });

  } catch (error) {
    console.error('Error purchasing item:', error);
    return NextResponse.json({ error: 'Failed to purchase item' }, { status: 500 });
  }
}

// GET - Get user's purchase history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const userId = (session.user as any).id;
    const purchases = await PurchaseHistory.find({ userId }).sort({ purchaseDate: -1 });

    return NextResponse.json({ purchases });

  } catch (error) {
    console.error('Error fetching purchase history:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase history' }, { status: 500 });
  }
}
