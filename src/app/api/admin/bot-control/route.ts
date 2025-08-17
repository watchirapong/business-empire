import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { startDiscordBot, stopDiscordBot, getBot } from '@/lib/start-bot';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession();
    const ADMIN_USER_ID = '898059066537029692';

    if (!session) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Try to get user ID from session
    let userId = (session.user as any)?.id;
    
    // If no user ID in session, try to get it from email
    if (!userId && session.user?.email) {
      try {
        if (mongoose.connections[0]?.readyState === 0) {
          await mongoose.connect(process.env.MONGODB_URI!);
        }
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

    if (userId !== ADMIN_USER_ID) {
      return NextResponse.json({ error: 'Unauthorized - Not admin' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // 'start' or 'stop'

    if (action === 'start') {
      const bot = await startDiscordBot();
      return NextResponse.json({
        success: true,
        message: 'Discord bot started successfully',
        isRunning: bot?.isBotConnected() || false
      });
    } else if (action === 'stop') {
      await stopDiscordBot();
      return NextResponse.json({
        success: true,
        message: 'Discord bot stopped successfully',
        isRunning: false
      });
    } else if (action === 'status') {
      const bot = getBot();
      return NextResponse.json({
        success: true,
        isRunning: bot?.isBotConnected() || false
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Bot control error:', error);
    return NextResponse.json(
      { error: 'Failed to control bot' },
      { status: 500 }
    );
  }
}