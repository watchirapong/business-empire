import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import LobbyRoom from '@/models/LobbyRoom';

// POST /api/lobby/[roomId]/leave - Leave a lobby room
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
    
    // Check if user is in the room
    const participantIndex = room.participants.findIndex(
      (p: any) => p.userId === session.user.id
    );
    
    if (participantIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'You are not in this room' },
        { status: 400 }
      );
    }
    
    // Remove user from room
    room.participants.splice(participantIndex, 1);
    
    // If host left and there are other participants, transfer host to first participant
    if (room.hostId === session.user.id && room.participants.length > 0) {
      const newHost = room.participants[0];
      room.hostId = newHost.userId;
      room.hostName = newHost.username;
    }
    
    // If no participants left, delete the room
    if (room.participants.length === 0) {
      await LobbyRoom.findOneAndDelete({ roomId });
      return NextResponse.json({ 
        success: true,
        message: 'Left room and room was deleted (no participants left)' 
      });
    }
    
    await room.save();
    
    return NextResponse.json({ 
      success: true, 
      room,
      message: 'Successfully left room' 
    });
  } catch (error) {
    console.error('Error leaving lobby room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to leave lobby room' },
      { status: 500 }
    );
  }
}
