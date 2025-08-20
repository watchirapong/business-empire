import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connections[0].readyState) {
    console.log('MongoDB already connected');
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('MongoDB connected successfully');
};

// Currency Schema
const CurrencySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  hamsterCoins: { type: Number, default: 1000 },
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Currency = mongoose.models.Currency || mongoose.model('Currency', CurrencySchema);

// User Schema for email lookup
const UserSchema = new mongoose.Schema({
  discordId: String,
  username: String,
  email: String,
  avatar: String,
  discriminator: String,
  globalName: String,
  accessToken: String,
  refreshToken: String,
  lastLogin: Date,
  loginCount: Number,
  isActive: Boolean,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018'];

    if (!session) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Try to get user ID from session
    let userId = (session.user as any)?.id;
    
    // If no user ID in session, try to get it from email
    if (!userId && session.user?.email) {
      try {
        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (user) {
          userId = user.discordId;
        }
      } catch (error) {
        console.error('Error finding user by email:', error);
      }
    }

    if (!ADMIN_USER_IDS.includes(userId)) {
      return NextResponse.json({ error: 'Unauthorized - Not admin' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');

    if (!userIdParam) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get or create currency for user
    let currency = await Currency.findOne({ userId: userIdParam });
    
    if (!currency) {
      currency = new Currency({
        userId: userIdParam,
        hamsterCoins: 1000,
        totalEarned: 1000
      });
      await currency.save();
    }

    return NextResponse.json({
      success: true,
      currency: {
        _id: currency._id,
        userId: currency.userId,
        hamsterCoins: currency.hamsterCoins,
        totalEarned: currency.totalEarned,
        totalSpent: currency.totalSpent,
        createdAt: currency.createdAt,
        updatedAt: currency.updatedAt
      }
    });

  } catch (error) {
    console.error('Get user currency error:', error);
    return NextResponse.json(
      { error: 'Failed to get user currency' },
      { status: 500 }
    );
  }
}
