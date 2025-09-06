import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import { hasDiscordRole } from '@/lib/admin-config';

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

// Currency schema
const currencySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  hamsterCoins: { type: Number, default: 1000 },
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Purchase history schema
const purchaseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  items: [{
    itemId: String,
    name: String,
    price: Number,
    quantity: Number
  }],
  totalAmount: { type: Number, required: true },
  purchaseDate: { type: Date, default: Date.now },
  status: { type: String, default: 'completed' }
});

// Purchase History Schema (for individual item purchases)
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
  currency: {
    type: String,
    default: 'hamstercoin',
    enum: ['hamstercoin', 'stardustcoin']
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

// StardustCoin Schema
const stardustCoinSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true },
  globalName: { type: String, default: '' },
  balance: { type: Number, default: 0, min: 0 },
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Currency = mongoose.models.Currency || mongoose.model('Currency', currencySchema);
const StardustCoin = mongoose.models.StardustCoin || mongoose.model('StardustCoin', stardustCoinSchema);
const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);
const PurchaseHistory = mongoose.models.PurchaseHistory || mongoose.model('PurchaseHistory', purchaseHistorySchema);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const username = (session.user as any).name || 'Unknown User';
    const body = await request.json();
    const { items, totalAmount, currency = 'hamstercoin' } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 });
    }

    await connectDB();

    // Handle currency deduction based on selected currency
    if (currency === 'stardustcoin') {
      // Handle StardustCoin payment
      let stardustAccount = await StardustCoin.findOne({ userId });
      
      if (!stardustAccount) {
        // Create new StardustCoin account if it doesn't exist
        stardustAccount = new StardustCoin({
          userId,
          username,
          globalName: (session.user as any).globalName || '',
          balance: 0
        });
      }

      // Check if user has enough StardustCoin
      if (stardustAccount.balance < totalAmount) {
        return NextResponse.json({ 
          error: 'Insufficient StardustCoin',
          currentBalance: stardustAccount.balance,
          requiredAmount: totalAmount
        }, { status: 400 });
      }

      // Deduct StardustCoin from user's balance
      stardustAccount.balance -= totalAmount;
      stardustAccount.totalSpent += totalAmount;
      stardustAccount.lastUpdated = new Date();
      await stardustAccount.save();

      console.log(`Deducted ${totalAmount} StardustCoin from user ${userId} for checkout`);
    } else {
      // Handle HamsterCoin payment (default)
      let userCurrency = await Currency.findOne({ userId });
      
      if (!userCurrency) {
        // Create new currency account if it doesn't exist
        userCurrency = new Currency({
          userId,
          hamsterCoins: 1000, // Starting balance
          totalEarned: 1000,
          totalSpent: 0
        });
      }

      // Check if user has enough coins
      if (userCurrency.hamsterCoins < totalAmount) {
        return NextResponse.json({ 
          error: 'Insufficient Hamster Coins',
          currentBalance: userCurrency.hamsterCoins,
          requiredAmount: totalAmount
        }, { status: 400 });
      }

      // Deduct coins from user's balance
      userCurrency.hamsterCoins -= totalAmount;
      userCurrency.totalSpent += totalAmount;
      userCurrency.updatedAt = new Date();
      await userCurrency.save();

      console.log(`Deducted ${totalAmount} HamsterCoin from user ${userId} for checkout`);
    }

    // Create purchase record
    const purchase = new Purchase({
      userId,
      items: items.map((item: any) => ({
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1
      })),
      totalAmount,
      purchaseDate: new Date()
    });
    await purchase.save();

    // Fetch complete item details from database for each item
    // Use the same schema definition as the items API
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

    const ShopItem = mongoose.models.ShopItem || mongoose.model('ShopItem', shopItemSchema);

    // Check role requirements for all items before processing
    for (const item of items) {
      console.log('Checkout API - Checking role requirements for item:', item.id);
      const fullItem = await ShopItem.findById(item.id);
      console.log('Checkout API - Full item data:', JSON.stringify(fullItem, null, 2));
      
      if (fullItem && fullItem.requiresRole && fullItem.requiredRoleId) {
        console.log(`Checkout API - Item ${fullItem.name} requires role: ${fullItem.requiredRoleId}`);
        console.log(`Checkout API - User ID: ${userId}`);
        
        const hasRequiredRole = await hasDiscordRole(userId, fullItem.requiredRoleId);
        console.log(`Checkout API - Has required role result: ${hasRequiredRole}`);
        
        if (!hasRequiredRole) {
          console.log(`Checkout API - Access denied for user ${userId} on item ${fullItem.name}`);
          return NextResponse.json({ 
            error: `Item "${fullItem.name}" requires the role: ${fullItem.requiredRoleName || fullItem.requiredRoleId}`,
            requiredRole: fullItem.requiredRoleName || fullItem.requiredRoleId,
            itemName: fullItem.name
          }, { status: 403 });
        }
        console.log(`Checkout API - User ${userId} has required role for item ${fullItem.name}`);
      } else {
        console.log(`Checkout API - Item ${fullItem?.name} does not require role or role data missing`);
        console.log(`Checkout API - requiresRole: ${fullItem?.requiresRole}, requiredRoleId: ${fullItem?.requiredRoleId}`);
      }
    }

    // Get complete item details from database and create purchase history records
    const itemDetails = await Promise.all(
      items.map(async (item: any) => {
        console.log('Checkout API - Looking for item with ID:', item.id);
        const fullItem = await ShopItem.findById(item.id);
        console.log('Checkout API - Found item:', JSON.stringify(fullItem, null, 2));
        console.log('Checkout API - Item contentType:', fullItem?.contentType);
        console.log('Checkout API - Item textContent:', fullItem?.textContent);
        console.log('Checkout API - Item keys:', Object.keys(fullItem || {}));
        
        // Create purchase history record for this item
        let purchaseHistoryId = null;
        if (fullItem) {
          const purchaseHistory = new PurchaseHistory({
            userId,
            username,
            itemId: fullItem._id,
            itemName: fullItem.name,
            price: fullItem.price,
            currency: currency,
            hasFile: fullItem.hasFile || false,
            fileUrl: fullItem.fileUrl || '',
            fileName: fullItem.fileName || '',
            contentType: fullItem.contentType || 'none',
            textContent: fullItem.textContent || '',
            linkUrl: fullItem.linkUrl || ''
          });
          await purchaseHistory.save();
          purchaseHistoryId = purchaseHistory._id.toString();
          console.log(`Created purchase history record for item: ${fullItem.name} with ID: ${purchaseHistoryId}`);
        }
        
        return {
          purchaseId: purchaseHistoryId, // Add purchase history ID for downloads
          itemId: item.id,
          itemName: item.name,
          image: item.image,
          contentType: fullItem?.contentType || 'none',
          textContent: fullItem?.textContent || '',
          linkUrl: fullItem?.linkUrl || '',
          fileUrl: fullItem?.fileUrl || '',
          hasFile: fullItem?.hasFile || false,
          fileName: fullItem?.fileName || ''
        };
      })
    );

    // Return detailed purchase information for the modal
    const purchases = itemDetails;

    // Get the appropriate balance based on currency used
    let newBalance = 0;
    if (currency === 'stardustcoin') {
      const stardustAccount = await StardustCoin.findOne({ userId });
      newBalance = stardustAccount?.balance || 0;
    } else {
      const hamsterAccount = await Currency.findOne({ userId });
      newBalance = hamsterAccount?.hamsterCoins || 0;
    }

    return NextResponse.json({ 
      success: true,
      message: 'Purchase completed successfully',
      newBalance: newBalance,
      currency: currency,
      purchaseId: purchase._id,
      purchases: purchases
    });

  } catch (error) {
    console.error('Error processing checkout:', error);
    return NextResponse.json({ error: 'Failed to process checkout' }, { status: 500 });
  }
}
