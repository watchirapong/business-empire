import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import LobbyRoom from '@/models/LobbyRoom';

// GET /api/lobby/[roomId] - Get specific lobby room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
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
    
    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error('Error fetching lobby room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lobby room' },
      { status: 500 }
    );
  }
}

// PUT /api/lobby/[roomId] - Update lobby room
export async function PUT(
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
    
    // Only host can update room
    if (room.hostId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Only host can update room' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { roomName, description, maxParticipants, settings, status } = body;
    
    const updateData: any = {};
    if (roomName !== undefined) updateData.roomName = roomName;
    if (description !== undefined) updateData.description = description;
    if (maxParticipants !== undefined) updateData.maxParticipants = maxParticipants;
    if (settings !== undefined) updateData.settings = { ...room.settings, ...settings };
    if (status !== undefined) updateData.status = status;
    
    const updatedRoom = await LobbyRoom.findOneAndUpdate(
      { roomId },
      updateData,
      { new: true }
    );
    
    return NextResponse.json({ 
      success: true, 
      room: updatedRoom,
      message: 'Room updated successfully' 
    });
  } catch (error) {
    console.error('Error updating lobby room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update lobby room' },
      { status: 500 }
    );
  }
}

// DELETE /api/lobby/[roomId] - Delete lobby room
export async function DELETE(
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
    
    // Only host can delete room
    if (room.hostId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Only host can delete room' },
        { status: 403 }
      );
    }
    
    await LobbyRoom.findOneAndDelete({ roomId });
    
    return NextResponse.json({ 
      success: true,
      message: 'Room deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting lobby room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete lobby room' },
      { status: 500 }
    );
  }
}
