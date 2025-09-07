import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import Game from '@/models/Game';

export async function POST(request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { gameId } = await params;
    const userId = (session.user as any).id || session.user.email;
    const username = session.user.name || 'Unknown';

    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
    }

    const game = await Game.findById(gameId);
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Check if user already liked this game
    const existingLikeIndex = game.likes.findIndex((like: any) => like.userId === userId);

    if (existingLikeIndex > -1) {
      // User already liked, so unlike
      game.likes.splice(existingLikeIndex, 1);
      await game.save();

      return NextResponse.json({
        success: true,
        action: 'unliked',
        likesCount: game.likes.length
      });
    } else {
      // User hasn't liked, so add like
      game.likes.push({
        userId,
        username,
        createdAt: new Date()
      });
      await game.save();

      return NextResponse.json({
        success: true,
        action: 'liked',
        likesCount: game.likes.length
      });
    }

  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    );
  }
}
