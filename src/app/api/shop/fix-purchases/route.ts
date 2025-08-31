import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

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

// POST - Fix existing purchases by updating them with content from their items
export async function POST(request: NextRequest) {
  try {
    console.log('Fix purchases API called');
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      console.log('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const userId = (session.user as any).id;
    console.log('User ID:', userId);

    // Get all purchases for this user
    const purchases = await PurchaseHistory.find({ userId });
    console.log(`Found ${purchases.length} purchases for user ${userId}`);

    let updatedCount = 0;

    // Update each purchase with content from its item
    for (const purchase of purchases) {
      try {
        // Get the original item
        const item = await ShopItem.findById(purchase.itemId);
        if (item) {
          // Update the purchase with content from the item
          await PurchaseHistory.updateOne(
            { _id: purchase._id },
            {
              $set: {
                contentType: item.contentType || 'none',
                textContent: item.textContent || '',
                linkUrl: item.linkUrl || ''
              }
            }
          );
          updatedCount++;
          console.log(`Updated purchase ${purchase._id} for item ${item.name}`);
        }
      } catch (error) {
        console.error(`Error updating purchase ${purchase._id}:`, error);
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Updated ${updatedCount} purchases with content`,
      totalPurchases: purchases.length,
      updatedPurchases: updatedCount
    });

  } catch (error) {
    console.error('Error fixing purchases:', error);
    return NextResponse.json({ error: 'Failed to fix purchases' }, { status: 500 });
  }
}
