import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

export async function DELETE(request: NextRequest) {
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
        if (mongoose.connections[0]?.readyState === 0) {
          await mongoose.connect(process.env.MONGODB_URI!);
        }
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

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Connect to MongoDB if not connected
    if (mongoose.connections[0]?.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    // Define schemas
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

    const CurrencySchema = new mongoose.Schema({
      userId: String,
      hamsterCoins: { type: Number, default: 1000 },
      totalEarned: { type: Number, default: 1000 },
      totalSpent: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

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

    const VoiceSessionSchema = new mongoose.Schema({
      userId: { type: String, required: true },
      username: String,
      globalName: String,
      channelId: String,
      channelName: String,
      joinTime: { type: Date, required: true },
      leaveTime: Date,
      duration: Number,
      createdAt: { type: Date, default: Date.now }
    });

    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Currency = mongoose.models.Currency || mongoose.model('Currency', CurrencySchema);
    const VoiceActivity = mongoose.models.VoiceActivity || mongoose.model('VoiceActivity', VoiceActivitySchema);
    const VoiceSession = mongoose.models.VoiceSession || mongoose.model('VoiceSession', VoiceSessionSchema);

    // Delete user and all related data
    const deleteResults = await Promise.allSettled([
      User.deleteOne({ discordId: targetUserId }),
      Currency.deleteOne({ userId: targetUserId }),
      VoiceActivity.deleteOne({ userId: targetUserId }),
      VoiceSession.deleteMany({ userId: targetUserId })
    ]);

    // Check if any deletion was successful
    const userDeleted = deleteResults[0].status === 'fulfilled' && deleteResults[0].value.deletedCount > 0;
    const currencyDeleted = deleteResults[1].status === 'fulfilled' && deleteResults[1].value.deletedCount > 0;
    const voiceActivityDeleted = deleteResults[2].status === 'fulfilled' && deleteResults[2].value.deletedCount > 0;
    const voiceSessionsDeleted = deleteResults[3].status === 'fulfilled' && deleteResults[3].value.deletedCount > 0;

    return NextResponse.json({
      success: true,
      message: 'User and related data deleted successfully',
      deletedData: {
        user: userDeleted,
        currency: currencyDeleted,
        voiceActivity: voiceActivityDeleted,
        voiceSessions: voiceSessionsDeleted
      }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
