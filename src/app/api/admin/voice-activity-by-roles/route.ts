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
    const filter = searchParams.get('filter'); // 'all', 'real_user', 'suspicious_user'
    const limit = parseInt(searchParams.get('limit') || '50');
    const roleFilter = searchParams.get('roleFilter'); // specific role to filter by

    // Get all voice activities
    let voiceQuery = {};
    if (filter && filter !== 'all') {
      voiceQuery = { userType: filter };
    }

    const voiceActivities = await VoiceActivity.find(voiceQuery)
      .sort({ updatedAt: -1 })
      .limit(limit);

    // Get server member data for all users with voice activity
    const userIds = voiceActivities.map(activity => activity.userId);
    const serverMembers = await ServerMemberData.find({ 
      userId: { $in: userIds },
      serverId: '699984143542517801' 
    });

    // Create a map of userId to server data for quick lookup
    const serverDataMap = new Map();
    serverMembers.forEach(member => {
      serverDataMap.set(member.userId, member);
    });

    // Combine voice activity with role information
    const voiceActivitiesWithRoles = voiceActivities.map(activity => {
      const serverData = serverDataMap.get(activity.userId);
      let roles: string[] = [];
      let rank = 'None';

      if (serverData) {
        // Try to get roles from different possible data structures
        if (serverData.serverData?.roles) {
          roles = serverData.serverData.roles;
        } else if (serverData.serverData?.serverInfo?.roles) {
          roles = serverData.serverData.serverInfo.roles;
        } else if (serverData.serverData?.member?.roles) {
          roles = serverData.serverData.member.roles;
        } else if (serverData.roles) {
          roles = serverData.roles;
        }

        // If no roles found via Mongoose, try direct database query
        if (roles.length === 0) {
          // This would require additional database query, but for now we'll use what we have
        }

        rank = getRankFromRoles(roles);
      }

      return {
        ...activity.toObject(),
        roles,
        rank,
        displayName: activity.globalName || activity.username
      };
    });

    // Filter by role if specified
    let filteredActivities = voiceActivitiesWithRoles;
    if (roleFilter && roleFilter !== 'all') {
      filteredActivities = voiceActivitiesWithRoles.filter(activity => activity.rank === roleFilter);
    }

    // Group by role for statistics
    const roleStats = new Map();
    voiceActivitiesWithRoles.forEach(activity => {
      const role = activity.rank;
      if (!roleStats.has(role)) {
        roleStats.set(role, {
          role,
          count: 0,
          totalJoins: 0,
          totalTime: 0,
          avgJoins: 0,
          avgTime: 0
        });
      }
      
      const stats = roleStats.get(role);
      stats.count += 1;
      stats.totalJoins += activity.voiceJoinCount;
      stats.totalTime += activity.totalVoiceTime;
    });

    // Calculate averages
    roleStats.forEach(stats => {
      stats.avgJoins = stats.count > 0 ? Math.round(stats.totalJoins / stats.count) : 0;
      stats.avgTime = stats.count > 0 ? Math.round(stats.totalTime / stats.count) : 0;
    });

    // Convert to array and sort by role priority
    const roleStatsArray = Array.from(roleStats.values()).sort((a, b) => {
      const aPriority = RANK_PRIORITY[a.role] || 0;
      const bPriority = RANK_PRIORITY[b.role] || 0;
      return bPriority - aPriority;
    });

    // Get overall statistics
    const totalUsers = voiceActivitiesWithRoles.length;
    const realUsers = voiceActivitiesWithRoles.filter(a => a.userType === 'real_user').length;
    const suspiciousUsers = voiceActivitiesWithRoles.filter(a => a.userType === 'suspicious_user').length;

    return NextResponse.json({
      success: true,
      data: {
        voiceActivities: filteredActivities,
        roleStats: roleStatsArray,
        statistics: {
          totalUsers,
          realUsers,
          suspiciousUsers,
          totalRoles: roleStatsArray.length
        }
      }
    });

  } catch (error) {
    console.error('Get voice activity by roles error:', error);
    return NextResponse.json(
      { error: 'Failed to get voice activity data by roles' },
      { status: 500 }
    );
  }
}
