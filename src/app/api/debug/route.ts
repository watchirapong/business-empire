import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Debug endpoint only available in development' }, { status: 403 });
  }
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const userCollection = mongoose.connection.collection('users');
    const users = await userCollection.find({}).limit(10).toArray();

    return NextResponse.json({
      success: true,
      userCount: users.length,
      users: users.map(u => ({
        id: u.discordId,
        username: u.username,
        globalName: u.globalName
      }))
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
