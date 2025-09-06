import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
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

// Server Member Data schema
const serverMemberDataSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  serverId: { type: String, required: true },
  serverData: {
    member: {
      user: {
        id: String,
        username: String,
        avatar: String
      },
      nick: String,
      roles: [String],
      joined_at: String
    },
    guild: {
      id: String,
      name: String,
      icon: String
    },
    serverInfo: {
      guildId: String,
      userId: String,
      joinedAt: String,
      roles: [String],
      nick: String,
      avatar: String,
      guildName: String,
      guildIcon: String
    },
    roles: [String],
    nick: String,
    avatar: String,
    banner: String,
    communication_disabled_until: String,
    flags: Number,
    joined_at: String,
    pending: Boolean,
    premium_since: String,
    unusual_dm_activity_until: String,
    collectibles: mongoose.Schema.Types.Mixed,
    user: mongoose.Schema.Types.Mixed,
    mute: Boolean,
    deaf: Boolean
  },
  lastUpdated: { type: Date, default: Date.now }
}, { strict: false });

const VoiceActivity = mongoose.models.VoiceActivity || mongoose.model('VoiceActivity', VoiceActivitySchema);
const VoiceSession = mongoose.models.VoiceSession || mongoose.model('VoiceSession', VoiceSessionSchema);
const ServerMemberData = mongoose.models.ServerMemberData || mongoose.model('ServerMemberData', serverMemberDataSchema);

// Role ID to rank mapping
const ROLE_ID_RANK_MAP: { [key: string]: string } = {
  '807189391927410728': 'Ace',
  '857990230472130561': 'Hero', 
  '1127432595081277484': 'Enigma',
  '1388546120912998554': 'Warrior',
  '1397111512619028551': 'Trainee'
};

// Function to get user's highest rank from roles
function getRankFromRoles(roles: string[]): string {
  if (!roles || roles.length === 0) {
    return 'None';
  }

  let highestRank = 'None';
  let highestPriority = 0;

  const RANK_PRIORITY: { [key: string]: number } = {
    'Ace': 5,
    'Hero': 4,
    'Enigma': 3,
    'Warrior': 2,
    'Trainee': 1
  };

  for (const userRoleId of roles) {
    if (ROLE_ID_RANK_MAP[userRoleId]) {
      const priority = RANK_PRIORITY[ROLE_ID_RANK_MAP[userRoleId]];
      if (priority > highestPriority) {
        highestPriority = priority;
        highestRank = ROLE_ID_RANK_MAP[userRoleId];
      }
    }
  }

  return highestRank;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917'];

    if (!ADMIN_USER_IDS.includes(userId)) {
      return NextResponse.json({ error: 'Unauthorized - Not admin' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // Format: YYYY-MM-DD
    const filter = searchParams.get('filter'); // 'all', 'real_user', 'suspicious_user'
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    // Parse the date and create start/end boundaries for the day
    const selectedDate = new Date(date);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`Fetching voice sessions for date: ${date}`);
    console.log(`Start of day: ${startOfDay.toISOString()}`);
    console.log(`End of day: ${endOfDay.toISOString()}`);

    // Get all voice sessions for the selected day
    const voiceSessions = await VoiceSession.find({
      joinTime: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ joinTime: -1 });

    console.log(`Found ${voiceSessions.length} voice sessions for ${date}`);

    // Group sessions by user and calculate daily statistics
    const userDailyStats = new Map();
    
    voiceSessions.forEach(session => {
      const userId = session.userId;
      
      if (!userDailyStats.has(userId)) {
        userDailyStats.set(userId, {
          userId,
          username: session.username,
          globalName: session.globalName,
          avatar: session.avatar,
          dailyJoinCount: 0,
          dailyVoiceTime: 0,
          sessions: [],
          channels: new Set(),
          firstJoin: null,
          lastJoin: null
        });
      }
      
      const userStats = userDailyStats.get(userId);
      userStats.dailyJoinCount += 1;
      userStats.sessions.push(session);
      userStats.channels.add(session.channelName);
      
      if (session.duration) {
        userStats.dailyVoiceTime += session.duration;
      }
      
      if (!userStats.firstJoin || session.joinTime < userStats.firstJoin) {
        userStats.firstJoin = session.joinTime;
      }
      
      if (!userStats.lastJoin || session.joinTime > userStats.lastJoin) {
        userStats.lastJoin = session.joinTime;
      }
    });

    // Get user IDs for fetching additional data
    const userIds = Array.from(userDailyStats.keys());
    
    // Get voice activity data for user types
    const voiceActivities = await VoiceActivity.find({
      userId: { $in: userIds }
    });

    // Get server member data for roles
    const serverMembers = await ServerMemberData.find({ 
      userId: { $in: userIds },
      serverId: '699984143542517801' 
    });

    // Create maps for quick lookup
    const voiceActivityMap = new Map();
    voiceActivities.forEach(activity => {
      voiceActivityMap.set(activity.userId, activity);
    });

    const serverDataMap = new Map();
    serverMembers.forEach(member => {
      serverDataMap.set(member.userId, member);
    });

    // Combine all data
    const dailyVoiceData = Array.from(userDailyStats.values()).map(userStats => {
      const voiceActivity = voiceActivityMap.get(userStats.userId);
      const serverData = serverDataMap.get(userStats.userId);
      
      let roles: string[] = [];
      let rank = 'None';
      let userType = 'suspicious_user';

      if (serverData) {
        // Get roles from different possible data structures
        if (serverData.serverData?.roles) {
          roles = serverData.serverData.roles;
        } else if (serverData.serverData?.serverInfo?.roles) {
          roles = serverData.serverData.serverInfo.roles;
        } else if (serverData.serverData?.member?.roles) {
          roles = serverData.serverData.member.roles;
        } else if (serverData.roles) {
          roles = serverData.roles;
        }

        rank = getRankFromRoles(roles);
      }

      if (voiceActivity) {
        userType = voiceActivity.userType;
      }

      return {
        ...userStats,
        channels: Array.from(userStats.channels),
        totalVoiceTime: voiceActivity?.totalVoiceTime || 0,
        voiceJoinCount: voiceActivity?.voiceJoinCount || 0,
        userType,
        roles,
        rank,
        displayName: userStats.globalName || userStats.username
      };
    });

    // Apply filters
    let filteredData = dailyVoiceData;
    if (filter && filter !== 'all') {
      filteredData = dailyVoiceData.filter(user => user.userType === filter);
    }

    // Apply limit
    filteredData = filteredData.slice(0, limit);

    // Calculate daily statistics
    const dailyStats = {
      totalUsers: dailyVoiceData.length,
      totalSessions: voiceSessions.length,
      totalTime: dailyVoiceData.reduce((sum, user) => sum + user.dailyVoiceTime, 0),
      realUsers: dailyVoiceData.filter(user => user.userType === 'real_user').length,
      suspiciousUsers: dailyVoiceData.filter(user => user.userType === 'suspicious_user').length,
      averageTimePerUser: dailyVoiceData.length > 0 ? 
        Math.round(dailyVoiceData.reduce((sum, user) => sum + user.dailyVoiceTime, 0) / dailyVoiceData.length) : 0,
      uniqueChannels: new Set(voiceSessions.map(session => session.channelName)).size
    };

    // Role statistics for the day
    const roleStats = new Map();
    dailyVoiceData.forEach(user => {
      const role = user.rank;
      if (!roleStats.has(role)) {
        roleStats.set(role, {
          role,
          count: 0,
          totalTime: 0,
          totalSessions: 0
        });
      }
      
      const stats = roleStats.get(role);
      stats.count += 1;
      stats.totalTime += user.dailyVoiceTime;
      stats.totalSessions += user.dailyJoinCount;
    });

    const roleStatsArray = Array.from(roleStats.values());

    return NextResponse.json({
      success: true,
      data: {
        date,
        dailyVoiceData: filteredData,
        dailyStats,
        roleStats: roleStatsArray,
        allSessions: voiceSessions.slice(0, 100) // Limit sessions for performance
      }
    });

  } catch (error) {
    console.error('Get daily voice activity error:', error);
    return NextResponse.json(
      { error: 'Failed to get daily voice activity data' },
      { status: 500 }
    );
  }
}
