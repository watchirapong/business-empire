import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const mongoose = await import('mongoose');
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

    const userId = (session.user as any).id;

    // Try to use enhanced user model first, fallback to legacy system
    let EnhancedUser;
    let Currency;
    let PurchaseHistory;
    
    try {
      // Try to get enhanced user model
      EnhancedUser = mongoose.model('EnhancedUser');
      console.log('Using Enhanced User model for shop purchase');
    } catch (error) {
      // Fallback to legacy models
      // const { default: Currency } = await import('../../../../models/Currency.js');
      // const { default: PurchaseHistory } = await import('../../../../models/PurchaseHistory.js');
      console.log('Using legacy models for shop purchase');
    }

    let purchase: any;

    if (EnhancedUser) {
      // Use enhanced user model
      const user = await EnhancedUser.findOne({ discordId: userId });
      
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Check if user has enough hamstercoins
      if (user.currency.hamsterCoins < item.price) {
        return NextResponse.json({ 
          error: `Insufficient hamstercoins! You need ${item.price} but only have ${user.currency.hamsterCoins}.` 
        }, { status: 400 });
      }

      // Deduct hamstercoins
      user.currency.hamsterCoins -= item.price;
      user.currency.totalSpent += item.price;
      user.updatedAt = new Date();
      await user.save();

      // Create purchase record
      const PurchaseHistory = mongoose.models.PurchaseHistory || mongoose.model('PurchaseHistory', new mongoose.Schema({
        userId: String,
        username: String,
        itemId: mongoose.Schema.Types.ObjectId,
        itemName: String,
        price: Number,
        hasFile: Boolean,
        fileUrl: String,
        fileName: String,
        contentType: String,
        textContent: String,
        linkUrl: String,
        youtubeUrl: String,
        purchaseDate: { type: Date, default: Date.now }
      }));

      purchase = new PurchaseHistory({
        userId: userId,
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

    } else {
      // Legacy system
      // const currency = await Currency.findOne({ userId });
      // if (!currency) {
      //   return NextResponse.json({ error: 'Currency account not found' }, { status: 404 });
      // }

      // if (currency.hamsterCoins < item.price) {
      //   return NextResponse.json({ 
      //     error: `Insufficient hamstercoins! You need ${item.price} but only have ${currency.hamsterCoins}.` 
      //   }, { status: 400 });
      // }

      // // Deduct hamstercoins
      // currency.hamsterCoins -= item.price;
      // currency.totalSpent += item.price;
      // currency.updatedAt = new Date();
      // await currency.save();
      
      // Legacy system disabled - no currency validation
      return NextResponse.json({ 
        error: 'Legacy currency system is temporarily disabled. Please use enhanced user system.' 
      }, { status: 503 });

      // Create purchase record
      purchase = new PurchaseHistory({
        userId: userId,
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
    }

    // Update item analytics
    item.purchaseCount = (item.purchaseCount || 0) + 1;
    item.totalRevenue = (item.totalRevenue || 0) + item.price;
    await item.save();

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
    
    const mongoose = await import('mongoose');
    const userId = (session.user as any).id;

    // Try to use enhanced user model first, fallback to legacy system
    let EnhancedUser;
    let PurchaseHistory;
    
    try {
      // Try to get enhanced user model
      EnhancedUser = mongoose.model('EnhancedUser');
      console.log('Using Enhanced User model for purchase history');
    } catch (error) {
      // Fallback to legacy model
      // const { default: PurchaseHistory } = await import('../../../../models/PurchaseHistory.js');
      console.log('Using legacy PurchaseHistory model');
    }

    let purchases = [];

    if (EnhancedUser) {
      // Use enhanced user model
      const user = await EnhancedUser.findOne({ discordId: userId });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Get purchase history
      const PurchaseHistory = mongoose.models.PurchaseHistory || mongoose.model('PurchaseHistory', new mongoose.Schema({
        userId: String,
        username: String,
        itemId: mongoose.Schema.Types.ObjectId,
        itemName: String,
        price: Number,
        hasFile: Boolean,
        fileUrl: String,
        fileName: String,
        contentType: String,
        textContent: String,
        linkUrl: String,
        youtubeUrl: String,
        purchaseDate: { type: Date, default: Date.now }
      }));

      purchases = await PurchaseHistory.find({ userId })
        .sort({ purchaseDate: -1 })
        .limit(50);

    } else {
      // Legacy system
      // purchases = await PurchaseHistory.find({ userId })
      //   .sort({ purchaseDate: -1 })
      //   .limit(50);
      purchases = []; // Legacy system disabled
    }

    return NextResponse.json({
      success: true,
      purchases: purchases.map((purchase: any) => ({
        id: purchase._id.toString(),
        itemName: purchase.itemName,
        price: purchase.price,
        purchaseDate: purchase.purchaseDate,
        hasFile: purchase.hasFile,
        fileUrl: purchase.fileUrl,
        fileName: purchase.fileName,
        contentType: purchase.contentType,
        textContent: purchase.textContent,
        linkUrl: purchase.linkUrl,
        youtubeUrl: purchase.youtubeUrl
      }))
    });
  } catch (error) {
    console.error('Error fetching purchase history:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase history' }, { status: 500 });
  }
}