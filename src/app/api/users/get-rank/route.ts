import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    await connectDB();

    // Get server member data for HamsterHub server (ID: 699984143542517801)
    const serverData = await ServerMemberData.findOne({ 
      userId, 
      serverId: '699984143542517801' 
    });

    if (!serverData) {
      console.log('No server data found for user:', userId);
      return NextResponse.json({ 
        success: true, 
        rank: 'None',
        displayName: 'None',
        roles: []
      });
    }

    console.log('Server data found:', JSON.stringify(serverData, null, 2));

    // Check different possible data structures
    let roles: string[] = [];
    
    // Try to get roles from Mongoose model first
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
      try {
        const db = mongoose.connection.db;
        if (db) {
          const rawData = await db.collection('servermemberdatas').findOne({ 
            userId, 
            serverId: '699984143542517801' 
          });
          if (rawData?.serverData?.roles) {
            roles = rawData.serverData.roles;
          }
        }
      } catch (error) {
        console.error('Error in direct database query:', error);
      }
    }

    console.log('Found roles:', roles);
    
    // If no roles, return None
    if (roles.length === 0) {
          return NextResponse.json({
      success: true,
      rank: 'None',
      displayName: 'None',
      roles: []
    });
    }

    // Find the highest priority role that the user has
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

    return NextResponse.json({
      success: true,
      rank: highestRank,
      displayName: highestRank,
      roles: roles
    });

  } catch (error) {
    console.error('Error getting user rank:', error);
    return NextResponse.json({ 
      error: 'Failed to get user rank',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
