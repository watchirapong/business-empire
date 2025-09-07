import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Game from '@/models/Game';

interface UserProfile {
  id: string;
  username: string;
  discriminator?: string;
  avatar?: string;
  globalName?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('Database connection state:', mongoose.connection.readyState);

    if (mongoose.connection.readyState !== 1) {
      console.log('Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI!);
      console.log('Connected to MongoDB successfully');
    } else {
      console.log('MongoDB already connected');
    }

    // Fetch user basic info from database
    const userCollection = mongoose.connection.collection('users');

    // Debug logging
    console.log('Looking for user ID:', userId);
    console.log('User ID type:', typeof userId);

    // The database stores Discord IDs under 'discordId' field, not 'id'
    const userData = await userCollection.findOne({ discordId: userId });

    if (!userData) {
      console.log('User not found in database for ID:', userId);

      // Try to find any users to see what IDs exist
      const sampleUsers = await userCollection.find({}).limit(3).toArray();
      console.log('Sample users in database:', sampleUsers);

      return NextResponse.json({
        error: 'User not found',
        debug: {
          requestedId: userId,
          sampleUsers: sampleUsers.map(u => ({ discordId: u.discordId || u.id, username: u.username, globalName: u.globalName || u.global_name }))
        }
      }, { status: 404 });
    }

    // Fetch user's nickname from server data
    const serverDataCollection = mongoose.connection.collection('serverdatas');
    const serverData = await serverDataCollection.findOne({ userId: userId });

    // Count user's games
    const gamesCount = await Game.countDocuments({ 'author.userId': userId, isActive: true });

    const user: UserProfile = {
      id: userData.discordId,
      username: userData.username,
      discriminator: userData.discriminator,
      avatar: userData.avatar,
      globalName: userData.globalName
    };

    return NextResponse.json({
      success: true,
      user,
      nickname: serverData?.nickname || null,
      gamesCount
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({
      error: 'Failed to fetch user profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
