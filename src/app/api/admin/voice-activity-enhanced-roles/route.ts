import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';
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

// Voice Session Schema for daily data
const VoiceSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  channelId: { type: String, required: true },
  channelName: String,
  joinTime: { type: Date, required: true },
  leaveTime: Date,
  duration: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
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

// Rank priority (higher number = higher rank)
const RANK_PRIORITY: { [key: string]: number } = {
  'Ace': 5,
  'Hero': 4,
  'Enigma': 3,
  'Warrior': 2,
  'Trainee': 1
};

// Function to get user's highest rank from roles
function getRankFromRoles(roles: string[]): string {
  if (!roles || roles.length === 0) {
    return 'None';
  }

  let highestRank = 'None';
  let highestPriority = 0;

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

// Function to check if user has specific role ID
function hasRoleId(roles: string[], targetRoleId: string): boolean {
  return roles && roles.includes(targetRoleId);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Unauthorized - Not admin' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // 'all', 'real_user', 'suspicious_user'
    const limit = parseInt(searchParams.get('limit') || '50');
    const roleFilter = searchParams.get('roleFilter'); // specific role to filter by
    const customRoleId = searchParams.get('customRoleId'); // custom role ID to filter by
    const dateFilter = searchParams.get('dateFilter'); // date filter for daily data

    let voiceActivities = [];
    let dailyData = null;

    // Always get voice activities first
    let voiceQuery = {};
    if (filter && filter !== 'all') {
      voiceQuery = { userType: filter };
    }

    const allVoiceActivities = await VoiceActivity.find(voiceQuery)
      .sort({ updatedAt: -1 })
      .limit(limit);

    // Get server member data for all users
    const userIds = allVoiceActivities.map(activity => activity.userId);
    const serverMembers = await ServerMemberData.find({ 
      userId: { $in: userIds },
      serverId: '699984143542517801' 
    });

    const serverDataMap = new Map();
    serverMembers.forEach(member => {
      serverDataMap.set(member.userId, member);
    });

    // Get voice sessions for the selected date (or today if no date specified)
    const targetDate = dateFilter || new Date().toISOString().split('T')[0];
    const startDate = new Date(targetDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    // Get voice sessions for the target date
    const voiceSessions = await VoiceSession.find({
      joinTime: { $gte: startDate, $lte: endDate }
    }).sort({ joinTime: -1 });

    // Group sessions by user
    const userSessions = new Map();
    voiceSessions.forEach(session => {
      if (!userSessions.has(session.userId)) {
        userSessions.set(session.userId, []);
      }
      userSessions.get(session.userId).push(session);
    });

    // Combine voice activity with role information and daily data
    voiceActivities = allVoiceActivities.map(activity => {
      const serverData = serverDataMap.get(activity.userId);
      const userSessionsList = userSessions.get(activity.userId) || [];
      
      let roles: string[] = [];
      let rank = 'None';

      if (serverData) {
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

      // Calculate daily stats
      const dailyJoinCount = userSessionsList.length;
      const dailyVoiceTime = userSessionsList.reduce((total: number, session: any) => total + (session.duration || 0), 0);
      const channels = [...new Set(userSessionsList.map((s: any) => s.channelName).filter(Boolean))];
      const firstJoin = userSessionsList.length > 0 ? userSessionsList[userSessionsList.length - 1].joinTime : null;
      const lastJoin = userSessionsList.length > 0 ? userSessionsList[0].joinTime : null;

      return {
        ...activity.toObject(),
        roles,
        rank,
        displayName: activity.globalName || activity.username,
        dailyJoinCount,
        dailyVoiceTime,
        channels,
        firstJoin,
        lastJoin,
        sessions: userSessionsList
      };
    });

    // Calculate daily statistics
    const dailyTotalUsers = voiceActivities.length;
    const totalSessions = voiceSessions.length;
    const totalTime = voiceActivities.reduce((sum, activity) => sum + activity.dailyVoiceTime, 0);
    const uniqueChannels = new Set();
    voiceSessions.forEach(session => {
      if (session.channelName) uniqueChannels.add(session.channelName);
    });
    const dailyRealUsers = voiceActivities.filter(a => a.userType === 'real_user').length;
    const dailySuspiciousUsers = voiceActivities.filter(a => a.userType === 'suspicious_user').length;

    dailyData = {
      totalUsers: dailyTotalUsers,
      totalSessions,
      totalTime,
      uniqueChannels: uniqueChannels.size,
      realUsers: dailyRealUsers,
      suspiciousUsers: dailySuspiciousUsers,
      averageTimePerUser: dailyTotalUsers > 0 ? Math.round(totalTime / dailyTotalUsers) : 0
    };

    // Apply role filtering
    let filteredActivities = voiceActivities;
    if (roleFilter && roleFilter !== 'all') {
      filteredActivities = voiceActivities.filter(activity => activity.rank === roleFilter);
    } else if (customRoleId) {
      // Filter by custom role ID
      filteredActivities = voiceActivities.filter(activity => hasRoleId(activity.roles, customRoleId));
    }

    // Group by role for statistics
    const roleStats = new Map();
    voiceActivities.forEach(activity => {
      const role = activity.rank;
      if (!roleStats.has(role)) {
        roleStats.set(role, {
          role,
          count: 0,
          totalJoins: 0,
          totalTime: 0,
          dailyJoins: 0,
          dailyTime: 0,
          avgJoins: 0,
          avgTime: 0,
          avgDailyJoins: 0,
          avgDailyTime: 0
        });
      }
      
      const stats = roleStats.get(role);
      stats.count += 1;
      stats.totalJoins += activity.voiceJoinCount || 0;
      stats.totalTime += activity.totalVoiceTime || 0;
      stats.dailyJoins += activity.dailyJoinCount || 0;
      stats.dailyTime += activity.dailyVoiceTime || 0;
    });

    // Calculate averages
    roleStats.forEach(stats => {
      stats.avgJoins = stats.count > 0 ? Math.round(stats.totalJoins / stats.count) : 0;
      stats.avgTime = stats.count > 0 ? Math.round(stats.totalTime / stats.count) : 0;
      stats.avgDailyJoins = stats.count > 0 ? Math.round(stats.dailyJoins / stats.count) : 0;
      stats.avgDailyTime = stats.count > 0 ? Math.round(stats.dailyTime / stats.count) : 0;
    });

    // Convert to array and sort by role priority
    const roleStatsArray = Array.from(roleStats.values()).sort((a, b) => {
      const aPriority = RANK_PRIORITY[a.role] || 0;
      const bPriority = RANK_PRIORITY[b.role] || 0;
      return bPriority - aPriority;
    });

    // Get overall statistics
    const overallTotalUsers = voiceActivities.length;
    const overallRealUsers = voiceActivities.filter(a => a.userType === 'real_user').length;
    const overallSuspiciousUsers = voiceActivities.filter(a => a.userType === 'suspicious_user').length;

    return NextResponse.json({
      success: true,
      data: {
        voiceActivities: filteredActivities,
        roleStats: roleStatsArray,
        dailyData,
        statistics: {
          totalUsers: overallTotalUsers,
          realUsers: overallRealUsers,
          suspiciousUsers: overallSuspiciousUsers,
          totalRoles: roleStatsArray.length
        }
      }
    });

  } catch (error) {
    console.error('Get enhanced voice activity by roles error:', error);
    return NextResponse.json(
      { error: 'Failed to get enhanced voice activity data by roles' },
      { status: 500 }
    );
  }
}
