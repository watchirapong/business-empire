import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import DiscordBot from '@/lib/discord-bot';

const connectDB = async () => {
  try {
    if (mongoose.connections[0].readyState) {
      return;
    }
    // Connect to the external MongoDB database
    await mongoose.connect('mongodb://82.26.104.66:27017/business-empire');
    console.log('MongoDB connected successfully to external database');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Server Member Data schema - matches the actual database structure
const serverMemberDataSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  serverId: { type: String, required: true },
  serverData: {
    avatar: String,
    banner: String,
    communication_disabled_until: String,
    flags: Number,
    joined_at: String,
    nick: String,
    pending: Boolean,
    premium_since: String,
    roles: [String],
    unusual_dm_activity_until: String,
    collectibles: mongoose.Schema.Types.Mixed,
    user: {
      id: String,
      username: String,
      avatar: String,
      discriminator: String,
      public_flags: Number,
      flags: Number,
      banner: String,
      accent_color: String,
      global_name: String,
      avatar_decoration_data: mongoose.Schema.Types.Mixed,
      collectibles: mongoose.Schema.Types.Mixed,
      display_name_styles: mongoose.Schema.Types.Mixed,
      banner_color: String,
      clan: mongoose.Schema.Types.Mixed,
      primary_guild: mongoose.Schema.Types.Mixed
    },
    mute: Boolean,
    deaf: Boolean
  },
  lastUpdated: { type: Date, default: Date.now }
}, { strict: false });

const ServerMemberData = mongoose.models.ServerMemberData || mongoose.model('ServerMemberData', serverMemberDataSchema);

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

const VoiceSession = mongoose.models.VoiceSession || mongoose.model('VoiceSession', VoiceSessionSchema);

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
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

    // Get current voice sessions (users who joined but haven't left)
    // Filter out test data and get only the most recent session per user
    const currentVoiceSessions = await VoiceSession.aggregate([
      {
        $match: {
          leaveTime: { $exists: false },
          userId: { $ne: 'test-user-123' } // Filter out test data
        }
      },
      {
        $sort: { joinTime: -1 } // Sort by most recent join time
      },
      {
        $group: {
          _id: '$userId',
          latestSession: { $first: '$$ROOT' } // Get the most recent session per user
        }
      },
      {
        $replaceRoot: { newRoot: '$latestSession' } // Replace root with the session data
      }
    ]);

    if (currentVoiceSessions.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          currentUsers: [],
          totalUsers: 0,
          channels: []
        }
      });
    }

    // Get user IDs for fetching additional data
    const userIds = currentVoiceSessions.map(session => session.userId);
    
    // Get server member data for roles and additional info
    const serverMembers = await ServerMemberData.find({ 
      userId: { $in: userIds },
      serverId: '699984143542517801' 
    });

    // Create a map for quick lookup
    const serverDataMap = new Map();
    serverMembers.forEach(member => {
      serverDataMap.set(member.userId, member);
    });

    // Get today's date range for checking voice activity
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Check which users were in voice chat today
    const todayVoiceActivity = await VoiceSession.find({
      userId: { $in: userIds, $ne: 'test-user-123' }, // Include only real users from current list
      joinTime: { $gte: startOfToday, $lt: endOfToday }
    }).distinct('userId');

    const todayVoiceUsers = new Set(todayVoiceActivity);

    // Combine voice session data with server member data
    const currentUsers = currentVoiceSessions.map(session => {
      const serverData = serverDataMap.get(session.userId);
      const roles = serverData?.serverData?.roles || [];
      const nickname = serverData?.serverData?.nick || session.globalName || session.username;
      const avatar = serverData?.serverData?.user?.avatar ? 
        `https://cdn.discordapp.com/avatars/${session.userId}/${serverData.serverData.user.avatar}.png` :
        session.avatar;
      
      // Calculate time in voice
      const timeInVoice = Math.floor((Date.now() - new Date(session.joinTime).getTime()) / 1000 / 60); // minutes
      
      // Check if user was in voice chat today
      const wasInVoiceToday = todayVoiceUsers.has(session.userId);
      
      return {
        userId: session.userId,
        username: serverData?.serverData?.user?.username || session.username,
        globalName: serverData?.serverData?.user?.global_name || session.globalName,
        nickname: nickname,
        avatar: avatar,
        channelId: session.channelId,
        channelName: session.channelName,
        joinTime: session.joinTime,
        timeInVoice: timeInVoice,
        roles: roles,
        highestRole: getHighestRole(roles),
        isMuted: serverData?.serverData?.mute || false,
        isDeafened: serverData?.serverData?.deaf || false,
        wasInVoiceToday: wasInVoiceToday // New field for today's voice activity
      };
    });

    // Get unique channels
    const channels = [...new Set(currentUsers.map(user => user.channelName))];

    // Get role statistics
    const roleStats = getRoleStatistics(currentUsers);

    return NextResponse.json({
      success: true,
      data: {
        currentUsers,
        totalUsers: currentUsers.length,
        channels,
        roleStats,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching current voice users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch current voice users' },
      { status: 500 }
    );
  }
}

// Helper function to get highest role based on actual Discord server roles
function getHighestRole(roles: string[]): string {
  // Role hierarchy based on actual roles from your Discord server
  const roleHierarchy = [
    '849738417683693638', // Most common role (likely @everyone or main role)
    '1397111512619028551', // Second most common
    '1376806398649700402', // Third most common
    '1408421183409356800', // Fourth most common
    '1410273271588585567', // Fifth most common
    '1170819248038346814', // Sixth most common
    '1170800265566367775', // Seventh most common
    '1392710209608351806', // Eighth most common
    '1413435124955217930', // Ninth most common
    '1170814048229670932', // Tenth most common
  ];

  for (const roleId of roleHierarchy) {
    if (roles.includes(roleId)) {
      return roleId;
    }
  }

  return roles[0] || 'No Role';
}

// Helper function to get role statistics
function getRoleStatistics(users: any[]): { [key: string]: number } {
  const stats: { [key: string]: number } = {};
  
  users.forEach(user => {
    const role = user.highestRole;
    stats[role] = (stats[role] || 0) + 1;
  });

  return stats;
}
