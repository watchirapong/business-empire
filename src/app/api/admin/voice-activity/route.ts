import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

const VoiceActivity = mongoose.models.VoiceActivity || mongoose.model('VoiceActivity', VoiceActivitySchema);

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018'];

    if (!session) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Try to get user ID from session
    let userId = (session.user as any)?.id;
    
    // If no user ID in session, try to get it from email
    if (!userId && session.user?.email) {
      try {
        await connectDB();
        const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
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
        }));
        
        const user = await User.findOne({ email: session.user.email });
        if (user) {
          userId = user.discordId;
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
    const filter = searchParams.get('filter'); // 'all', 'real_user', 'suspicious_user'
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = {};
    if (filter && filter !== 'all') {
      query = { userType: filter };
    }

    const voiceActivities = await VoiceActivity.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit);

    // Get statistics
    const totalUsers = await VoiceActivity.countDocuments();
    const realUsers = await VoiceActivity.countDocuments({ userType: 'real_user' });
    const suspiciousUsers = await VoiceActivity.countDocuments({ userType: 'suspicious_user' });

    const stats = await VoiceActivity.aggregate([
      {
        $group: {
          _id: '$userType',
          count: { $sum: 1 },
          totalJoins: { $sum: '$voiceJoinCount' },
          totalTime: { $sum: '$totalVoiceTime' },
          avgJoins: { $avg: '$voiceJoinCount' },
          avgTime: { $avg: '$totalVoiceTime' }
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        voiceActivities,
        statistics: {
          totalUsers,
          realUsers,
          suspiciousUsers,
          breakdown: stats
        }
      }
    });

  } catch (error) {
    console.error('Get voice activity error:', error);
    return NextResponse.json(
      { error: 'Failed to get voice activity data' },
      { status: 500 }
    );
  }
}
