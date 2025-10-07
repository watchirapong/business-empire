import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { isAdmin } from '@/lib/admin-config';

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Try to get user ID from session
    const userId = (session.user as any)?.id;
    
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Unauthorized - Not admin' }, { status: 401 });
    }

    await connectDB();
    
    const mongoose = await import('mongoose');

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
          _id: null,
          totalVoiceTime: { $sum: '$totalVoiceTime' },
          totalJoins: { $sum: '$voiceJoinCount' },
          avgVoiceTime: { $avg: '$totalVoiceTime' },
          avgJoins: { $avg: '$voiceJoinCount' }
        }
      }
    ]);

    // Try to get enhanced user data for better display names
    let EnhancedUser: any;
    try {
      EnhancedUser = mongoose.model('EnhancedUser');
    } catch (error) {
      // Enhanced user model not available
    }

    // Enhance voice activities with better display names
    const enhancedVoiceActivities = await Promise.all(
      voiceActivities.map(async (activity: any) => {
        let displayName = activity.username;
        let discordNickname = null;

        if (EnhancedUser) {
          try {
            const enhancedUser = await EnhancedUser.findOne({ discordId: activity.userId });
            if (enhancedUser) {
              displayName = enhancedUser.discordServerData?.nickname || 
                           enhancedUser.globalName || 
                           enhancedUser.username || 
                           activity.username;
              discordNickname = enhancedUser.discordServerData?.nickname;
            }
          } catch (error) {
            console.error('Error fetching enhanced user data:', error);
          }
        }

        return {
          ...activity.toObject(),
          displayName,
          discordNickname,
          source: EnhancedUser ? 'enhanced' : 'legacy'
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        voiceActivities: enhancedVoiceActivities,
        statistics: {
          totalUsers,
          realUsers,
          suspiciousUsers,
          totalVoiceTime: stats[0]?.totalVoiceTime || 0,
          totalJoins: stats[0]?.totalJoins || 0,
          avgVoiceTime: Math.round(stats[0]?.avgVoiceTime || 0),
          avgJoins: Math.round(stats[0]?.avgJoins || 0)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching voice activity:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch voice activity',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}