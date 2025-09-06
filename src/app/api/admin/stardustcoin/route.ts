import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';
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
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Unauthorized - Not admin' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'balance';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const accounts = await StardustCoin.find({})
      .sort(sort)
      .limit(limit);

    const totalAccounts = await StardustCoin.countDocuments();
    const totalStardustCoin = await StardustCoin.aggregate([
      { $group: { _id: null, total: { $sum: '$balance' } } }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        accounts,
        totalAccounts,
        totalStardustCoin: totalStardustCoin[0]?.total || 0
      }
    });

  } catch (error) {
    console.error('Get StardustCoin accounts error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get StardustCoin accounts' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Unauthorized - Not admin' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { targetUserId, amount, action, reason } = body;

    if (!targetUserId || !amount || !action) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: targetUserId, amount, action' 
      }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Amount must be positive' 
      }, { status: 400 });
    }

    // Get or create target user's account
    let account = await StardustCoin.findOne({ userId: targetUserId });
    
    if (!account) {
      account = new StardustCoin({
        userId: targetUserId,
        username: 'Unknown',
        globalName: '',
        balance: 0
      });
    }

    const adminUsername = session.user.name || 'Admin';

    if (action === 'add') {
      account.balance += amount;
      account.totalEarned += amount;
      account.lastUpdated = new Date();
      await account.save();
      
      console.log(`Admin ${adminUsername} added ${amount} StardustCoin to user ${targetUserId}. Reason: ${reason || 'Admin action'}`);
      
      return NextResponse.json({
        success: true,
        message: `Added ${amount} StardustCoin to user`,
        data: {
          newBalance: account.balance,
          totalEarned: account.totalEarned
        }
      });

    } else if (action === 'remove') {
      if (account.balance < amount) {
        return NextResponse.json({ 
          success: false, 
          error: 'Insufficient StardustCoin balance' 
        }, { status: 400 });
      }

      account.balance -= amount;
      account.totalSpent += amount;
      account.lastUpdated = new Date();
      await account.save();
      
      console.log(`Admin ${adminUsername} removed ${amount} StardustCoin from user ${targetUserId}. Reason: ${reason || 'Admin action'}`);
      
      return NextResponse.json({
        success: true,
        message: `Removed ${amount} StardustCoin from user`,
        data: {
          newBalance: account.balance,
          totalSpent: account.totalSpent
        }
      });

    } else if (action === 'set') {
      const oldBalance = account.balance;
      account.balance = amount;
      account.lastUpdated = new Date();
      await account.save();
      
      console.log(`Admin ${adminUsername} set StardustCoin balance to ${amount} for user ${targetUserId}. Previous: ${oldBalance}. Reason: ${reason || 'Admin action'}`);
      
      return NextResponse.json({
        success: true,
        message: `Set StardustCoin balance to ${amount}`,
        data: {
          newBalance: account.balance,
          previousBalance: oldBalance
        }
      });

    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid action. Use: add, remove, or set' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Admin StardustCoin operation error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to perform StardustCoin operation' 
    }, { status: 500 });
  }
}
