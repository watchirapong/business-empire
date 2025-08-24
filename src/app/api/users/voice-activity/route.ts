import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import DiscordBot from '@/lib/discord-bot';

// GET - Get user's voice activity
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');
    
    // Users can only get their own voice activity or admins can get any
    const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917'];
    const isAdmin = ADMIN_USER_IDS.includes((session.user as any).id);
    
    if (!isAdmin && targetUserId !== (session.user as any).id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const userId = targetUserId || (session.user as any).id;

    // Get voice activity data
    const voiceData = await DiscordBot.getUserVoiceActivity(userId);
    const serverInfo = DiscordBot.getServerInfo();

    if (!voiceData) {
      return NextResponse.json({ 
        error: 'Failed to fetch voice activity data',
        message: 'No voice activity found for this user'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...voiceData,
        serverInfo
      }
    });

  } catch (error) {
    console.error('Error fetching voice activity:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch voice activity',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
