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

const UsernameHistory = mongoose.models.UsernameHistory || mongoose.model('UsernameHistory', usernameHistorySchema);

// POST - Force update username history with current server nickname
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const guildId = '699984143542517801';

    await connectDB();

    // Check if we have a bot token
    if (!process.env.DISCORD_BOT_TOKEN) {
      return NextResponse.json({ error: 'Discord bot token not configured' }, { status: 500 });
    }

    // Fetch current server member data
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
      return NextResponse.json({ 
        error: 'Failed to fetch server member data',
        status: discordResponse.status 
      }, { status: discordResponse.status });
    }

    const memberData = await discordResponse.json();
    const currentNickname = memberData.nick || null;

    // Find existing history or create new one
    let history = await UsernameHistory.findOne({ userId });

    if (!history) {
      // Create new history record with current data
      history = new UsernameHistory({
        userId,
        usernameHistory: [{
          username: (session.user as any).username,
          globalName: (session.user as any).globalName,
          discriminator: (session.user as any).discriminator,
          nickname: currentNickname,
          changedAt: new Date()
        }],
        currentUsername: (session.user as any).username,
        currentGlobalName: (session.user as any).globalName,
        currentDiscriminator: (session.user as any).discriminator,
        currentNickname: currentNickname
      });
    } else {
      // Update current nickname if it's different
      if (history.currentNickname !== currentNickname) {
        // Add current state to history if nickname changed
        if (history.currentNickname !== null) {
          history.usernameHistory.push({
            username: history.currentUsername,
            globalName: history.currentGlobalName,
            discriminator: history.currentDiscriminator,
            nickname: history.currentNickname,
            changedAt: new Date()
          });
        }
        
        // Update current values
        history.currentUsername = (session.user as any).username;
        history.currentGlobalName = (session.user as any).globalName;
        history.currentDiscriminator = (session.user as any).discriminator;
        history.currentNickname = currentNickname;
        history.lastUpdated = new Date();
      }
    }

    await history.save();

    return NextResponse.json({ 
      message: 'Username history updated with current nickname',
      history: {
        userId: history.userId,
        usernameHistory: history.usernameHistory,
        currentUsername: history.currentUsername,
        currentGlobalName: history.currentGlobalName,
        currentDiscriminator: history.currentDiscriminator,
        currentNickname: history.currentNickname,
        lastUpdated: history.lastUpdated
      },
      updated: true
    });

  } catch (error) {
    console.error('Error updating username history:', error);
    return NextResponse.json({ 
      error: 'Failed to update username history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
