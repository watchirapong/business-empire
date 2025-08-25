import { NextRequest, NextResponse } from "next/server";
import mongoose from 'mongoose';

// Import models
import Achievement from '../../../../../models/Achievement';
import UserAchievement from '../../../../../models/UserAchievement';

const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }
  await mongoose.connect(mongoUri);
};

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Get user's achievements with progress
    const userAchievements = await UserAchievement.find({ userId });
    const achievements = await Achievement.find({ isActive: true });

    // Combine achievements with user progress
    const achievementsWithProgress = achievements.map((achievement: any) => {
      const achievementId = achievement.id || achievement._id;
      const userAchievement = userAchievements.find((ua: any) => ua.achievementId === achievementId);
      
      // Normalize achievement data to handle both old and new formats
      const normalizedAchievement = {
        ...achievement.toObject(),
        id: achievementId,
        name: achievement.name || achievement.title,
        reward: {
          hamsterCoins: achievement.reward?.hamsterCoins || achievement.coinReward || 0,
          experience: achievement.reward?.experience || 0
        },
        progress: userAchievement?.progress || 0,
        isUnlocked: userAchievement?.isUnlocked || false,
        unlockedAt: userAchievement?.unlockedAt,
        claimed: userAchievement?.claimed || false,
        claimedAt: userAchievement?.claimedAt
      };
      
      return normalizedAchievement;
    });

    // Calculate statistics
    const totalAchievements = achievementsWithProgress.length;
    const unlockedAchievements = achievementsWithProgress.filter((a: any) => a.isUnlocked);
    const claimedAchievements = achievementsWithProgress.filter((a: any) => a.claimed);
    const totalRewards = claimedAchievements.reduce((sum: number, a: any) => sum + (a.reward?.hamsterCoins || 0), 0);

    // Group by category
    const achievementsByCategory = achievementsWithProgress.reduce((acc: any, achievement: any) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = [];
      }
      acc[achievement.category].push(achievement);
      return acc;
    }, {});

    // Group by rarity
    const achievementsByRarity = achievementsWithProgress.reduce((acc: any, achievement: any) => {
      if (!acc[achievement.rarity]) {
        acc[achievement.rarity] = [];
      }
      acc[achievement.rarity].push(achievement);
      return acc;
    }, {});

    return NextResponse.json({
      achievements: achievementsWithProgress,
      statistics: {
        total: totalAchievements,
        unlocked: unlockedAchievements.length,
        claimed: claimedAchievements.length,
        totalRewards,
        completionRate: totalAchievements > 0 ? (unlockedAchievements.length / totalAchievements * 100).toFixed(1) : 0
      },
      byCategory: achievementsByCategory,
      byRarity: achievementsByRarity,
      recentUnlocks: unlockedAchievements
        .filter((a: any) => a.unlockedAt)
        .sort((a: any, b: any) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
        .slice(0, 5)
    });
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    return NextResponse.json({ error: "Failed to fetch user achievements" }, { status: 500 });
  }
}
