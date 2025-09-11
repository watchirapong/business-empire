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

// Login Streak Schema
const LoginStreakSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  consecutiveDays: { type: Number, default: 0 },
  totalLoginDays: { type: Number, default: 0 },
  lastLoginDate: { type: String, default: '' },
  streakStartDate: { type: String, default: '' },
  todayCompleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const LoginStreak = mongoose.models.LoginStreak || mongoose.model('LoginStreak', LoginStreakSchema);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    await connectDB();

    // Get user's login streak data
    let streakData = await LoginStreak.findOne({ userId });
    
    if (!streakData) {
      // Create new streak record
      const today = new Date().toISOString().split('T')[0];
      streakData = new LoginStreak({
        userId,
        consecutiveDays: 0,
        totalLoginDays: 0,
        lastLoginDate: '',
        streakStartDate: today,
        todayCompleted: false
      });
      await streakData.save();
    }

    // Check if this is a new day and update accordingly
    const today = new Date().toISOString().split('T')[0];
    let shouldAwardTicket = false;
    
    if (streakData.lastLoginDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (streakData.lastLoginDate === yesterdayStr) {
        // Consecutive day - increment streak
        streakData.consecutiveDays += 1;
        streakData.totalLoginDays += 1;
        
        // Award ticket every 3 consecutive days
        if (streakData.consecutiveDays % 3 === 0) {
          shouldAwardTicket = true;
        }
      } else if (streakData.lastLoginDate && streakData.lastLoginDate !== yesterdayStr) {
        // Streak broken - reset
        streakData.consecutiveDays = 1;
        streakData.totalLoginDays += 1;
        streakData.streakStartDate = today;
      } else {
        // First login
        streakData.consecutiveDays = 1;
        streakData.totalLoginDays = 1;
        streakData.streakStartDate = today;
      }
      
      streakData.lastLoginDate = today;
      streakData.todayCompleted = false;
      streakData.updatedAt = new Date();
      
      await streakData.save();
    }

    // Award ticket if eligible
    if (shouldAwardTicket) {
      try {
        const ticketResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/tickets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
          body: JSON.stringify({
            action: 'earn',
            amount: 1,
            reason: '3-day login streak'
          })
        });
        
        if (ticketResponse.ok) {
          console.log(`Awarded 1 ticket to user ${userId} for 3-day streak`);
        }
      } catch (error) {
        console.error('Error awarding ticket:', error);
      }
    }

    // Check today's completion status from voice rewards
    try {
      const voiceResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/voice-rewards`, {
        headers: {
          'Cookie': request.headers.get('cookie') || ''
        }
      });
      
      if (voiceResponse.ok) {
        const voiceData = await voiceResponse.json();
        if (voiceData.success && voiceData.data.todayProgress) {
          const todayCompleted = voiceData.data.todayProgress.voiceTimeMinutes >= voiceData.data.todayProgress.requirement;
          
          if (streakData.todayCompleted !== todayCompleted) {
            streakData.todayCompleted = todayCompleted;
            streakData.updatedAt = new Date();
            await streakData.save();
          }
        }
      }
    } catch (error) {
      console.error('Error checking voice rewards:', error);
    }

    return NextResponse.json({
      success: true,
      data: {
        consecutiveDays: streakData.consecutiveDays,
        totalLoginDays: streakData.totalLoginDays,
        lastLoginDate: streakData.lastLoginDate,
        streakStartDate: streakData.streakStartDate,
        todayCompleted: streakData.todayCompleted
      }
    });

  } catch (error) {
    console.error('Login streak API error:', error);
    return NextResponse.json(
      { error: 'Failed to get login streak data' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { todayCompleted } = body;

    await connectDB();

    // Update today's completion status
    const streakData = await LoginStreak.findOneAndUpdate(
      { userId },
      { 
        todayCompleted,
        updatedAt: new Date()
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      success: true,
      data: {
        consecutiveDays: streakData.consecutiveDays,
        totalLoginDays: streakData.totalLoginDays,
        lastLoginDate: streakData.lastLoginDate,
        streakStartDate: streakData.streakStartDate,
        todayCompleted: streakData.todayCompleted
      }
    });

  } catch (error) {
    console.error('Login streak update API error:', error);
    return NextResponse.json(
      { error: 'Failed to update login streak data' },
      { status: 500 }
    );
  }
}
