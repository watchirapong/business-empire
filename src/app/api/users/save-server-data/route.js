import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected: localhost');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Server Member Data schema
const serverMemberDataSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  serverId: { type: String, required: true },
  serverData: {
    member: {
      user: {
        id: String,
        username: String,
        avatar: String
      },
      nick: String,
      roles: [String],
      joined_at: String
    },
    guild: {
      id: String,
      name: String,
      icon: String
    },
    serverInfo: {
      guildId: String,
      userId: String,
      joinedAt: String,
      roles: [String],
      nick: String,
      avatar: String,
      guildName: String,
      guildIcon: String
    }
  },
  lastUpdated: { type: Date, default: Date.now }
});

// Create compound index for userId and serverId
serverMemberDataSchema.index({ userId: 1, serverId: 1 }, { unique: true });

const ServerMemberData = mongoose.models.ServerMemberData || mongoose.model('ServerMemberData', serverMemberDataSchema);

// Save or update server member data
const saveServerMemberData = async (userId, serverId, serverData) => {
  try {
    const result = await ServerMemberData.findOneAndUpdate(
      { userId, serverId },
      { 
        userId, 
        serverId, 
        serverData,
        lastUpdated: new Date()
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );
    return result;
  } catch (error) {
    console.error('Error saving server member data:', error);
    throw error;
  }
};

export async function POST(request) {
  try {
    await connectDB();
    
    const { userId, serverId, serverData } = await request.json();

    if (!userId || !serverId || !serverData) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, serverId, or serverData' },
        { status: 400 }
      );
    }

    const savedData = await saveServerMemberData(userId, serverId, serverData);

    return NextResponse.json({
      success: true,
      message: 'Server member data saved successfully',
      data: {
        userId: savedData.userId,
        serverId: savedData.serverId,
        lastUpdated: savedData.lastUpdated,
        serverInfo: savedData.serverData.serverInfo
      }
    });

  } catch (error) {
    console.error('Error in save-server-data API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save server member data',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// GET method to retrieve server member data
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const serverId = searchParams.get('serverId');

    if (!userId || !serverId) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId and serverId' },
        { status: 400 }
      );
    }

    const serverData = await ServerMemberData.findOne({ userId, serverId });

    if (!serverData) {
      return NextResponse.json(
        { error: 'Server member data not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: serverData
    });

  } catch (error) {
    console.error('Error in get-server-data API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve server member data',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
