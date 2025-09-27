import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import PurchaseHistory from '@/models/PurchaseHistory';
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { itemId, currency } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });
    }

    // Get item from database
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
      youtubeUrl: String,
      fileUrl: String,
      fileName: String,
      hasFile: Boolean,
      requiresRole: Boolean,
      requiredRoleId: String,
      requiredRoleName: String,
      allowMultiplePurchases: Boolean,
      purchaseCount: Number,
      totalRevenue: Number,
      createdAt: Date,
      updatedAt: Date
    }));

    const item = await ShopItem.findById(itemId);
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (!item.inStock) {
      return NextResponse.json({ error: 'Item is out of stock' }, { status: 400 });
    }

    // Create purchase record using PurchaseHistory model

    const purchase = new PurchaseHistory({
      userId: (session.user as any).id,
      username: session.user.name || 'Unknown',
      itemId: item._id,
      itemName: item.name,
      price: item.price,
      hasFile: item.hasFile || false,
      fileUrl: item.fileUrl || '',
      fileName: item.fileName || '',
      contentType: item.contentType || 'none',
      textContent: item.textContent || '',
      linkUrl: item.linkUrl || '',
      youtubeUrl: item.youtubeUrl || ''
    });

    await purchase.save();

    // Update item analytics
    item.purchaseCount = (item.purchaseCount || 0) + 1;
    item.totalRevenue = (item.totalRevenue || 0) + item.price;
    await item.save();

    // Deduct from user's currency balance
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }
    const userId = (session.user as any).id;

    if (currency === 'hamstercoin') {
      // Update HamsterCoin balance in currencies collection
      const currencies = db.collection('currencies');
      await currencies.updateOne(
        { userId },
        {
          $inc: {
            hamsterCoins: -item.price,
            totalSpent: item.price
          },
          $set: { updatedAt: new Date() }
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase successful',
      purchase: {
        id: purchase._id.toString(),
        itemName: purchase.itemName,
        price: purchase.price,
        purchaseDate: purchase.purchaseDate
      }
    });
  } catch (error) {
    console.error('Purchase error:', error);
    return NextResponse.json({ error: 'Failed to process purchase' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const userId = (session.user as any).id;

    // Get user's purchase history

    const purchases = await PurchaseHistory.find({ userId })
      .sort({ purchaseDate: -1 })
      .lean();

    console.log(`Found ${purchases.length} purchases for user ${userId}`);

    // Update existing purchases that have content but missing contentType
    for (const purchase of purchases) {
      let needsUpdate = false;
      let newContentType = purchase.contentType || 'none';

      if (!purchase.contentType || purchase.contentType === 'none') {
        if (purchase.textContent && purchase.textContent.trim()) {
          newContentType = 'text';
          needsUpdate = true;
        } else if (purchase.linkUrl && purchase.linkUrl.trim()) {
          newContentType = 'link';
          needsUpdate = true;
        } else if (purchase.youtubeUrl && purchase.youtubeUrl.trim()) {
          newContentType = 'youtube';
          needsUpdate = true;
        } else if (purchase.hasFile && purchase.fileUrl) {
          newContentType = 'file';
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        console.log(`Updating purchase ${purchase._id}: contentType from '${purchase.contentType}' to '${newContentType}'`);
        await PurchaseHistory.updateOne(
          { _id: purchase._id },
          { $set: { contentType: newContentType } }
        );
        purchase.contentType = newContentType; // Update in memory
      }
    }

    const formattedPurchases = purchases.map((purchase: any) => {
      const formatted = {
        id: purchase._id.toString(),
        itemName: purchase.itemName,
        price: purchase.price,
        purchaseDate: purchase.purchaseDate.toISOString(),
        status: 'completed',
        downloadCount: purchase.downloadCount || 0,
        hasFile: purchase.hasFile || false,
        fileName: purchase.fileName,
        contentType: purchase.contentType || 'none',
        textContent: purchase.textContent,
        linkUrl: purchase.linkUrl,
        youtubeUrl: purchase.youtubeUrl,
        fileUrl: purchase.fileUrl
      };

      // Debug logging for content
      if (purchase.contentType && purchase.contentType !== 'none') {
        console.log(`Purchase ${purchase._id}: contentType=${purchase.contentType}, hasContent=${!!(purchase.textContent || purchase.linkUrl || purchase.youtubeUrl || purchase.hasFile)}`);
      }

      return formatted;
    });

    return NextResponse.json({
      success: true,
      purchases: formattedPurchases
    });

  } catch (error) {
    console.error('Error fetching purchase history:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase history' }, { status: 500 });
  }
}

