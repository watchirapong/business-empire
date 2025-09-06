import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hamsterhub');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// StardustCoin Schema
const StardustCoinSchema = new mongoose.Schema({
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

const StardustCoin = mongoose.models.StardustCoin || mongoose.model('StardustCoin', StardustCoinSchema);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const userId = session.user.id;
    const username = session.user.name || 'Unknown';
    const globalName = (session.user as any).globalName || '';

    // Get or create StardustCoin account
    let account = await StardustCoin.findOne({ userId });
    
    if (!account) {
      account = new StardustCoin({
        userId,
        username,
        globalName,
        balance: 0
      });
      await account.save();
    } else {
      // Update username and globalName if they've changed
      if (account.username !== username || account.globalName !== globalName) {
        account.username = username;
        account.globalName = globalName;
        account.lastUpdated = new Date();
        await account.save();
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        balance: account.balance,
        totalEarned: account.totalEarned,
        totalSpent: account.totalSpent,
        lastUpdated: account.lastUpdated
      }
    });

  } catch (error) {
    console.error('Get StardustCoin balance error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get StardustCoin balance' 
    }, { status: 500 });
  }
}
