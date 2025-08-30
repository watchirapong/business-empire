import { NextRequest, NextResponse } from 'next/server';
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

async function connectDB() {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Get all achievements
    const allAchievements = await Achievement.find({ isActive: true });
    
    // Get user's unlocked achievements
    const userAchievements = await UserAchievement.find({ userId }).populate('achievementId');
    
    // Create a map of unlocked achievement IDs
    const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId._id.toString()));
    
    // Calculate total users for rarity calculation
    const totalUsers = await mongoose.model('Currency').countDocuments();
    
    // Combine achievements with unlock status and rarity
    const achievementsWithStatus = allAchievements.map(achievement => {
      const userAchievement = userAchievements.find(ua => 
        ua.achievementId._id.toString() === achievement._id.toString()
      );
      
      const isUnlocked = !!userAchievement;
      const unlockedAt = userAchievement?.unlockedAt;
      
      // Calculate actual rarity based on how many users have this achievement
      const usersWithAchievement = userAchievements.filter(ua => 
        ua.achievementId._id.toString() === achievement._id.toString()
      ).length;
      
      const actualRarity = totalUsers > 0 ? Math.round((usersWithAchievement / totalUsers) * 100) : 0;
      
      return {
        _id: achievement._id,
        id: achievement._id, // Add id for compatibility
        name: achievement.title, // Add name for compatibility
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        category: achievement.category,
        coinReward: achievement.coinReward,
        rarity: actualRarity,
        isUnlocked,
        unlockedAt,
        progress: userAchievement?.progress || 0,
        coinsRewarded: userAchievement?.coinsRewarded || 0,
        // Add missing properties for component compatibility
        requirement: {
          type: 'default',
          value: 100,
          description: 'Complete this achievement'
        },
        reward: {
          hamsterCoins: achievement.coinReward,
          experience: 0
        },
        claimed: userAchievement?.coinsRewarded > 0 || false,
        claimedAt: userAchievement?.coinsRewarded > 0 ? userAchievement.unlockedAt : null
      };
    });
    
    // Calculate statistics
    const totalAchievements = achievementsWithStatus.length;
    const unlockedAchievements = achievementsWithStatus.filter(a => a.isUnlocked).length;
    const claimedAchievements = achievementsWithStatus.filter(a => a.claimed).length;
    const totalRewards = achievementsWithStatus
      .filter(a => a.claimed)
      .reduce((sum, a) => sum + (a.coinReward || 0), 0);
    const completionRate = totalAchievements > 0 ? Math.round((unlockedAchievements / totalAchievements) * 100) : 0;
    
    const statistics = {
      total: totalAchievements,
      unlocked: unlockedAchievements,
      claimed: claimedAchievements,
      totalRewards,
      completionRate: completionRate.toString()
    };
    
    return NextResponse.json({ 
      achievements: achievementsWithStatus,
      statistics
    });
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    return NextResponse.json({ error: 'Failed to fetch user achievements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { userId, achievementId, progress = 100 } = body;
    
    if (!userId || !achievementId) {
      return NextResponse.json({ error: 'User ID and Achievement ID are required' }, { status: 400 });
    }
    
    // Check if achievement exists
    const achievement = await Achievement.findById(achievementId);
    if (!achievement) {
      return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
    }
    
    // Check if user already has this achievement
    const existingUserAchievement = await UserAchievement.findOne({ userId, achievementId });
    
    if (existingUserAchievement) {
      // Update progress
      const wasCompleted = existingUserAchievement.progress >= 100;
      const isNowCompleted = progress >= 100;
      
      existingUserAchievement.progress = progress;
      existingUserAchievement.unlockedAt = isNowCompleted ? new Date() : existingUserAchievement.unlockedAt;
      
      // Grant coins if newly completed and coins haven't been rewarded yet
      let coinMessage = '';
      if (isNowCompleted && !wasCompleted && existingUserAchievement.coinsRewarded === 0) {
        // Add coins to user's currency
        const Currency = mongoose.model('Currency');
        await Currency.findOneAndUpdate(
          { userId },
          { 
            $inc: { 
              hamsterCoins: achievement.coinReward,
              totalEarned: achievement.coinReward
            }
          },
          { upsert: true, new: true }
        );
        
        existingUserAchievement.coinsRewarded = achievement.coinReward;
        coinMessage = ` +${achievement.coinReward} coins earned!`;
      }
      
      await existingUserAchievement.save();
      
      return NextResponse.json({ 
        userAchievement: existingUserAchievement,
        message: isNowCompleted ? `Achievement completed!${coinMessage}` : 'Progress updated'
      });
    } else {
      // Create new user achievement
      const userAchievement = new UserAchievement({
        userId,
        achievementId,
        progress,
        unlockedAt: progress >= 100 ? new Date() : null,
        coinsRewarded: progress >= 100 ? achievement.coinReward : 0
      });
      
      // Grant coins if completed immediately
      let coinMessage = '';
      if (progress >= 100) {
        const Currency = mongoose.model('Currency');
        await Currency.findOneAndUpdate(
          { userId },
          { 
            $inc: { 
              hamsterCoins: achievement.coinReward,
              totalEarned: achievement.coinReward
            }
          },
          { upsert: true, new: true }
        );
        coinMessage = ` +${achievement.coinReward} coins earned!`;
      }
      
      await userAchievement.save();
      
      return NextResponse.json({ 
        userAchievement,
        message: progress >= 100 ? `Achievement unlocked!${coinMessage}` : 'Progress recorded'
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error managing user achievement:', error);
    return NextResponse.json({ error: 'Failed to manage user achievement' }, { status: 500 });
  }
}
