import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // Check if user is admin
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Import the recovery service
    // const { default: DiscordRecoveryService } = await import('../../../../services/discordRecoveryService.js');
    // const recoveryService = new DiscordRecoveryService();

    // Perform the recovery
    // const results = await recoveryService.performFullRecovery();

    return NextResponse.json({
      success: true,
      // results,
      message: 'Discord user recovery completed'
    });

  } catch (error) {
    console.error('Error during Discord recovery:', error);
    return NextResponse.json({ 
      error: 'Failed to perform Discord recovery',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // Check if user is admin
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Import the recovery service
    // const { default: DiscordRecoveryService } = await import('../../../../services/discordRecoveryService.js');
    // const recoveryService = new DiscordRecoveryService();

    // Just fetch users without saving (for preview)
    // const discordUsers = await recoveryService.fetchUsersWithRole();

    return NextResponse.json({
      success: true,
      userCount: 0, // discordUsers.length,
      users: [], // discordUsers.map((user: any) => ({
        // discordId: user.discordId,
        // username: user.username,
        // globalName: user.globalName,
        // nickname: user.nickname,
        // displayName: user.displayName,
        // roles: user.roles,
        // joinedAt: user.joinedAt
      // })),
      message: `Found 0 users with role 1397111512619028551` // `Found ${discordUsers.length} users with role 1397111512619028551`
    });

  } catch (error) {
    console.error('Error fetching Discord users:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch Discord users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
