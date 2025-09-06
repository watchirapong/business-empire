import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // For now, return the user's Discord username as the server nickname
    // In a real implementation, you would fetch this from Discord API
    const user = session.user as any;
    
    return NextResponse.json({ 
      nickname: user.name || user.username || 'Unknown User',
      userId: userId
    });

  } catch (error) {
    console.error('Error getting server nickname:', error);
    return NextResponse.json({ error: 'Failed to get server nickname' }, { status: 500 });
  }
}