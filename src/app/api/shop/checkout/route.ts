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

const Currency = mongoose.models.Currency || mongoose.model('Currency', currencySchema);
const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { items, totalAmount } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 });
    }

    await connectDB();

    // Get user's currency balance
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

    // Return detailed purchase information for the modal
    const purchases = items.map((item: any) => ({
      itemId: item.id,
      itemName: item.name,
      image: item.image,
      contentType: item.contentType || 'none',
      textContent: item.textContent || '',
      linkUrl: item.linkUrl || '',
      fileUrl: item.fileUrl || '',
      hasFile: item.hasFile || false,
      fileName: item.fileName || ''
    }));

    return NextResponse.json({ 
      success: true,
      message: 'Purchase completed successfully',
      newBalance: userCurrency.hamsterCoins,
      purchaseId: purchase._id,
      purchases: purchases
    });

  } catch (error) {
    console.error('Error processing checkout:', error);
    return NextResponse.json({ error: 'Failed to process checkout' }, { status: 500 });
  }
}
