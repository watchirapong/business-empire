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
    const TICKET_REWARD = 1; // 1 ticket per day
    const COIN_REWARD = 10; // 10 coins per day (after 3-day streak)
    const STREAK_REQUIREMENT = 3; // 3 consecutive days for coins

    // Calculate current consecutive streak
    let currentStreak = 0;
    const sortedRewards = rewards.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    for (const reward of sortedRewards) {
      if (reward.voiceTimeMinutes >= DAILY_REQUIREMENT) {
        currentStreak++;
      } else {
        break; // Streak broken
      }
    }

    // Check if user is eligible for coins (3+ day streak)
    const isEligibleForCoins = currentStreak >= STREAK_REQUIREMENT;

    // Calculate total rewards earned from all claimed rewards
    const totalRewardsEarned = rewards
      .filter(r => r.rewardClaimed)
      .reduce((total, reward) => total + (reward.rewardAmount || TICKET_REWARD), 0);

    console.log('Voice rewards API - Current streak:', currentStreak, 'Eligible for coins:', isEligibleForCoins);

    return NextResponse.json({
      success: true,
      data: {
        todayProgress: {
          voiceTimeMinutes: todayReward?.voiceTimeMinutes || 0,
          requirement: DAILY_REQUIREMENT,
          rewardClaimed: todayReward?.rewardClaimed || false,
          ticketReward: TICKET_REWARD,
          coinReward: isEligibleForCoins ? COIN_REWARD : 0,
          remainingMinutes: Math.max(0, DAILY_REQUIREMENT - (todayReward?.voiceTimeMinutes || 0))
        },
        streak: {
          current: currentStreak,
          required: STREAK_REQUIREMENT,
          isEligibleForCoins: isEligibleForCoins,
          daysUntilCoins: Math.max(0, STREAK_REQUIREMENT - currentStreak)
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const today = new Date().toISOString().split('T')[0];

    await connectDB();

    // Get today's reward record
    const todayReward = await DailyVoiceReward.findOne({ userId, date: today });
    
    if (!todayReward) {
      return NextResponse.json(
        { error: 'No voice activity found for today' },
        { status: 400 }
      );
    }

    // Check if user has met the requirement
    const DAILY_REQUIREMENT = 15; // 15 minutes
    const TICKET_REWARD = 1; // 1 ticket per day
    const COIN_REWARD = 10; // 10 coins per day (after 3-day streak)
    const STREAK_REQUIREMENT = 3; // 3 consecutive days for coins
    
    if (todayReward.voiceTimeMinutes < DAILY_REQUIREMENT) {
      return NextResponse.json(
        { error: `You need ${DAILY_REQUIREMENT} minutes of voice time to claim the reward. You have ${todayReward.voiceTimeMinutes} minutes.` },
        { status: 400 }
      );
    }

    // Check if reward already claimed
    if (todayReward.rewardClaimed) {
      return NextResponse.json(
        { error: 'Reward already claimed for today' },
        { status: 400 }
      );
    }

    // Calculate current streak to determine coin eligibility
    const recentRewards = await DailyVoiceReward.find({ userId })
      .sort({ date: -1 })
      .limit(10); // Get last 10 days to calculate streak
    
    let currentStreak = 0;
    for (const reward of recentRewards) {
      if (reward.voiceTimeMinutes >= DAILY_REQUIREMENT) {
        currentStreak++;
      } else {
        break; // Streak broken
      }
    }

    const isEligibleForCoins = currentStreak >= STREAK_REQUIREMENT;

    // Award ticket (always given)
    const ticketResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        action: 'earn',
        amount: TICKET_REWARD,
        reason: 'Daily voice reward'
      })
    });

    if (!ticketResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to award ticket' },
        { status: 500 }
      );
    }

    let coinResponse = null;
    if (isEligibleForCoins) {
      // Award coins (only if streak is 3+ days)
      coinResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/currency/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({
          amount: COIN_REWARD,
          description: 'Daily voice reward (3+ day streak)'
        })
      });

      if (!coinResponse.ok) {
        console.error('Failed to award coins, but ticket was awarded');
      }
    }

    // Mark reward as claimed
    todayReward.rewardClaimed = true;
    todayReward.rewardAmount = TICKET_REWARD + (isEligibleForCoins ? COIN_REWARD : 0);
    todayReward.updatedAt = new Date();
    await todayReward.save();

    const message = isEligibleForCoins 
      ? `Daily voice reward claimed! You received ${TICKET_REWARD} gacha ticket and ${COIN_REWARD} coins (${currentStreak} day streak).`
      : `Daily voice reward claimed! You received ${TICKET_REWARD} gacha ticket. Complete ${STREAK_REQUIREMENT - currentStreak} more consecutive days to earn coins.`;

    return NextResponse.json({
      success: true,
      message: message,
      data: {
        rewardClaimed: true,
        ticketReward: TICKET_REWARD,
        coinReward: isEligibleForCoins ? COIN_REWARD : 0,
        currentStreak: currentStreak,
        isEligibleForCoins: isEligibleForCoins,
        voiceTimeMinutes: todayReward.voiceTimeMinutes
      }
    });

  } catch (error) {
    console.error('Voice rewards claim API error:', error);
    return NextResponse.json(
      { error: 'Failed to claim voice reward' },
      { status: 500 }
    );
  }
}
