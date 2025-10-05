import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// Define the user schema
const userSchema = new mongoose.Schema({
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
  isActive: Boolean
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Define the username history schema
const usernameHistorySchema = new mongoose.Schema({
  userId: String,
  usernameHistory: [String],
  currentUsername: String,
  currentDiscriminator: String,
  lastUpdated: Date,
  currentGlobalName: String,
  currentNickname: String
}, { timestamps: true });

const UsernameHistory = mongoose.models.UsernameHistory || mongoose.model('UsernameHistory', usernameHistorySchema);

export async function GET(request: NextRequest) {
  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    }

    // Fetch all active users
    const users = await User.find({ isActive: true })
      .select('discordId username globalName avatar discriminator')
      .sort({ lastLogin: -1 }); // Sort by last login, most recent first

    // Get user IDs for nickname lookup
    const userIds = users.map(user => user.discordId);

    // Fetch nicknames for all users
    const nicknameData = await UsernameHistory.find({
      userId: { $in: userIds }
    }).select('userId currentNickname currentUsername currentGlobalName');

    // Create nickname map
    const nicknameMap: { [key: string]: string } = {};
    nicknameData.forEach(user => {
      const displayName = user.currentNickname || user.currentUsername || user.currentGlobalName || `User ${user.userId.slice(-4)}`;
      nicknameMap[user.userId] = displayName;
    });

    // Combine user data with nicknames
    const usersWithNicknames = users.map(user => {
      // Construct proper Discord avatar URL
      let avatarUrl = null;
      if (user.avatar) {
        const isAnimated = user.avatar.startsWith('a_');
        const extension = isAnimated ? 'gif' : 'png';
        avatarUrl = `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.${extension}`;
      } else {
        // Default Discord avatar based on discriminator
        const defaultAvatarNumber = user.discriminator ? parseInt(user.discriminator) % 5 : 0;
        avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
      }

      return {
        id: user.discordId,
        username: user.username,
        globalName: user.globalName,
        avatar: avatarUrl,
        discriminator: user.discriminator,
        displayName: nicknameMap[user.discordId] || user.globalName || user.username || `User ${user.discordId.slice(-4)}`
      };
    });

    return NextResponse.json({ 
      success: true, 
      users: usersWithNicknames 
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch users' 
    }, { status: 500 });
  }
}
