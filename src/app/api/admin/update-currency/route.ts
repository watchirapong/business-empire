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

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { userId: targetUserId, hamsterCoins, operation = 'set' } = body; // operation: 'add', 'set', or 'decrease'

    if (!targetUserId || typeof hamsterCoins !== 'number') {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Update or create currency for user
    let currency = await Currency.findOne({ userId: targetUserId });
    
    if (!currency) {
      // For new users, set totalEarned based on operation
      const totalEarnedValue = operation === 'add' ? hamsterCoins : 0;
      currency = new Currency({
        userId: targetUserId,
        hamsterCoins,
        totalEarned: totalEarnedValue
      });
    } else {
      if (operation === 'add') {
        // Add operation: increase balance and add to totalEarned
        currency.hamsterCoins += hamsterCoins;
        currency.totalEarned += hamsterCoins;
      } else if (operation === 'set') {
        // Set operation: set exact balance, don't modify totalEarned
        currency.hamsterCoins = hamsterCoins;
        // totalEarned remains unchanged
      } else if (operation === 'decrease') {
        // Decrease operation: reduce balance (minimum 0), don't modify totalEarned
        currency.hamsterCoins = Math.max(0, currency.hamsterCoins - hamsterCoins);
        // totalEarned remains unchanged
      } else {
        // Default to set operation
        currency.hamsterCoins = hamsterCoins;
        // totalEarned remains unchanged
      }

      currency.updatedAt = new Date();
    }
    
    await currency.save();

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
    console.error('Update currency error:', error);
    return NextResponse.json(
      { error: 'Failed to update currency' },
      { status: 500 }
    );
  }
}
