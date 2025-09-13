import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import LobbyRoom from '@/models/LobbyRoom';

// POST /api/lobby/[roomId]/join - Join a lobby room
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    }
    
    const { roomId } = await params;
    const room = await LobbyRoom.findOne({ roomId });
    
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }
    
    // Check if room is full
    if (room.participants.length >= room.maxParticipants) {
      return NextResponse.json(
        { success: false, error: 'Room is full' },
        { status: 400 }
      );
    }
    
    // Check if room is still waiting for players
    if (room.status !== 'waiting') {
      return NextResponse.json(
        { success: false, error: 'Room is not accepting new players' },
        { status: 400 }
      );
    }
    
    // Check if user is already in the room
    const existingParticipant = room.participants.find(
      (p: any) => p.userId === session.user.id
    );
    
    if (existingParticipant) {
      return NextResponse.json(
        { success: false, error: 'You are already in this room' },
        { status: 400 }
      );
    }
    
    // Add user to room
    room.participants.push({
      userId: session.user.id,
      username: session.user.username || session.user.name || 'Unknown',
      joinedAt: new Date(),
      isReady: false
    });
    
    await room.save();
    
    return NextResponse.json({ 
      success: true, 
      room,
      message: 'Successfully joined room' 
    });
  } catch (error) {
    console.error('Error joining lobby room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to join lobby room' },
      { status: 500 }
    );
  }
}
