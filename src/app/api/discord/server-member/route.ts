import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const guildId = searchParams.get('guildId'); // Discord server ID
    const userId = searchParams.get('userId'); // User ID to look up

    if (!guildId || !userId) {
      return NextResponse.json({ error: 'Missing guildId or userId' }, { status: 400 });
    }

    // Get the access token from the session
    const accessToken = (session as any).accessToken;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token available' }, { status: 401 });
    }

    // Check if we have a bot token
    if (!process.env.DISCORD_BOT_TOKEN) {
      return NextResponse.json({ error: 'Discord bot token not configured' }, { status: 500 });
    }

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

    if (!discordResponse.ok) {
      if (discordResponse.status === 404) {
        return NextResponse.json({ 
          error: 'User not found in server',
          member: null 
        }, { status: 404 });
      }
      
      const errorData = await discordResponse.text();
      console.error('Discord API Error:', discordResponse.status, errorData);
      return NextResponse.json({ 
        error: 'Failed to fetch server member data',
        details: errorData 
      }, { status: discordResponse.status });
    }

    const memberData = await discordResponse.json();

    // Also fetch user data to get additional information
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
    }

    // Combine member and user data
    const combinedData = {
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
      }
    };

    return NextResponse.json(combinedData);

  } catch (error) {
    console.error('Error fetching Discord server member:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST method to get member info for the authenticated user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { guildId, userId } = await request.json();
    const authenticatedUserId = (session.user as any).id;

    // Use provided userId or authenticated user's ID
    const targetUserId = userId || authenticatedUserId;

    if (!guildId) {
      return NextResponse.json({ error: 'Missing guildId' }, { status: 400 });
    }

    // Check if we have a bot token
    if (!process.env.DISCORD_BOT_TOKEN) {
      return NextResponse.json({ error: 'Discord bot token not configured' }, { status: 500 });
    }

    // Fetch guild member information for the target user
    const discordResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${targetUserId}`,
      {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!discordResponse.ok) {
      if (discordResponse.status === 404) {
        return NextResponse.json({ 
          error: 'User not found in server',
          member: null 
        }, { status: 404 });
      }
      
      const errorData = await discordResponse.text();
      console.error('Discord API Error:', discordResponse.status, errorData);
      return NextResponse.json({ 
        error: 'Failed to fetch server member data',
        details: errorData 
      }, { status: discordResponse.status });
    }

    const memberData = await discordResponse.json();

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
    }

    // Fetch user data
    const userResponse = await fetch(
      `https://discord.com/api/v10/users/${targetUserId}`,
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
    }

    const combinedData = {
      member: memberData,
      guild: guildData,
      user: userData,
      serverInfo: {
        guildId,
        userId: targetUserId,
        joinedAt: memberData.joined_at,
        roles: memberData.roles || [],
        nick: memberData.nick || null,
        avatar: memberData.avatar || null,
        guildName: guildData?.name || null,
        guildIcon: guildData?.icon || null,
      }
    };

    return NextResponse.json(combinedData);

  } catch (error) {
    console.error('Error fetching Discord server member:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
