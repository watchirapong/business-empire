import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

// Define schemas locally for API routes
const achievementSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  icon: { type: String, required: true, default: '🏆' },
  rarity: { type: Number, required: true, min: 0, max: 100, default: 50 },
  category: { type: String, enum: ['Task', 'Goal', 'Quest'], default: 'Goal' },
  coinReward: { type: Number, required: true, min: 0, default: 100 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const userAchievementSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  achievementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement', required: true },
  unlockedAt: { type: Date, default: Date.now },
  progress: { type: Number, default: 100 },
  coinsRewarded: { type: Number, default: 0 }
});

const Achievement = mongoose.models.Achievement || mongoose.model('Achievement', achievementSchema);
const UserAchievement = mongoose.models.UserAchievement || mongoose.model('UserAchievement', userAchievementSchema);

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get all active achievements
    const achievements = await Achievement.find({ isActive: true }).sort({ createdAt: -1 });
    
    // Get user's unlocked achievements
    const userAchievements = await UserAchievement.find({ userId }).populate('achievementId');
    
    // Create a map of unlocked achievements
    const unlockedAchievements = new Map();
    userAchievements.forEach(ua => {
      if (ua.achievementId) {
        unlockedAchievements.set(ua.achievementId._id.toString(), {
          unlockedAt: ua.unlockedAt,
          progress: ua.progress,
          coinsRewarded: ua.coinsRewarded
        });
      }
    });

    // Combine achievements with user progress
    const achievementsWithProgress = achievements.map(achievement => {
      const userProgress = unlockedAchievements.get(achievement._id.toString());
      return {
        _id: achievement._id,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        rarity: achievement.rarity,
        category: achievement.category,
        coinReward: achievement.coinReward,
        isUnlocked: !!userProgress,
        unlockedAt: userProgress?.unlockedAt || null,
        progress: userProgress?.progress || 0,
        coinsRewarded: userProgress?.coinsRewarded || 0
      };
    });

    // Calculate statistics
    const totalAchievements = achievements.length;
    const unlockedCount = achievementsWithProgress.filter(a => a.isUnlocked).length;
    const totalRewards = achievementsWithProgress
      .filter(a => a.isUnlocked)
      .reduce((sum, a) => sum + a.coinsRewarded, 0);
    const completionRate = totalAchievements > 0 ? ((unlockedCount / totalAchievements) * 100).toFixed(1) : '0.0';

    const statistics = {
      total: totalAchievements,
      unlocked: unlockedCount,
      claimed: unlockedCount, // Assuming all unlocked achievements are claimed
      totalRewards,
      completionRate: `${completionRate}%`
    };

    return NextResponse.json({
      achievements: achievementsWithProgress,
      statistics
    });
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { userId, achievementId, action } = body;
    
    if (!userId || !achievementId) {
      return NextResponse.json({ error: 'User ID and Achievement ID are required' }, { status: 400 });
    }

    if (action === 'claim') {
      // Check if achievement exists and is unlocked
      const achievement = await Achievement.findById(achievementId);
      if (!achievement) {
        return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
      }

      // Check if user already has this achievement
      const existingUserAchievement = await UserAchievement.findOne({ userId, achievementId });
      if (existingUserAchievement) {
        return NextResponse.json({ error: 'Achievement already claimed' }, { status: 400 });
      }

      // Try to use enhanced user model first, fallback to legacy system
      let EnhancedUser;
      let Currency;
      
      try {
        EnhancedUser = mongoose.model('EnhancedUser');
      } catch (error) {
        Currency = mongoose.models.Currency || mongoose.model('Currency', new mongoose.Schema({
          userId: { type: String, required: true, unique: true },
          hamsterCoins: { type: Number, default: 0 },
          totalEarned: { type: Number, default: 0 },
          totalSpent: { type: Number, default: 0 },
          createdAt: { type: Date, default: Date.now },
          updatedAt: { type: Date, default: Date.now }
        }));
      }

      // Award coins to user
      if (EnhancedUser) {
        // Use enhanced user model
        const user = await EnhancedUser.findOne({ discordId: userId });
        if (user) {
          user.currency.hamsterCoins += achievement.coinReward;
          user.currency.totalEarned += achievement.coinReward;
          user.updatedAt = new Date();
          await user.save();
        } else {
          // Create new enhanced user with achievement reward
          const newUser = new EnhancedUser({
            discordId: userId,
            username: 'Unknown',
            email: `${userId}@discord.local`,
            currency: {
              hamsterCoins: achievement.coinReward,
              totalEarned: achievement.coinReward,
              totalSpent: 0
            }
          });
          await newUser.save();
        }
      } else {
        // Legacy system
        let currency = await (Currency as any).findOne({ userId });
        if (!currency) {
          currency = new (Currency as any)({
            userId,
            hamsterCoins: achievement.coinReward,
            totalEarned: achievement.coinReward,
            totalSpent: 0
          });
        } else {
          currency.hamsterCoins += achievement.coinReward;
          currency.totalEarned += achievement.coinReward;
          currency.updatedAt = new Date();
        }
        await currency.save();
      }

      // Create user achievement record
      const userAchievement = new UserAchievement({
        userId,
        achievementId,
        progress: 100,
        coinsRewarded: achievement.coinReward
      });

      await userAchievement.save();

      return NextResponse.json({
        success: true,
        message: 'Achievement claimed successfully',
        coinsRewarded: achievement.coinReward
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing achievement action:', error);
    return NextResponse.json({ error: 'Failed to process achievement action' }, { status: 500 });
  }
}