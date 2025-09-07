import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import Game from '@/models/Game';
import { isAdmin } from '@/lib/admin-config';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userId = (session.user as any).id || session.user.email;
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { gameId } = await params;

    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return NextResponse.json({ error: 'Invalid game ID' }, { status: 400 });
    }

    const body = await request.json();
    const { priority } = body;

    // Validate priority (0-100)
    if (typeof priority !== 'number' || priority < 0 || priority > 100) {
      return NextResponse.json({ error: 'Priority must be a number between 0 and 100' }, { status: 400 });
    }

    // Update game priority
    const updatedGame = await Game.findByIdAndUpdate(
      gameId,
      { priority },
      { new: true }
    );

    if (!updatedGame) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    console.log(`Priority updated for game ${gameId}: ${priority}`);

    return NextResponse.json({
      success: true,
      message: 'Priority updated successfully',
      game: {
        _id: updatedGame._id,
        priority: updatedGame.priority
      }
    });

  } catch (error) {
    console.error('Error updating game priority:', error);
    return NextResponse.json(
      { error: 'Failed to update game priority' },
      { status: 500 }
    );
  }
}
