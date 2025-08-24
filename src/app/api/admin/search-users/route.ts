import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connections[0].readyState) {
    console.log('MongoDB already connected');
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('MongoDB connected successfully');
};

// User Schema
const UserSchema = new mongoose.Schema({
  discordId: String,
  username: String,
  email: String,
  avatar: String,
  discriminator: String,
  globalName: String,
  accessToken: String,
  refreshToken: String,
  lastLogin: Date,
  loginCount: Number,
  isActive: Boolean,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Voice Activity Schema
const VoiceActivitySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: String,
  globalName: String,
  avatar: String,
  voiceJoinCount: { type: Number, default: 0 },
  totalVoiceTime: { type: Number, default: 0 },
  lastVoiceJoin: Date,
  lastVoiceLeave: Date,
  userType: { type: String, enum: ['real_user', 'suspicious_user'], default: 'suspicious_user' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Username History Schema
const UsernameHistorySchema = new mongoose.Schema({
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

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const VoiceActivity = mongoose.models.VoiceActivity || mongoose.model('VoiceActivity', VoiceActivitySchema);
const UsernameHistory = mongoose.models.UsernameHistory || mongoose.model('UsernameHistory', UsernameHistorySchema);

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession();
    const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917'];

    console.log('Admin search - Session:', session ? 'Found' : 'Not found');
    console.log('Admin search - Session user ID:', (session?.user as any)?.id);
    console.log('Admin search - Expected admin IDs:', ADMIN_USER_IDS);

    if (!session) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Try to get user ID from session
    let userId = (session.user as any)?.id;
    
    // If no user ID in session, try to get it from email
    if (!userId && session.user?.email) {
      try {
        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (user) {
          userId = user.discordId;
          console.log('Admin search - Found user ID from email:', userId);
        }
      } catch (error) {
        console.error('Error finding user by email:', error);
      }
    }

    if (!ADMIN_USER_IDS.includes(userId)) {
      return NextResponse.json({ error: 'Unauthorized - Not admin' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    let combinedUsers: any[] = [];
    
    if (!query || query.trim() === '') {
      // If no query, return all users from both collections
      
      // Get users from users collection
      const users = await User.find().limit(1000).sort({ createdAt: -1 });
      
      // Get users from voice activity collection who might not be in users collection
      const voiceActivities = await VoiceActivity.find().limit(1000).sort({ updatedAt: -1 });
      
      // Create a map of existing user IDs to avoid duplicates
      const existingUserIds = new Set(users.map(user => user.discordId));
      
      // Add users from users collection
      combinedUsers = users.map(user => ({
        _id: user._id,
        discordId: user.discordId,
        username: user.username,
        email: user.email,
        globalName: user.globalName,
        avatar: user.avatar,
        createdAt: user.createdAt,
        source: 'users' as const,
        hasVoiceActivity: false,
        voiceJoinCount: 0,
        totalVoiceTime: 0,
        currentNickname: undefined as string | undefined
      }));
      
      // Add users from voice activity who aren't in users collection
      for (const voiceActivity of voiceActivities) {
        if (!existingUserIds.has(voiceActivity.userId)) {
          combinedUsers.push({
            _id: voiceActivity._id,
            discordId: voiceActivity.userId,
            username: voiceActivity.username,
            email: null,
            globalName: voiceActivity.globalName,
            avatar: voiceActivity.avatar,
            createdAt: voiceActivity.createdAt,
            source: 'voice_activity' as const,
            hasVoiceActivity: true,
            voiceJoinCount: voiceActivity.voiceJoinCount,
            totalVoiceTime: voiceActivity.totalVoiceTime,
            currentNickname: undefined as string | undefined
          });
        } else {
          // Mark existing users as having voice activity
          const existingUser = combinedUsers.find(u => u.discordId === voiceActivity.userId);
          if (existingUser) {
            existingUser.hasVoiceActivity = true;
            existingUser.voiceJoinCount = voiceActivity.voiceJoinCount;
            existingUser.totalVoiceTime = voiceActivity.totalVoiceTime;
          }
        }
      }
      
    } else {
      // Search with query across multiple fields including nicknames
      
      // Search in users collection
      const users = await User.find({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { globalName: { $regex: query, $options: 'i' } }
        ]
      }).limit(100);
      
      // Search in voice activity collection
      const voiceActivities = await VoiceActivity.find({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { globalName: { $regex: query, $options: 'i' } }
        ]
      }).limit(100);
      
      // Search in username history (nicknames)
      const usernameHistories = await UsernameHistory.find({
        $or: [
          { currentNickname: { $regex: query, $options: 'i' } },
          { currentUsername: { $regex: query, $options: 'i' } },
          { currentGlobalName: { $regex: query, $options: 'i' } }
        ]
      }).limit(100);
      
      // Combine results and remove duplicates
      const userIds = new Set();
      
      // Add users from users collection
      for (const user of users) {
        if (!userIds.has(user.discordId)) {
          userIds.add(user.discordId);
          combinedUsers.push({
            _id: user._id,
            discordId: user.discordId,
            username: user.username,
            email: user.email,
            globalName: user.globalName,
            avatar: user.avatar,
            createdAt: user.createdAt,
            source: 'users' as const,
            hasVoiceActivity: false,
            voiceJoinCount: 0,
            totalVoiceTime: 0,
            currentNickname: undefined as string | undefined
          });
        }
      }
      
      // Add users from voice activity
      for (const voiceActivity of voiceActivities) {
        if (!userIds.has(voiceActivity.userId)) {
          userIds.add(voiceActivity.userId);
          combinedUsers.push({
            _id: voiceActivity._id,
            discordId: voiceActivity.userId,
            username: voiceActivity.username,
            email: null,
            globalName: voiceActivity.globalName,
            avatar: voiceActivity.avatar,
            createdAt: voiceActivity.createdAt,
            source: 'voice_activity' as const,
            hasVoiceActivity: true,
            voiceJoinCount: voiceActivity.voiceJoinCount,
            totalVoiceTime: voiceActivity.totalVoiceTime,
            currentNickname: undefined as string | undefined
          });
        } else {
          // Update existing user with voice activity data
          const existingUser = combinedUsers.find(u => u.discordId === voiceActivity.userId);
          if (existingUser) {
            existingUser.hasVoiceActivity = true;
            existingUser.voiceJoinCount = voiceActivity.voiceJoinCount;
            existingUser.totalVoiceTime = voiceActivity.totalVoiceTime;
          }
        }
      }
      
      // Add users found by nickname
      for (const history of usernameHistories) {
        if (!userIds.has(history.userId)) {
          userIds.add(history.userId);
          
          // Try to find the user in users collection
          const user = await User.findOne({ discordId: history.userId });
          const voiceActivity = await VoiceActivity.findOne({ userId: history.userId });
          
          if (user) {
            combinedUsers.push({
              _id: user._id,
              discordId: user.discordId,
              username: user.username,
              email: user.email,
              globalName: user.globalName,
              avatar: user.avatar,
              createdAt: user.createdAt,
              source: 'users' as const,
              hasVoiceActivity: !!voiceActivity,
              voiceJoinCount: voiceActivity?.voiceJoinCount || 0,
              totalVoiceTime: voiceActivity?.totalVoiceTime || 0,
              currentNickname: history.currentNickname
            });
          } else if (voiceActivity) {
            combinedUsers.push({
              _id: voiceActivity._id,
              discordId: voiceActivity.userId,
              username: voiceActivity.username,
              email: null,
              globalName: voiceActivity.globalName,
              avatar: voiceActivity.avatar,
              createdAt: voiceActivity.createdAt,
              source: 'voice_activity' as const,
              hasVoiceActivity: true,
              voiceJoinCount: voiceActivity.voiceJoinCount,
              totalVoiceTime: voiceActivity.totalVoiceTime,
              currentNickname: history.currentNickname
            });
          }
        } else {
          // Add nickname to existing user
          const existingUser = combinedUsers.find(u => u.discordId === history.userId);
          if (existingUser) {
            existingUser.currentNickname = history.currentNickname;
          }
        }
      }
    }
    
    // Sort by creation date (newest first) and limit results
    combinedUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    combinedUsers = combinedUsers.slice(0, 1000);

    return NextResponse.json({
      success: true,
      users: combinedUsers,
      totalFound: combinedUsers.length
    });

  } catch (error) {
    console.error('Search users error:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}

