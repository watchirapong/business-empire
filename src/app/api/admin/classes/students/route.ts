import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminWithDB } from '@/lib/admin-config';

// GET - Get students with a specific role
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 });
    }

    const hasAdminAccess = await isAdminWithDB(session.user.id);
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Unauthorized - Not an admin' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

    if (!roleId) {
      return NextResponse.json(
        { error: 'Role ID is required' },
        { status: 400 }
      );
    }

    // Get students with the specified role from Discord
    try {
      if (!process.env.DISCORD_BOT_TOKEN) {
        return NextResponse.json({ error: 'Discord bot token not configured' }, { status: 500 });
      }

      const guildId = process.env.DISCORD_GUILD_ID || '699984143542517801';
      
      // Get all guild members with the specified role
      let allMembers: any[] = [];
      let after = '';
      let hasMore = true;

      while (hasMore) {
        const url = `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000${after ? `&after=${after}` : ''}`;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.error('Failed to fetch guild members:', response.status);
          break;
        }

        const members = await response.json();
        allMembers = allMembers.concat(members);
        
        if (members.length < 1000) {
          hasMore = false;
        } else {
          after = members[members.length - 1].user.id;
        }
      }

      // Filter members who have the specified role
      const studentsWithRole = allMembers.filter(member => 
        member.roles && member.roles.includes(roleId)
      );

      // Transform to the expected format
      const students = studentsWithRole.map(member => ({
        userId: member.user.id,
        username: member.user.username,
        globalName: member.user.global_name || member.user.username,
        discriminator: member.user.discriminator,
        avatar: member.user.avatar,
        nick: member.nick,
        roles: member.roles,
        joinedAt: member.joined_at
      }));

      return NextResponse.json({
        success: true,
        students: students,
        totalCount: students.length
      });

    } catch (error) {
      console.error('Error fetching students with role:', error);
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }

  } catch (error) {
    console.error('Get students error:', error);
    return NextResponse.json(
      { error: 'Failed to load students' },
      { status: 500 }
    );
  }
}
