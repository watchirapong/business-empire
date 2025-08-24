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

// POST - Update username history using session data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const username = (session.user as any).username;
    const globalName = (session.user as any).globalName;
    const discriminator = (session.user as any).discriminator;
    const nickname = null; // Session data doesn't include nickname, only server data does

    if (!userId || !username) {
      return NextResponse.json({ error: 'Missing user data in session' }, { status: 400 });
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
            nickname,
            changedAt: new Date()
          }],
          currentUsername: username,
          currentGlobalName: globalName,
          currentDiscriminator: discriminator,
          currentNickname: nickname
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
            nickname,
            changedAt: new Date()
          });

          // Update current values
          history.currentUsername = username;
          history.currentGlobalName = globalName;
          history.currentDiscriminator = discriminator;
          history.currentNickname = nickname;
          history.lastUpdated = new Date();
        }
      }

    await history.save();

          return NextResponse.json({ 
        message: 'Username history updated successfully using session data',
        history: {
          userId: history.userId,
          usernameHistory: history.usernameHistory,
          currentUsername: history.currentUsername,
          currentGlobalName: history.currentGlobalName,
          currentDiscriminator: history.currentDiscriminator,
          currentNickname: history.currentNickname,
          lastUpdated: history.lastUpdated
        },
        updated: true
      });

  } catch (error) {
    console.error('Error updating username history:', error);
    return NextResponse.json({ 
      error: 'Failed to update username history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
