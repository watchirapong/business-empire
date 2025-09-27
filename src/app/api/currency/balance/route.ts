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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const userId = (session.user as any).id;
    const db = mongoose.connection.db;

    if (!db) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Get HamsterCoin balance from currencies collection
    const currencies = db.collection('currencies');
    const currencyData = await currencies.findOne({ userId });

    const balance = {
      hamstercoin: currencyData?.hamsterCoins || 0
    };

    return NextResponse.json({
      success: true,
      balance: balance
    });
  } catch (error) {
    console.error('Error fetching currency balance:', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}