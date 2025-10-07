import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';
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
    const userId = (session.user as any).id;
    const isAdminUser = isAdmin(userId);
    
    if (!isAdminUser && targetUserId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const requestedUserId = targetUserId || userId;

    // Get voice activity data
    const voiceData = await DiscordBot.getUserVoiceActivity(requestedUserId);
    const serverInfo = DiscordBot.getServerInfo();

    if (!voiceData) {
      return NextResponse.json({ 
        error: 'Failed to fetch voice activity data',
        message: 'No voice activity found for this user'
      }, { status: 404 });
    }

    // Try to enhance the data with Discord nicknames if available
    try {
      const connectDB = (await import('@/lib/mongodb')).default;
      await connectDB();
      
      const mongoose = await import('mongoose');
      let EnhancedUser;
      
      try {
        EnhancedUser = mongoose.model('EnhancedUser');
        
        const enhancedUser = await EnhancedUser.findOne({ discordId: requestedUserId });
        if (enhancedUser) {
          // Add enhanced display name to voice data
          const displayName = enhancedUser.discordServerData?.nickname || 
                             enhancedUser.globalName || 
                             enhancedUser.username;
          
          if (voiceData.voiceActivity) {
            voiceData.voiceActivity.displayName = displayName;
            voiceData.voiceActivity.discordNickname = enhancedUser.discordServerData?.nickname;
          }
          
          // Update voice sessions with enhanced names
          if (voiceData.voiceSessions && Array.isArray(voiceData.voiceSessions)) {
            voiceData.voiceSessions = voiceData.voiceSessions.map((session: any) => ({
              ...session,
              displayName,
              discordNickname: enhancedUser.discordServerData?.nickname
            }));
          }
        }
      } catch (error) {
        // Enhanced user model not available, use legacy data
        console.log('Enhanced user model not available, using legacy data');
      }
    } catch (error) {
      console.error('Error enhancing voice data:', error);
      // Continue with original data if enhancement fails
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