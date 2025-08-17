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

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession();
    const ADMIN_USER_ID = '898059066537029692';

    console.log('Admin search - Session:', session ? 'Found' : 'Not found');
    console.log('Admin search - Session user ID:', (session?.user as any)?.id);
    console.log('Admin search - Expected admin ID:', ADMIN_USER_ID);

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

    if (userId !== ADMIN_USER_ID) {
      return NextResponse.json({ error: 'Unauthorized - Not admin' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    let users;
    
    if (!query || query.trim() === '') {
      // If no query, return all users (limited to 20)
      users = await User.find().limit(20).sort({ createdAt: -1 });
    } else {
      // Search users by username or globalName
      users = await User.find({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { globalName: { $regex: query, $options: 'i' } }
        ]
      }).limit(10);
    }

    return NextResponse.json({
      success: true,
      users: users.map(user => ({
        _id: user._id,
        discordId: user.discordId,
        username: user.username,
        email: user.email,
        globalName: user.globalName,
        avatar: user.avatar,
        createdAt: user.createdAt
      }))
    });

  } catch (error) {
    console.error('Search users error:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}

