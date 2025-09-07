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
    const { color } = body;

    // Validate hex color format
    if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json({ error: 'Invalid hex color format' }, { status: 400 });
    }

    // Update game color
    const updatedGame = await Game.findByIdAndUpdate(
      gameId,
      { color },
      { new: true }
    );

    if (!updatedGame) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    console.log(`Color updated for game ${gameId}: ${color}`);

    return NextResponse.json({
      success: true,
      message: 'Color updated successfully',
      game: {
        _id: updatedGame._id,
        color: updatedGame.color
      }
    });

  } catch (error) {
    console.error('Error updating game color:', error);
    return NextResponse.json(
      { error: 'Failed to update game color' },
      { status: 500 }
    );
  }
}
