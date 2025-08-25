import { NextRequest, NextResponse } from "next/server";
import mongoose from 'mongoose';

// Import models
const Achievement = require('../../../../../models/Achievement');
const UserAchievement = require('../../../../../models/UserAchievement');

const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGODB_URI);
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
    const achievementsWithProgress = achievements.map(achievement => {
      const userAchievement = userAchievements.find(ua => ua.achievementId === achievement.id);
      return {
        ...achievement.toObject(),
        progress: userAchievement?.progress || 0,
        isUnlocked: userAchievement?.isUnlocked || false,
        unlockedAt: userAchievement?.unlockedAt,
        claimed: userAchievement?.claimed || false,
        claimedAt: userAchievement?.claimedAt
      };
    });

    // Calculate statistics
    const totalAchievements = achievementsWithProgress.length;
    const unlockedAchievements = achievementsWithProgress.filter(a => a.isUnlocked);
    const claimedAchievements = achievementsWithProgress.filter(a => a.claimed);
    const totalRewards = claimedAchievements.reduce((sum, a) => sum + (a.reward?.hamsterCoins || 0), 0);

    // Group by category
    const achievementsByCategory = achievementsWithProgress.reduce((acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = [];
      }
      acc[achievement.category].push(achievement);
      return acc;
    }, {});

    // Group by rarity
    const achievementsByRarity = achievementsWithProgress.reduce((acc, achievement) => {
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
        .filter(a => a.unlockedAt)
        .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
        .slice(0, 5)
    });
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    return NextResponse.json({ error: "Failed to fetch user achievements" }, { status: 500 });
  }
}
