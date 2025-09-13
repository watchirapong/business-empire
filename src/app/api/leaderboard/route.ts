import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';

// Simple in-memory cache
let leaderboardCache: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30000; // 30 seconds

// Currency schema
const currencySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  hamsterCoins: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add indexes for better performance
currencySchema.index({ totalEarned: -1 }); // For leaderboard sorting

// User schema for getting usernames and avatars
const userSchema = new mongoose.Schema({
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

// Add indexes for better performance
userSchema.index({ discordId: 1 }); // For user lookups

// Username history schema for getting current nicknames
const usernameHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  usernameHistory: [{
    username: { type: String, required: true },
    globalName: { type: String },
    discriminator: { type: String },
    nickname: { type: String },
    changedAt: { type: Date, default: Date.now }
  }],
  currentUsername: { type: String, required: true },
  currentGlobalName: { type: String },
  currentDiscriminator: { type: String },
  currentNickname: { type: String },
  lastUpdated: { type: Date, default: Date.now }
});

// Add indexes for better performance
usernameHistorySchema.index({ userId: 1 }); // For user lookups

const Currency = mongoose.models.Currency || mongoose.model('Currency', currencySchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);
const UsernameHistory = mongoose.models.UsernameHistory || mongoose.model('UsernameHistory', usernameHistorySchema);

export async function GET() {
  try {
    // Check cache first
    const now = Date.now();
    if (leaderboardCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json(leaderboardCache);
    }

    await connectDB();

    // Get all currency records sorted by totalEarned in descending order
    const currencyData = await Currency.find({})
      .sort({ totalEarned: -1 })
      .limit(100); // Limit to top 100 for performance

    // Get user details for all userIds
    const userIds = currencyData.map(currency => currency.userId);
    const users = await User.find({ discordId: { $in: userIds } });
    const usernameHistories = await UsernameHistory.find({ userId: { $in: userIds } });

    // Create maps for quick lookup
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user.discordId, user);
    });

    const nicknameMap = new Map();
    usernameHistories.forEach(history => {
      nicknameMap.set(history.userId, history.currentNickname);
    });

    // Combine currency data with user data and add ranks
    const leaderboard = currencyData.map((currency, index) => {
      const user = userMap.get(currency.userId);
      const currentNickname = nicknameMap.get(currency.userId);
      
      // Priority: currentNickname > username > globalName > fallback
      const displayName = currentNickname || user?.username || user?.globalName || `User${currency.userId.slice(-4)}`;
      
      return {
        userId: currency.userId,
        username: displayName,
        avatar: user?.avatar ? `https://cdn.discordapp.com/avatars/${currency.userId}/${user.avatar}.png` : null,
        totalEarned: currency.totalEarned,
        rank: index + 1
      };
    });

    const response = {
      success: true,
      leaderboard
    };

    // Cache the response
    leaderboardCache = response;
    cacheTimestamp = now;

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch leaderboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
