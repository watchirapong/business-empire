import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Get user's server nickname
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917'];
    const isAdmin = ADMIN_USER_IDS.includes((session.user as any).id);

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');
    
    // Only allow users to get their own nickname or admins to get any nickname
    if (!isAdmin && targetUserId !== (session.user as any).id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const userId = targetUserId || (session.user as any).id;
    const guildId = '699984143542517801'; // Your server ID

    // Check if we have a bot token
    if (!process.env.DISCORD_BOT_TOKEN) {
      return NextResponse.json({ error: 'Discord bot token not configured' }, { status: 500 });
    }

    console.log(`Fetching server member data for user ${userId} in guild ${guildId}`);

    // Fetch guild member information from Discord API
    const discordResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
      {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`Discord API response status: ${discordResponse.status}`);

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error('Discord API Error:', discordResponse.status, errorText);
      
      if (discordResponse.status === 404) {
        return NextResponse.json({ 
          error: 'User not found in server',
          details: 'The bot cannot find your user in the server. Please make sure you are a member of the Discord server.',
          status: discordResponse.status
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch server member data',
        status: discordResponse.status,
        details: errorText
      }, { status: discordResponse.status });
    }

    const memberData = await discordResponse.json();
    console.log('Member data received:', JSON.stringify(memberData, null, 2));

    // Extract nickname and other relevant data
    const nickname = memberData.nick || null;
    const roles = memberData.roles || [];
    const joinedAt = memberData.joined_at;
    const avatar = memberData.avatar || null;

    // Fetch guild information to get server name
    const guildResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}`,
      {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let guildName = 'Unknown Server';
    let guildIcon = null;
    
    if (guildResponse.ok) {
      const guildData = await guildResponse.json();
      guildName = guildData.name || 'Unknown Server';
      guildIcon = guildData.icon || null;
    }

    return NextResponse.json({ 
      success: true,
      nickname: nickname,
      roles: roles,
      joinedAt: joinedAt,
      avatar: avatar,
      guildId: guildId,
      guildName: guildName,
      guildIcon: guildIcon,
      userId: userId,
      message: nickname ? `Found nickname: ${nickname}` : 'No nickname set in server'
    });

  } catch (error) {
    console.error('Error fetching server nickname:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch server nickname',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
