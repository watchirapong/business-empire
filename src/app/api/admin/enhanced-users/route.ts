import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin, isAdminWithDB } from '@/lib/admin-config';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
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
    
    // Try to get from enhanced users first, fallback to regular users
    const mongoose = await import('mongoose');
    let EnhancedUser;
    
    try {
      EnhancedUser = mongoose.model('EnhancedUser');
    } catch (error) {
      // EnhancedUser model doesn't exist yet, use regular User model
      const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
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
        stats: {
          programming: { type: Number, default: 1, min: 1, max: 100 },
          artist: { type: Number, default: 1, min: 1, max: 100 },
          creative: { type: Number, default: 1, min: 1, max: 100 },
          leadership: { type: Number, default: 1, min: 1, max: 100 },
          communication: { type: Number, default: 1, min: 1, max: 100 },
          selfLearning: { type: Number, default: 1, min: 1, max: 100 }
        }
      }, { timestamps: true }));
      
      const Currency = mongoose.models.Currency || mongoose.model('Currency', new mongoose.Schema({
        userId: { type: String, required: true, unique: true },
        hamsterCoins: { type: Number, default: 0 },
        totalEarned: { type: Number, default: 0 },
        totalSpent: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
      }));
      
      const users = await User.find({}).sort({ createdAt: -1 });
      const usersWithCurrency = await Promise.all(
        users.map(async (user: any) => {
          const currency = await Currency.findOne({ userId: user.discordId });
          return {
            _id: user._id,
            discordId: user.discordId,
            username: user.username,
            email: user.email,
            globalName: user.globalName,
            avatar: user.avatar,
            discriminator: user.discriminator,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastLogin: user.lastLogin,
            loginCount: user.loginCount,
            isActive: user.isActive,
            stats: user.stats,
            currency: currency ? {
              hamsterCoins: currency.hamsterCoins,
              totalEarned: currency.totalEarned,
              totalSpent: currency.totalSpent
            } : {
              hamsterCoins: 0,
              totalEarned: 0,
              totalSpent: 0
            },
            discordServerData: {
              nickname: null,
              displayName: user.globalName || user.username,
              roles: [],
              joinedAt: null,
              guildId: null,
              guildName: null
            }
          };
        })
      );
      
      return NextResponse.json({
        success: true,
        users: usersWithCurrency,
        totalCount: usersWithCurrency.length,
        source: 'legacy'
      });
    }

    // Use enhanced user model
    const users = await EnhancedUser.find({}).sort({ createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      users: users,
      totalCount: users.length,
      source: 'enhanced'
    });

  } catch (error) {
    console.error('Error fetching enhanced users:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
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
    
    // Check if user is admin
    const isUserAdmin = await isAdminWithDB(userId);
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, targetUserId, amount, description } = body;

    await connectDB();
    const mongoose = await import('mongoose');
    
    // Try to use enhanced user model first
    let EnhancedUser;
    let Currency;
    
    try {
      EnhancedUser = mongoose.model('EnhancedUser');
      // For enhanced users, currency is embedded
    } catch (error) {
      // Fallback to separate models
      const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
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
        stats: {
          programming: { type: Number, default: 1, min: 1, max: 100 },
          artist: { type: Number, default: 1, min: 1, max: 100 },
          creative: { type: Number, default: 1, min: 1, max: 100 },
          leadership: { type: Number, default: 1, min: 1, max: 100 },
          communication: { type: Number, default: 1, min: 1, max: 100 },
          selfLearning: { type: Number, default: 1, min: 1, max: 100 }
        }
      }, { timestamps: true }));
      
      Currency = mongoose.models.Currency || mongoose.model('Currency', new mongoose.Schema({
        userId: { type: String, required: true, unique: true },
        hamsterCoins: { type: Number, default: 0 },
        totalEarned: { type: Number, default: 0 },
        totalSpent: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
      }));
    }

    switch (action) {
      case 'add_currency':
        if (EnhancedUser) {
          const user = await EnhancedUser.findOne({ discordId: targetUserId });
          if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
          }
          
          await user.addHamsterCoins(amount, description || 'Admin added coins');
          
          return NextResponse.json({
            success: true,
            message: `Added ${amount} hamstercoins to ${user.username}`,
            newBalance: user.currency.hamsterCoins
          });
        } else {
          // Legacy system
          if (!Currency) {
            return NextResponse.json({ error: 'Currency model not available' }, { status: 500 });
          }
          
          const currency = await Currency.findOne({ userId: targetUserId });
          if (!currency) {
            const newCurrency = new Currency({
              userId: targetUserId,
              hamsterCoins: amount,
              totalEarned: amount
            });
            await newCurrency.save();
            return NextResponse.json({
              success: true,
              message: `Added ${amount} hamstercoins to user`,
              newBalance: amount
            });
          } else {
            currency.hamsterCoins += amount;
            currency.totalEarned += amount;
            currency.updatedAt = new Date();
            await currency.save();
            return NextResponse.json({
              success: true,
              message: `Added ${amount} hamstercoins to user`,
              newBalance: currency.hamsterCoins
            });
          }
        }

      case 'remove_currency':
        if (EnhancedUser) {
          const user = await EnhancedUser.findOne({ discordId: targetUserId });
          if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
          }
          
          await user.spendHamsterCoins(amount, description || 'Admin removed coins');
          
          return NextResponse.json({
            success: true,
            message: `Removed ${amount} hamstercoins from ${user.username}`,
            newBalance: user.currency.hamsterCoins
          });
        } else {
          // Legacy system
          if (!Currency) {
            return NextResponse.json({ error: 'Currency model not available' }, { status: 500 });
          }
          
          const currency = await Currency.findOne({ userId: targetUserId });
          if (!currency) {
            return NextResponse.json({ error: 'Currency account not found' }, { status: 404 });
          }
          
          currency.hamsterCoins = Math.max(0, currency.hamsterCoins - amount);
          currency.totalSpent += amount;
          currency.updatedAt = new Date();
          await currency.save();
          
          return NextResponse.json({
            success: true,
            message: `Removed ${amount} hamstercoins from user`,
            newBalance: currency.hamsterCoins
          });
        }

      case 'set_currency':
        if (EnhancedUser) {
          const user = await EnhancedUser.findOne({ discordId: targetUserId });
          if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
          }
          
          const oldBalance = user.currency.hamsterCoins;
          user.currency.hamsterCoins = amount;
          user.updatedAt = new Date();
          await user.save();
          
          return NextResponse.json({
            success: true,
            message: `Set ${user.username}'s hamstercoins to ${amount}`,
            oldBalance,
            newBalance: amount
          });
        } else {
          // Legacy system
          if (!Currency) {
            return NextResponse.json({ error: 'Currency model not available' }, { status: 500 });
          }
          
          let currency = await Currency.findOne({ userId: targetUserId });
          let oldBalance = 0;
          
          if (!currency) {
            currency = new Currency({
              userId: targetUserId,
              hamsterCoins: amount,
              totalEarned: amount
            });
          } else {
            oldBalance = currency.hamsterCoins;
            currency.hamsterCoins = amount;
            currency.updatedAt = new Date();
          }
          
          await currency.save();
          
          return NextResponse.json({
            success: true,
            message: `Set user's hamstercoins to ${amount}`,
            oldBalance: oldBalance,
            newBalance: amount
          });
        }

      case 'delete_user':
        if (EnhancedUser) {
          const result = await EnhancedUser.deleteOne({ discordId: targetUserId });
          if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
          }
        } else {
          // Legacy system
          const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
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
            stats: {
              programming: { type: Number, default: 1, min: 1, max: 100 },
              artist: { type: Number, default: 1, min: 1, max: 100 },
              creative: { type: Number, default: 1, min: 1, max: 100 },
              leadership: { type: Number, default: 1, min: 1, max: 100 },
              communication: { type: Number, default: 1, min: 1, max: 100 },
              selfLearning: { type: Number, default: 1, min: 1, max: 100 }
            }
          }, { timestamps: true }));
          
          await User.deleteOne({ discordId: targetUserId });
          if (Currency) {
            await Currency.deleteOne({ userId: targetUserId });
          }
        }
        
        return NextResponse.json({
          success: true,
          message: 'User deleted successfully'
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error performing user action:', error);
    return NextResponse.json({ 
      error: 'Failed to perform action',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
