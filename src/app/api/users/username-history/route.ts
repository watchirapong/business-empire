import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('MongoDB Connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Username history schema
const usernameHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  usernameHistory: [{
    username: { type: String, required: true },
    globalName: { type: String },
    discriminator: { type: String },
    nickname: { type: String },
    changedAt: { type: Date, default: Date.now }
  }],
  currentUsername: { type: String, required: true },
  currentGlobalName: { type: String },
  currentDiscriminator: { type: String },
  currentNickname: { type: String },
  lastUpdated: { type: Date, default: Date.now }
});

const UsernameHistory = mongoose.models.UsernameHistory || mongoose.model('UsernameHistory', usernameHistorySchema);

// Check if user is admin
const isAdmin = (userId: string) => {
  const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917'];
  return ADMIN_USER_IDS.includes(userId);
};

// GET - Get username history for a user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');
    const currentUserId = (session.user as any).id;

    // Only allow users to view their own history or admins to view any history
    if (!isAdmin(currentUserId) && targetUserId !== currentUserId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const userId = targetUserId || currentUserId;
    await connectDB();

    const history = await UsernameHistory.findOne({ userId });

    if (!history) {
      return NextResponse.json({ 
        message: 'No username history found',
        history: {
          userId,
          usernameHistory: [],
          currentUsername: null,
          currentGlobalName: null,
          currentDiscriminator: null
        }
      });
    }

               return NextResponse.json({ 
             history: {
               userId: history.userId,
               usernameHistory: history.usernameHistory,
               currentUsername: history.currentUsername,
               currentGlobalName: history.currentGlobalName,
               currentDiscriminator: history.currentDiscriminator,
               currentNickname: history.currentNickname,
               lastUpdated: history.lastUpdated
             }
           });

  } catch (error) {
    console.error('Error fetching username history:', error);
    return NextResponse.json({ error: 'Failed to fetch username history' }, { status: 500 });
  }
}

// POST - Update username history (called when user data changes)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, username, globalName, discriminator } = body;

    if (!userId || !username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    // Find existing history or create new one
    let history = await UsernameHistory.findOne({ userId });

    if (!history) {
      // Create new history record
      history = new UsernameHistory({
        userId,
        usernameHistory: [{
          username,
          globalName,
          discriminator,
          changedAt: new Date()
        }],
        currentUsername: username,
        currentGlobalName: globalName,
        currentDiscriminator: discriminator
      });
    } else {
      // Check if username has changed
      if (history.currentUsername !== username || 
          history.currentGlobalName !== globalName || 
          history.currentDiscriminator !== discriminator) {
        
        // Add to history
        history.usernameHistory.push({
          username,
          globalName,
          discriminator,
          changedAt: new Date()
        });

        // Update current values
        history.currentUsername = username;
        history.currentGlobalName = globalName;
        history.currentDiscriminator = discriminator;
        history.lastUpdated = new Date();
      }
    }

    await history.save();

               return NextResponse.json({ 
             message: 'Username history updated successfully',
             history: {
               userId: history.userId,
               usernameHistory: history.usernameHistory,
               currentUsername: history.currentUsername,
               currentGlobalName: history.currentGlobalName,
               currentDiscriminator: history.currentDiscriminator,
               currentNickname: history.currentNickname,
               lastUpdated: history.lastUpdated
             }
           });

  } catch (error) {
    console.error('Error updating username history:', error);
    return NextResponse.json({ error: 'Failed to update username history' }, { status: 500 });
  }
}
