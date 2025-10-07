import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import LobbyRoom from '@/models/LobbyRoom';

// GET /api/admin/lobby - Get all lobby rooms (Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userId = (session.user as any).id;
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('gameType');
    const status = searchParams.get('status');
    
    const filter: any = {};
    if (gameType && gameType !== 'all') {
      filter.gameType = gameType;
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    const rooms = await LobbyRoom.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Try to enhance user data with Discord nicknames
    try {
      let EnhancedUser;
      try {
        EnhancedUser = mongoose.model('EnhancedUser');
      } catch (error) {
        // Enhanced user model not available
      }

      if (EnhancedUser) {
        // Get all unique user IDs from rooms
        const allUserIds = new Set<string>();
        rooms.forEach(room => {
          if (room.participants) {
            room.participants.forEach((participant: any) => {
              if (participant.userId) {
                allUserIds.add(participant.userId);
              }
            });
          }
          if (room.createdBy?.userId) {
            allUserIds.add(room.createdBy.userId);
          }
        });

        // Get enhanced user data
        const enhancedUsers = await EnhancedUser.find({ discordId: { $in: Array.from(allUserIds) } });
        const enhancedUserMap = new Map();
        enhancedUsers.forEach(user => {
          enhancedUserMap.set(user.discordId, {
            discordNickname: user.discordServerData?.nickname,
            displayName: user.discordServerData?.nickname || user.globalName || user.username
          });
        });

        // Enhance room data with Discord nicknames
        rooms.forEach(room => {
          // Enhance creator
          if (room.createdBy?.userId) {
            const enhancedData = enhancedUserMap.get(room.createdBy.userId);
            if (enhancedData) {
              room.createdBy.discordNickname = enhancedData.discordNickname;
              room.createdBy.displayName = enhancedData.displayName;
            }
          }

          // Enhance participants
          if (room.participants) {
            room.participants = room.participants.map((participant: any) => {
              const enhancedData = enhancedUserMap.get(participant.userId);
              if (enhancedData) {
                return {
                  ...participant,
                  discordNickname: enhancedData.discordNickname,
                  displayName: enhancedData.displayName
                };
              }
              return participant;
            });
          }
        });
      }
    } catch (error) {
      console.error('Error enhancing lobby data:', error);
    }

    // Calculate statistics
    const stats = {
      totalRooms: rooms.length,
      waitingRooms: rooms.filter(room => room.status === 'waiting').length,
      activeRooms: rooms.filter(room => room.status === 'active').length,
      finishedRooms: rooms.filter(room => room.status === 'finished').length,
      totalParticipants: rooms.reduce((sum, room) => sum + (room.participants?.length || 0), 0)
    };
    
    return NextResponse.json({ 
      success: true, 
      rooms,
      stats
    });
  } catch (error) {
    console.error('Error fetching admin lobby data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lobby data' },
      { status: 500 }
    );
  }
}

// POST /api/admin/lobby - Start assessment for lobby (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userId = (session.user as any).id;
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { roomId, action } = body;

    if (!roomId || !action) {
      return NextResponse.json(
        { success: false, error: 'Room ID and action are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const room = await LobbyRoom.findById(roomId);
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'start':
        if (room.status !== 'waiting') {
          return NextResponse.json(
            { success: false, error: 'Room is not in waiting status' },
            { status: 400 }
          );
        }
        room.status = 'active';
        room.startedAt = new Date();
        break;
      
      case 'finish':
        if (room.status !== 'active') {
          return NextResponse.json(
            { success: false, error: 'Room is not active' },
            { status: 400 }
          );
        }
        room.status = 'finished';
        room.endedAt = new Date();
        break;
      
      case 'reset':
        room.status = 'waiting';
        room.startedAt = undefined;
        room.endedAt = undefined;
        break;
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    room.updatedAt = new Date();
    await room.save();

    return NextResponse.json({
      success: true,
      message: `Room ${action}ed successfully`,
      room: room.toObject()
    });

  } catch (error) {
    console.error('Error updating lobby room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update room' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/lobby - Remove user from lobby or delete room (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userId = (session.user as any).id;
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const targetUserId = searchParams.get('userId');

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: 'Room ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const room = await LobbyRoom.findById(roomId);
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    if (targetUserId) {
      // Remove specific user from room
      room.participants = room.participants.filter(
        (participant: any) => participant.userId !== targetUserId
      );

      // If no participants left, delete the room
      if (room.participants.length === 0) {
        await LobbyRoom.findByIdAndDelete(roomId);
        return NextResponse.json({
          success: true,
          message: 'Room deleted as no participants remain'
        });
      }

      // If the creator was removed, assign new creator
      if (room.createdBy.userId === targetUserId) {
        const newCreator = room.participants[0];
        room.createdBy = {
          userId: newCreator.userId,
          username: newCreator.username,
          discordNickname: newCreator.discordNickname
        };
      }

      room.updatedAt = new Date();
      await room.save();

      return NextResponse.json({
        success: true,
        message: 'User removed from room successfully'
      });
    } else {
      // Delete entire room
      await LobbyRoom.findByIdAndDelete(roomId);
      return NextResponse.json({
        success: true,
        message: 'Room deleted successfully'
      });
    }

  } catch (error) {
    console.error('Error deleting lobby room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete room' },
      { status: 500 }
    );
  }
}
