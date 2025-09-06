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

    // Create purchase record using existing PurchaseHistory model
    const PurchaseHistory = mongoose.models.PurchaseHistory || mongoose.model('PurchaseHistory', new mongoose.Schema({
      userId: String,
      username: String,
      itemId: mongoose.Schema.Types.ObjectId,
      itemName: String,
      price: Number,
      purchaseDate: { type: Date, default: Date.now },
      downloadCount: { type: Number, default: 0 },
      lastDownloadDate: Date,
      hasFile: { type: Boolean, default: false },
      fileUrl: String,
      fileName: String
    }));

    const purchase = new PurchaseHistory({
      userId: (session.user as any).id,
      username: session.user.name || 'Unknown',
      itemId: item._id,
      itemName: item.name,
      price: item.price,
      hasFile: item.hasFile || false,
      fileUrl: item.fileUrl || '',
      fileName: item.fileName || ''
    });

    await purchase.save();

    // Update item analytics
    item.purchaseCount = (item.purchaseCount || 0) + 1;
    item.totalRevenue = (item.totalRevenue || 0) + item.price;
    await item.save();

    // Deduct from user's currency balance
    const db = mongoose.connection.db;
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
    } else if (currency === 'stardustcoin') {
      // Update StardustCoin balance in stardustcoins collection
      const stardustCoins = db.collection('stardustcoins');
      await stardustCoins.updateOne(
        { userId },
        {
          $inc: {
            balance: -item.price,
            totalSpent: item.price
          },
          $set: { lastUpdated: new Date(), updatedAt: new Date() }
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

    // Return user's purchase history
    const PurchaseHistory = mongoose.models.PurchaseHistory || mongoose.model('PurchaseHistory');
    const userId = (session.user as any).id;
    const userPurchases = await PurchaseHistory.find({ userId }).sort({ purchaseDate: -1 });

    const purchases = userPurchases.map(purchase => ({
      id: purchase._id.toString(),
      itemName: purchase.itemName,
      price: purchase.price,
      purchaseDate: purchase.purchaseDate.toISOString(),
      downloadCount: purchase.downloadCount || 0,
      hasFile: purchase.hasFile || false,
      fileName: purchase.fileName || '',
      status: 'completed'
    }));

    return NextResponse.json({ purchases });
  } catch (error) {
    console.error('Error fetching purchase history:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase history' }, { status: 500 });
  }
}
