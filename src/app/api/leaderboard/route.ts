import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

export async function GET() {
  try {
    await connectDB();
    
    const mongoose = await import('mongoose');
    
    // Try to use enhanced user model first, fallback to legacy system
    let EnhancedUser;
    
    try {
      // Try to get enhanced user model
      EnhancedUser = mongoose.model('EnhancedUser');
      console.log('Using Enhanced User model for leaderboard');
    } catch (error) {
      console.log('Enhanced User model not found, using legacy system');
    }

    if (EnhancedUser) {
      // Use enhanced user model with embedded currency
      const enhancedUsers = await EnhancedUser.find({})
        .sort({ 'currency.totalEarned': -1 })
        .limit(100);

      // Also fetch nicknames from username history for better coverage
      const userIds = enhancedUsers.map((user: any) => user.discordId);
      let nicknameMap: {[key: string]: string} = {};
      
      try {
        const nicknameResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/users/nicknames`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds })
        });
        if (nicknameResponse.ok) {
          const nicknameData = await nicknameResponse.json();
          nicknameMap = nicknameData.nicknames || {};
        }
      } catch (error) {
        console.log('Failed to fetch nicknames from history:', error);
      }

      const leaderboard = enhancedUsers.map((user: any, index: number) => {
        // Priority: Username history nickname > Discord server nickname > globalName > username (same as admin system)
        const displayName = nicknameMap[user.discordId] ||
                           user.discordServerData?.nickname || 
                           user.globalName || 
                           user.username || 
                           `User${user.discordId.slice(-4)}`;

        return {
          userId: user.discordId,
          username: displayName, // This will be the nickname if available
          avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png` : null,
          totalEarned: user.currency?.totalEarned || 0,
          rank: index + 1,
          // Additional Discord data
          discordNickname: user.discordServerData?.nickname,
          globalName: user.globalName,
          roles: user.discordServerData?.roles || []
        };
      });

      return NextResponse.json({
        success: true,
        leaderboard,
        source: 'enhanced'
      });

    } else {
      // Legacy system - define schemas and models
      try {
        // Currency Schema
        const CurrencySchema = new mongoose.Schema({
          userId: { type: String, required: true, unique: true },
          hamsterCoins: { type: Number, default: 0 },
          totalEarned: { type: Number, default: 0 },
          totalSpent: { type: Number, default: 0 },
          createdAt: { type: Date, default: Date.now },
          updatedAt: { type: Date, default: Date.now }
        });

        // User Schema
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

        const Currency = mongoose.models.Currency || mongoose.model('Currency', CurrencySchema);
        const User = mongoose.models.User || mongoose.model('User', UserSchema);
        
        if (!Currency || !User) {
          return NextResponse.json({
            success: true,
            leaderboard: [],
            source: 'legacy',
            message: 'Models not available'
          });
        }
        
        const currencyData = await Currency.find({})
          .sort({ totalEarned: -1 })
          .limit(100);

        const userIds = currencyData.map((currency: any) => currency.userId);
        const users = await User.find({ discordId: { $in: userIds } });

        // Create user map for quick lookup
        const userMap = new Map();
        users.forEach((user: any) => {
          userMap.set(user.discordId, user);
        });

        const leaderboard = currencyData.map((currency: any, index: number) => {
          const user = userMap.get(currency.userId);
          
          return {
            userId: currency.userId,
            username: user?.globalName || user?.username || `User${currency.userId.slice(-4)}`,
            avatar: user?.avatar ? `https://cdn.discordapp.com/avatars/${currency.userId}/${user.avatar}.png` : null,
            totalEarned: currency.totalEarned,
            rank: index + 1,
            discordNickname: null,
            globalName: user?.globalName,
            roles: []
          };
        });

        return NextResponse.json({
          success: true,
          leaderboard,
          source: 'legacy'
        });
        
      } catch (legacyError) {
        console.error('Legacy system error:', legacyError);
        return NextResponse.json({
          success: true,
          leaderboard: [],
          source: 'legacy',
          message: 'Legacy system error'
        });
      }
    }

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