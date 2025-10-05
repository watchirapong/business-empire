import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../config/database';

// GET /api/users/search - Search users
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
        error: 'Search query must be at least 2 characters long' 
      }, { status: 400 });
    }

    const searchRegex = new RegExp(query.trim(), 'i');
    
    // Dynamic import to avoid model compilation issues
    const User = (await import('../../../../../models/User')).default;
    const users = await User.find({
      isActive: true,
      $or: [
        { username: searchRegex },
        { globalName: searchRegex },
        { email: searchRegex }
      ]
    })
    .select('discordId username globalName avatar discriminator')
    .limit(limit)
    .sort({ lastLogin: -1 });

    const formattedUsers = users.map(user => ({
      id: user.discordId,
      username: user.username,
      globalName: user.globalName,
      avatar: user.avatar,
      discriminator: user.discriminator,
      displayName: user.globalName || user.username
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      total: formattedUsers.length
    });

  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
