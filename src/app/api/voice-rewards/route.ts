import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connections[0].readyState) {
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI!);
};

// Daily Voice Reward Schema
const DailyVoiceRewardSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: String, required: true },
  voiceTimeMinutes: { type: Number, default: 0 },
  rewardClaimed: { type: Boolean, default: false },
  rewardAmount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

DailyVoiceRewardSchema.index({ userId: 1, date: 1 }, { unique: true });

const DailyVoiceReward = mongoose.models.DailyVoiceReward || mongoose.model('DailyVoiceReward', DailyVoiceRewardSchema);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7'); // Default to 7 days

    console.log('Voice rewards API - User ID:', userId);

    await connectDB();

    // Get recent daily voice rewards
    const rewards = await DailyVoiceReward.find({ userId })
      .sort({ date: -1 })
      .limit(days);
    
    console.log('Voice rewards API - Found rewards:', rewards.length);

    // Get today's progress
    const today = new Date().toISOString().split('T')[0];
    const todayReward = rewards.find(r => r.date === today);

    const DAILY_REQUIREMENT = 15; // 15 minutes
    const REWARD_AMOUNT = 10; // 10 coins

    // Calculate total rewards earned from all claimed rewards
    const totalRewardsEarned = rewards
      .filter(r => r.rewardClaimed)
      .reduce((total, reward) => total + (reward.rewardAmount || REWARD_AMOUNT), 0);

    console.log('Voice rewards API - Total rewards earned:', totalRewardsEarned);

    return NextResponse.json({
      success: true,
      data: {
        todayProgress: {
          voiceTimeMinutes: todayReward?.voiceTimeMinutes || 0,
          requirement: DAILY_REQUIREMENT,
          rewardClaimed: todayReward?.rewardClaimed || false,
          rewardAmount: REWARD_AMOUNT,
          remainingMinutes: Math.max(0, DAILY_REQUIREMENT - (todayReward?.voiceTimeMinutes || 0))
        },
        recentRewards: rewards,
        totalRewardsEarned: totalRewardsEarned
      }
    });

  } catch (error) {
    console.error('Voice rewards API error:', error);
    return NextResponse.json(
      { error: 'Failed to get voice rewards data' },
      { status: 500 }
    );
  }
}
