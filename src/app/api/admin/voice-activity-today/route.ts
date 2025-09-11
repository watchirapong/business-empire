import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connections[0].readyState) {
    console.log('MongoDB already connected');
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('MongoDB connected successfully');
};

// Voice Activity Schema
const VoiceActivitySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: String,
  globalName: String,
  avatar: String,
  voiceJoinCount: { type: Number, default: 0 },
  totalVoiceTime: { type: Number, default: 0 },
  lastVoiceJoin: Date,
  lastVoiceLeave: Date,
  userType: { type: String, enum: ['real_user', 'suspicious_user'], default: 'suspicious_user' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Voice Session Schema
const VoiceSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: String,
  globalName: String,
  channelId: String,
  channelName: String,
  joinTime: { type: Date, required: true },
  leaveTime: Date,
  duration: Number,
  createdAt: { type: Date, default: Date.now }
});

const VoiceActivity = mongoose.models.VoiceActivity || mongoose.model('VoiceActivity', VoiceActivitySchema);
const VoiceSession = mongoose.models.VoiceSession || mongoose.model('VoiceSession', VoiceSessionSchema);

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession();
    const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917', '315548736388333568'];

    if (!session) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Try to get user ID from session
    let userId = (session.user as any)?.id;
    
    // If no user ID in session, try to get it from email
    if (!userId && session.user?.email) {
      try {
        await connectDB();
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
          createdAt: { type: Date, default: Date.now },
          updatedAt: { type: Date, default: Date.now }
        }));
        
        const user = await User.findOne({ email: session.user.email });
        if (user) {
          userId = user.discordId;
        }
      } catch (error) {
        console.error('Error finding user by email:', error);
      }
    }

    if (!ADMIN_USER_IDS.includes(userId)) {
      return NextResponse.json({ error: 'Unauthorized - Not admin' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get today's date range (start of day to end of day)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Get all voice sessions for today
    const todaySessions = await VoiceSession.find({
      joinTime: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ joinTime: -1 });

    // Get unique users who were in voice chat today
    const todayUserIds = Array.from(new Set(todaySessions.map(session => session.userId)));

    // Get voice activity data for users who were active today
    const todayVoiceActivities = await VoiceActivity.find({
      userId: { $in: todayUserIds }
    }).sort({ updatedAt: -1 }).limit(limit);

    // Calculate today's voice time for each user
    const todayVoiceData = todayVoiceActivities.map(activity => {
      const userSessions = todaySessions.filter(session => session.userId === activity.userId);
      const todayTotalTime = userSessions.reduce((total, session) => {
        return total + (session.duration || 0);
      }, 0);
      
      const todayJoinCount = userSessions.length;

      return {
        ...activity.toObject(),
        todayVoiceTime: todayTotalTime,
        todayJoinCount: todayJoinCount,
        todaySessions: userSessions
      };
    });

    // Sort by today's voice time (descending)
    todayVoiceData.sort((a, b) => b.todayVoiceTime - a.todayVoiceTime);

    // Get statistics for today
    const todayStats = {
      totalUsersToday: todayUserIds.length,
      totalTimeToday: todaySessions.reduce((total, session) => total + (session.duration || 0), 0),
      totalSessionsToday: todaySessions.length,
      averageTimePerUser: todayUserIds.length > 0 
        ? todaySessions.reduce((total, session) => total + (session.duration || 0), 0) / todayUserIds.length 
        : 0
    };

    return NextResponse.json({
      success: true,
      data: {
        todayVoiceData,
        todayStats,
        todaySessions: todaySessions.slice(0, 100) // Limit recent sessions for performance
      }
    });

  } catch (error) {
    console.error('Get today voice activity error:', error);
    return NextResponse.json(
      { error: 'Failed to get today voice activity data' },
      { status: 500 }
    );
  }
}
