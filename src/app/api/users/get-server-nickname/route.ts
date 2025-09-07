import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    console.log('MongoDB Connected: localhost');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Using direct collection access instead of Mongoose model

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Fetch server member data using direct collection access
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }
    const serverMemberDatas = mongoose.connection.db.collection('servermemberdatas');

    const serverData = await serverMemberDatas.findOne({
      userId: userId,
      serverId: '699984143542517801' // Default server ID
    });

    let nickname = null;
    if (serverData) {
      // The nickname is directly in serverData.nick based on the actual data structure
      nickname = serverData.serverData?.nick;
    }

    return NextResponse.json({
      nickname: nickname,
      userId: userId
    });

  } catch (error) {
    console.error('Error getting server nickname:', error);
    return NextResponse.json({ error: 'Failed to get server nickname' }, { status: 500 });
  }
}