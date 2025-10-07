import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin, isAdminWithDB } from '@/lib/admin-config';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

// Using imported connectDB from @/lib/mongodb

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

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // Check if user is admin
    const isUserAdmin = await isAdminWithDB(userId);
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
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
        hamsterCoins: 0,
        totalEarned: 0
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
