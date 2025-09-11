import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('MongoDB Connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

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
    }
  },
  lastUpdated: { type: Date, default: Date.now }
});

// Username history schema
const usernameHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  usernameHistory: [{
    username: { type: String, required: true },
    globalName: { type: String },
    discriminator: { type: String },
    nickname: { type: String },
    changedAt: { type: Date, default: Date.now }
  }],
  currentUsername: { type: String, required: true },
  currentGlobalName: { type: String },
  currentDiscriminator: { type: String },
  currentNickname: { type: String },
  lastUpdated: { type: Date, default: Date.now }
});

const ServerMemberData = mongoose.models.ServerMemberData || mongoose.model('ServerMemberData', serverMemberDataSchema);
const UsernameHistory = mongoose.models.UsernameHistory || mongoose.model('UsernameHistory', usernameHistorySchema);

// Check if user is admin
const isAdmin = (userId: string) => {
  const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917', '315548736388333568'];
  return ADMIN_USER_IDS.includes(userId);
};

// POST - Update existing data with username history
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const guildId = '699984143542517801'; // Your server ID

    await connectDB();

    // Check if we have a bot token
    if (!process.env.DISCORD_BOT_TOKEN) {
      return NextResponse.json({ error: 'Discord bot token not configured' }, { status: 500 });
    }

    // Fetch current server member data from Discord API
    const discordResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
      {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!discordResponse.ok) {
      console.error('Discord API Error:', discordResponse.status, await discordResponse.text());
      
      if (discordResponse.status === 404) {
        return NextResponse.json({ 
          error: 'User not found in server. Please make sure you are a member of the Discord server.',
          status: discordResponse.status,
          details: 'The bot cannot find your user in the server. This could be because: 1) You are not a member of the server, 2) The bot does not have permission to view members, 3) The server ID is incorrect.'
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch server member data from Discord',
        status: discordResponse.status,
        details: `Discord API returned status ${discordResponse.status}`
      }, { status: discordResponse.status });
    }

    const memberData = await discordResponse.json();

    // Fetch user data
    const userResponse = await fetch(
      `https://discord.com/api/v10/users/${userId}`,
      {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let userData = null;
    if (userResponse.ok) {
      userData = await userResponse.json();
    } else {
      console.error('Failed to fetch user data:', userResponse.status);
    }

    // Fetch guild information
    const guildResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}`,
      {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let guildData = null;
    if (guildResponse.ok) {
      guildData = await guildResponse.json();
    } else {
      console.error('Failed to fetch guild data:', guildResponse.status);
    }

    // Create enhanced server data
    const enhancedServerData = {
      member: memberData,
      user: userData,
      guild: guildData,
      serverInfo: {
        guildId,
        userId,
        joinedAt: memberData.joined_at,
        roles: memberData.roles || [],
        nick: memberData.nick || null,
        avatar: memberData.avatar || null,
        guildName: guildData?.name || null,
        guildIcon: guildData?.icon || null,
        // Enhanced user information
        username: userData?.username || null,
        globalName: userData?.global_name || null,
        discriminator: userData?.discriminator || null,
        bot: userData?.bot || false,
        system: userData?.system || false,
        mfaEnabled: userData?.mfa_enabled || false,
        banner: userData?.banner || null,
        accentColor: userData?.accent_color || null,
        locale: userData?.locale || null,
        flags: userData?.flags || null,
        premiumType: userData?.premium_type || null,
        publicFlags: userData?.public_flags || null,
      }
    };

    // Update or create server member data
    await ServerMemberData.findOneAndUpdate(
      { userId, serverId: guildId },
      { 
        userId, 
        serverId: guildId, 
        serverData: enhancedServerData,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );

    // Update username history
    if (userData) {
      let history = await UsernameHistory.findOne({ userId });

      if (!history) {
        // Create new history record
        history = new UsernameHistory({
          userId,
          usernameHistory: [{
            username: userData.username,
            globalName: userData.global_name,
            discriminator: userData.discriminator,
            nickname: memberData.nick || null,
            changedAt: new Date()
          }],
          currentUsername: userData.username,
          currentGlobalName: userData.global_name,
          currentDiscriminator: userData.discriminator,
          currentNickname: memberData.nick || null
        });
      } else {
        // Check if username or nickname has changed
        if (history.currentUsername !== userData.username || 
            history.currentGlobalName !== userData.global_name || 
            history.currentDiscriminator !== userData.discriminator ||
            history.currentNickname !== (memberData.nick || null)) {
          
          // Add to history
          history.usernameHistory.push({
            username: userData.username,
            globalName: userData.global_name,
            discriminator: userData.discriminator,
            nickname: memberData.nick || null,
            changedAt: new Date()
          });

          // Update current values
          history.currentUsername = userData.username;
          history.currentGlobalName = userData.global_name;
          history.currentDiscriminator = userData.discriminator;
          history.currentNickname = memberData.nick || null;
          history.lastUpdated = new Date();
        }
      }

      await history.save();
    }

    return NextResponse.json({ 
      message: 'Existing data updated successfully with username history',
      serverData: enhancedServerData,
      updated: true
    });

  } catch (error) {
    console.error('Error updating existing data:', error);
    return NextResponse.json({ 
      error: 'Failed to update existing data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
