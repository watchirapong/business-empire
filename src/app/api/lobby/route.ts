import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import LobbyRoom from '@/models/LobbyRoom';

// GET /api/lobby - Get all active lobby rooms
export async function GET(request: NextRequest) {
  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    }
    
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('gameType');
    const status = searchParams.get('status') || 'waiting';
    
    const filter: any = { status };
    if (gameType) {
      filter.gameType = gameType;
    }
    
    const rooms = await LobbyRoom.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    return NextResponse.json({ success: true, rooms });
  } catch (error) {
    console.error('Error fetching lobby rooms:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lobby rooms' },
      { status: 500 }
    );
  }
}

// POST /api/lobby - Create a new lobby room
export async function POST(request: NextRequest) {
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
    
    const body = await request.json();
    const { roomName, description, gameType, maxParticipants, settings } = body;
    
    // Generate unique room ID
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const newRoom = new LobbyRoom({
      roomId,
      roomName: roomName || `Room ${roomId}`,
      description,
      hostId: session.user.id,
      hostName: session.user.username || session.user.name || 'Unknown',
      maxParticipants: maxParticipants || 10,
      gameType: gameType || 'general',
      participants: [{
        userId: session.user.id,
        username: session.user.username || session.user.name || 'Unknown',
        joinedAt: new Date(),
        isReady: false
      }],
      settings: {
        isPrivate: false,
        allowSpectators: true,
        autoStart: false,
        ...settings
      }
    });
    
    await newRoom.save();
    
    return NextResponse.json({ 
      success: true, 
      room: newRoom,
      message: 'Lobby room created successfully' 
    });
  } catch (error) {
    console.error('Error creating lobby room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create lobby room' },
      { status: 500 }
    );
  }
}
