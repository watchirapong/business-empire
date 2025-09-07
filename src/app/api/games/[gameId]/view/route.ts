import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Game from '@/models/Game';

export async function POST(request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const { gameId } = await params;

    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
    }

    // Find and update the game with incremented view count
    const updatedGame = await Game.findByIdAndUpdate(
      gameId,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!updatedGame) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    console.log(`View count incremented for game ${gameId}: ${updatedGame.views}`);

    return NextResponse.json({
      success: true,
      message: 'View count incremented',
      views: updatedGame.views
    });

  } catch (error) {
    console.error('Error incrementing view count:', error);
    return NextResponse.json(
      { error: 'Failed to increment view count' },
      { status: 500 }
    );
  }
}
