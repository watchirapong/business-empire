import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import LobbyRoom from '@/models/LobbyRoom';

// GET /api/lobby - Get all active lobby rooms
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get('gameType');
    const status = searchParams.get('status') || 'waiting';

    const filter: Record<string, any> = { status };
    if (gameType) {
      filter.gameType = gameType;
    }

    const rooms = await LobbyRoom.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Try to enhance user data with Discord nicknames
    try {
      let EnhancedUser: any;
      try {
        EnhancedUser = mongoose.model('EnhancedUser');
      } catch (error) {
        // Enhanced user model not available
        EnhancedUser = null;
      }

      if (EnhancedUser) {
        // Get all unique user IDs from rooms
        const allUserIds = new Set<string>();
        rooms.forEach((room: any) => {
          if (room.participants) {
            room.participants.forEach((participant: any) => {
              if (participant.userId) {
                allUserIds.add(participant.userId);
              }
            });
          }
        });

        // Get enhanced user data
        const enhancedUsers = await EnhancedUser.find({ discordId: { $in: Array.from(allUserIds) } });
        const enhancedUserMap = new Map();
        enhancedUsers.forEach((user: any) => {
          enhancedUserMap.set(user.discordId, {
            discordNickname: user.discordServerData?.nickname,
            displayName: user.discordServerData?.nickname || user.globalName || user.username
          });
        });

        // Enhance room participants with Discord nicknames
        rooms.forEach(room => {
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
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, gameType, maxPlayers, description } = body;

    if (!name || !gameType) {
      return NextResponse.json(
        { success: false, error: 'Name and game type are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Try to get enhanced user data for the creator
    let creatorDisplayName = session.user.name || 'Unknown';
    let creatorDiscordNickname = null;

    try {
      let EnhancedUser;
      try {
        EnhancedUser = mongoose.model('EnhancedUser');
      } catch (error) {
        // Enhanced user model not available
      }

      if (EnhancedUser) {
        const enhancedUser = await EnhancedUser.findOne({ discordId: (session.user as any).id });
        if (enhancedUser) {
          creatorDisplayName = enhancedUser.discordServerData?.nickname || 
                              enhancedUser.globalName || 
                              enhancedUser.username || 
                              creatorDisplayName;
          creatorDiscordNickname = enhancedUser.discordServerData?.nickname;
        }
      }
    } catch (error) {
      console.error('Error fetching enhanced user data:', error);
    }

    const room = new LobbyRoom({
      name,
      gameType,
      maxPlayers: maxPlayers || 10,
      description: description || '',
      createdBy: {
        userId: (session.user as any).id,
        username: creatorDisplayName,
        discordNickname: creatorDiscordNickname
      },
      participants: [{
        userId: (session.user as any).id,
        username: creatorDisplayName,
        discordNickname: creatorDiscordNickname,
        joinedAt: new Date()
      }],
      status: 'waiting'
    });

    await room.save();

    return NextResponse.json({
      success: true,
      room: room.toObject()
    });

  } catch (error) {
    console.error('Error creating lobby room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create lobby room' },
      { status: 500 }
    );
  }
}

// DELETE /api/lobby - Leave a lobby room
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

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

    // Remove user from participants
    room.participants = room.participants.filter(
      (participant: any) => participant.userId !== (session.user as any).id
    );

    // If no participants left, delete the room
    if (room.participants.length === 0) {
      await LobbyRoom.findByIdAndDelete(roomId);
      return NextResponse.json({
        success: true,
        message: 'Room deleted as no participants remain'
      });
    }

    // If the creator left, assign new creator
    if (room.createdBy.userId === (session.user as any).id) {
      const newCreator = room.participants[0];
      room.createdBy = {
        userId: newCreator.userId,
        username: newCreator.username,
        discordNickname: newCreator.discordNickname
      };
    }

    await room.save();

    return NextResponse.json({
      success: true,
      message: 'Left room successfully'
    });

  } catch (error) {
    console.error('Error leaving lobby room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to leave room' },
      { status: 500 }
    );
  }
}