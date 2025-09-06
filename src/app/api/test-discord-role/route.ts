import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasDiscordRole } from '@/lib/admin-config';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId') || '1388546120912998554'; // Default to Starway role

    console.log(`Testing Discord role validation for user ${userId} with role ${roleId}`);

    // Test the role validation
    const hasRole = await hasDiscordRole(userId, roleId);

    return NextResponse.json({
      success: true,
      userId,
      roleId,
      hasRole,
      message: hasRole ? 'User has the required role' : 'User does not have the required role',
      environment: {
        hasBotToken: !!process.env.DISCORD_BOT_TOKEN,
        guildId: process.env.DISCORD_GUILD_ID || '699984143542517801'
      }
    });

  } catch (error) {
    console.error('Error testing Discord role:', error);
    return NextResponse.json({ 
      error: 'Failed to test Discord role validation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
