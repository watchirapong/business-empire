import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connections[0].readyState) {
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI!);
};

// Currency Schema
const CurrencySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  hamsterCoins: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Currency = mongoose.models.Currency || mongoose.model('Currency', CurrencySchema);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { amount, description = 'Earned coins' } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find or create currency record
    let currency = await Currency.findOne({ userId });
    
    if (!currency) {
      currency = new Currency({
        userId,
        hamsterCoins: 0,
        totalEarned: 0,
        totalSpent: 0
      });
    }

    // Add coins
    currency.hamsterCoins += amount;
    currency.totalEarned += amount;
    currency.updatedAt = new Date();
    
    await currency.save();

    return NextResponse.json({
      success: true,
      message: `Added ${amount} coins to your balance`,
      data: {
        balance: currency.hamsterCoins,
        totalEarned: currency.totalEarned,
        amountAdded: amount
      }
    });

  } catch (error) {
    console.error('Currency add API error:', error);
    return NextResponse.json(
      { error: 'Failed to add coins' },
      { status: 500 }
    );
  }
}
