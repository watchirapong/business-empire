import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import Game from '@/models/Game';

export async function GET(request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await params;

    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
    }

    const game = await Game.findById(gameId).select('comments');
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      comments: game.comments
    });

  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId } = await params;
    const { content } = await request.json();

    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'Comment too long (max 500 characters)' }, { status: 400 });
    }

    const game = await Game.findById(gameId);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Fetch user server data to get nickname
    let nickname = null;
    try {
      const userResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/users/get-server-nickname?userId=${(session.user as any).id}`, {
        method: 'GET',
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        nickname = userData.nickname || null;
      }
    } catch (error) {
      console.error('Error fetching user server data:', error);
    }

    const newComment = {
      userId: (session.user as any).id || session.user.email,
      username: nickname || session.user.name || 'Unknown',
      avatar: session.user.image,
      content: content.trim(),
      createdAt: new Date()
    };

    game.comments.push(newComment);
    await game.save();

    return NextResponse.json({
      success: true,
      comment: newComment
    });

  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}
