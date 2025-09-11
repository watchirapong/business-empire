import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

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

export async function POST(request: NextRequest) {
  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    }

    const { userIds } = await request.json();

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'User IDs array is required' }, { status: 400 });
    }

    // Fetch nicknames for the provided user IDs
    const nicknameData = await UsernameHistory.find({
      userId: { $in: userIds }
    }).select('userId currentNickname currentUsername currentGlobalName');

    // Create a map of userId -> nickname
    const nicknameMap: { [key: string]: string } = {};
    nicknameData.forEach(user => {
      // Use currentNickname if available, otherwise fall back to currentUsername or currentGlobalName
      const displayName = user.currentNickname || user.currentUsername || user.currentGlobalName || `User ${user.userId.slice(-4)}`;
      nicknameMap[user.userId] = displayName;
    });

    return NextResponse.json({ nicknames: nicknameMap });

  } catch (error) {
    console.error('Error fetching nicknames:', error);
    return NextResponse.json({ error: 'Failed to fetch nicknames' }, { status: 500 });
  }
}
