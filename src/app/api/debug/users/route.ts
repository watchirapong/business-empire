import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
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
