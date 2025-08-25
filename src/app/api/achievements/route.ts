import { NextRequest, NextResponse } from "next/server";
import mongoose from 'mongoose';

// Import models
const Achievement = require('../../../../models/Achievement');
const UserAchievement = require('../../../../models/UserAchievement');

const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGODB_URI);
};

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Get all active achievements
    const achievements = await Achievement.find({ isActive: true }).sort({ rarity: 1, name: 1 });
    
    let userAchievements = [];
    if (userId) {
      // Get user's achievement progress
      userAchievements = await UserAchievement.find({ userId }).populate('achievementId');
    }

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

    return NextResponse.json({
      achievements: achievementsWithProgress,
      total: achievementsWithProgress.length,
      unlocked: achievementsWithProgress.filter(a => a.isUnlocked).length
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json({ error: "Failed to fetch achievements" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { userId, achievementId, progress, action } = body;

    if (!userId || !achievementId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let userAchievement = await UserAchievement.findOne({ userId, achievementId });
    
    if (!userAchievement) {
      userAchievement = new UserAchievement({ userId, achievementId });
    }

    if (action === 'claim') {
      if (!userAchievement.isUnlocked) {
        return NextResponse.json({ error: "Achievement not unlocked" }, { status: 400 });
      }
      
      if (userAchievement.claimed) {
        return NextResponse.json({ error: "Achievement already claimed" }, { status: 400 });
      }

      userAchievement.claimed = true;
      userAchievement.claimedAt = new Date();
      
      // Get achievement details for rewards
      const achievement = await Achievement.findOne({ id: achievementId });
      if (achievement) {
        // Add rewards to user's currency
        if (achievement.reward.hamsterCoins > 0) {
          // Update user's hamster coins
          const Currency = require('../../../../models/Currency');
          let userCurrency = await Currency.findOne({ userId });
          
          if (!userCurrency) {
            userCurrency = new Currency({ userId, hamsterCoins: 0 });
          }
          
          userCurrency.hamsterCoins += achievement.reward.hamsterCoins;
          userCurrency.totalEarned += achievement.reward.hamsterCoins;
          await userCurrency.save();
        }
      }
    } else {
      // Update progress
      userAchievement.progress = progress || userAchievement.progress;
      
      // Check if achievement should be unlocked
      const achievement = await Achievement.findOne({ id: achievementId });
      if (achievement && userAchievement.progress >= achievement.requirement.value && !userAchievement.isUnlocked) {
        userAchievement.isUnlocked = true;
        userAchievement.unlockedAt = new Date();
      }
    }

    await userAchievement.save();

    return NextResponse.json({
      success: true,
      userAchievement: userAchievement.toObject()
    });
  } catch (error) {
    console.error('Error updating achievement:', error);
    return NextResponse.json({ error: "Failed to update achievement" }, { status: 500 });
  }
}
