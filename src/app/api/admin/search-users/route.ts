import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin, isAdminWithDB } from '@/lib/admin-config';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);

    console.log('Admin search - Session:', session ? 'Found' : 'Not found');
    console.log('Admin search - Session user ID:', (session?.user as any)?.id);
    console.log('Admin search - Full session user:', JSON.stringify(session?.user, null, 2));

    if (!session) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Try to get user ID from session - check multiple possible locations
    const userId = (session.user as any)?.id || 
                 (session.user as any)?.discordId || 
                 (session as any)?.user?.id ||
                 (session as any)?.user?.discordId;
    
    console.log('Admin search - Extracted userId:', userId);
    
    if (!userId) {
      return NextResponse.json({ error: 'No user ID found in session' }, { status: 401 });
    }
    
    // Check admin status using both hardcoded and database admins
    const isUserAdmin = await isAdminWithDB(userId);
    console.log('Admin search - Admin check result:', isUserAdmin);
    
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Not admin' }, { status: 401 });
    }

    await connectDB();
    
    const mongoose = await import('mongoose');
    
    // Try to use enhanced user model first, fallback to legacy system
    let EnhancedUser;
    let User;
    let VoiceActivity;
    let UsernameHistory;
    let VoiceSession;
    let ServerMemberData;
    
    try {
      // Try to get enhanced user model
      EnhancedUser = mongoose.model('EnhancedUser');
      console.log('Using Enhanced User model for admin search');
    } catch (error) {
      // Fallback to legacy models
      User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
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
      }, { timestamps: true }));
      
      VoiceActivity = mongoose.models.VoiceActivity || mongoose.model('VoiceActivity', new mongoose.Schema({
        userId: String,
        username: String,
        globalName: String,
        avatar: String,
        voiceJoinCount: { type: Number, default: 0 },
        totalVoiceTime: { type: Number, default: 0 },
        lastVoiceJoin: Date,
        lastVoiceLeave: Date
      }, { timestamps: true }));
      
      UsernameHistory = mongoose.models.UsernameHistory || mongoose.model('UsernameHistory', new mongoose.Schema({
        userId: String,
        usernameHistory: [String],
        currentUsername: String,
        currentDiscriminator: String,
        lastUpdated: Date,
        currentGlobalName: String,
        currentNickname: String
      }, { timestamps: true }));
      
      VoiceSession = mongoose.models.VoiceSession || mongoose.model('VoiceSession', new mongoose.Schema({
        userId: String,
        channelName: String,
        joinTime: Date,
        leaveTime: Date,
        duration: Number
      }, { timestamps: true }));
      
      ServerMemberData = mongoose.models.ServerMemberData || mongoose.model('ServerMemberData', new mongoose.Schema({
        userId: String,
        serverData: {
          roles: [String],
          nick: String,
          joinedAt: Date
        }
      }, { timestamps: true }));
      
      console.log('Using legacy models for admin search');
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    let combinedUsers: any[] = [];
    
    if (EnhancedUser) {
      // Use enhanced user model
      let users;
      
      if (!query || query.trim() === '') {
        // Get all users
        users = await EnhancedUser.find({})
          .sort({ createdAt: -1 })
          .limit(1000);
      } else {
        // Search with query
        users = await EnhancedUser.find({
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { globalName: { $regex: query, $options: 'i' } },
            { 'discordServerData.nickname': { $regex: query, $options: 'i' } },
            { 'discordServerData.displayName': { $regex: query, $options: 'i' } }
          ]
        })
        .sort({ createdAt: -1 })
        .limit(1000);
      }

      // Transform enhanced users to the expected format
      combinedUsers = users.map((user: any) => {
        const displayName = user.discordServerData?.nickname || 
                           user.globalName || 
                           user.username || 
                           `User${user.discordId.slice(-4)}`;

        return {
          _id: user._id,
          discordId: user.discordId,
          username: displayName,
          email: user.email,
          globalName: user.globalName,
          avatar: user.avatar,
          createdAt: user.createdAt,
          source: 'enhanced' as const,
          hasVoiceActivity: false, // Enhanced model doesn't have voice activity yet
          voiceJoinCount: 0,
          totalVoiceTime: 0,
          currentNickname: user.discordServerData?.nickname,
          // Enhanced user data
          discordNickname: user.discordServerData?.nickname,
          displayName: user.discordServerData?.displayName || displayName,
          roles: user.discordServerData?.roles || [],
          roleCount: user.discordServerData?.roles?.length || 0,
          // Currency data
          currency: user.currency || {
            hamsterCoins: 0,
            totalEarned: 0,
            totalSpent: 0
          },
          // Voice activity (placeholder for now)
          isCurrentlyInVoice: false,
          wasInVoiceToday: false,
          currentVoiceChannel: null,
          currentVoiceJoinTime: null,
          timeInCurrentVoice: 0
        };
      });

    } else {
      // Legacy system - use separate models
      if (!query || query.trim() === '') {
        // If no query, return all users from both collections
        combinedUsers = [];
        
        // Get users from users collection
        const users = User ? await User.find().limit(1000).sort({ createdAt: -1 }) : [];
        
        // Get users from voice activity collection who might not be in users collection
        const voiceActivities = VoiceActivity ? await VoiceActivity.find().limit(1000).sort({ updatedAt: -1 }) : [];
        
        // Create a map of existing user IDs to avoid duplicates
        const existingUserIds = new Set(users.map((user: any) => user.discordId));
        
        // Add users from users collection
        combinedUsers = users.map((user: any) => ({
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
        const users = User ? await User.find({
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { globalName: { $regex: query, $options: 'i' } }
          ]
        }).limit(100) : [];
        
        // Search in voice activity collection
        const voiceActivities = VoiceActivity ? await VoiceActivity.find({
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { globalName: { $regex: query, $options: 'i' } }
          ]
        }).limit(100) : [];
        
        // Search in username history (nicknames and historical usernames)
        const usernameHistories = UsernameHistory ? await UsernameHistory.find({
          $or: [
            { currentNickname: { $regex: query, $options: 'i' } },
            { currentUsername: { $regex: query, $options: 'i' } },
            { currentGlobalName: { $regex: query, $options: 'i' } },
            { 'usernameHistory.username': { $regex: query, $options: 'i' } },
            { 'usernameHistory.globalName': { $regex: query, $options: 'i' } },
            { 'usernameHistory.nickname': { $regex: query, $options: 'i' } }
          ]
        }).limit(100) : [];
        
        // Combine results and remove duplicates
        const userIds = new Set();
        combinedUsers = [];
        
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
            const user = User ? await User.findOne({ discordId: history.userId }) : null;
            const voiceActivity = VoiceActivity ? await VoiceActivity.findOne({ userId: history.userId }) : null;
            
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
    }
    
    // Add voice session data for each user (only for legacy system)
    if (!EnhancedUser && combinedUsers.length > 0) {
      const userIds = combinedUsers.map(user => user.discordId);
      
      // Get today's date range for checking voice activity
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Get current voice sessions (users currently in voice)
      const currentVoiceSessions = VoiceSession ? await VoiceSession.aggregate([
        {
          $match: {
            leaveTime: { $exists: false },
            userId: { $in: userIds, $ne: 'test-user-123' }
          }
        },
        {
          $sort: { joinTime: -1 }
        },
        {
          $group: {
            _id: '$userId',
            latestSession: { $first: '$$ROOT' }
          }
        },
        {
          $replaceRoot: { newRoot: '$latestSession' }
        }
      ]) : [];

      // Get users who were in voice chat today
      const todayVoiceActivity = VoiceSession ? await VoiceSession.find({
        userId: { $in: userIds, $ne: 'test-user-123' },
        joinTime: { $gte: startOfToday, $lt: endOfToday }
      }).distinct('userId') : [];

      const todayVoiceUsers = new Set(todayVoiceActivity);
      const currentVoiceUsers = new Set(currentVoiceSessions.map((session: any) => session.userId));

      // Get server member data for roles and nicknames
      const serverMemberData = ServerMemberData ? await ServerMemberData.find({
        userId: { $in: userIds }
      }) : [];

      const userRolesMap = new Map();
      const userNicknamesMap = new Map();
      serverMemberData.forEach((member: any) => {
        if (member.serverData) {
          if (member.serverData.roles) {
            userRolesMap.set(member.userId, member.serverData.roles);
          }
          if (member.serverData.nick) {
            userNicknamesMap.set(member.userId, member.serverData.nick);
          }
        }
      });

      // Add voice session data, role data, and nickname data to each user
      combinedUsers = combinedUsers.map((user: any) => {
        const currentSession = currentVoiceSessions.find((session: any) => session.userId === user.discordId);
        const isCurrentlyInVoice = currentVoiceUsers.has(user.discordId);
        const wasInVoiceToday = todayVoiceUsers.has(user.discordId);
        const userRoles = userRolesMap.get(user.discordId) || [];
        const userNickname = userNicknamesMap.get(user.discordId) || null;

        return {
          ...user,
          isCurrentlyInVoice,
          wasInVoiceToday,
          currentVoiceChannel: currentSession?.channelName || null,
          currentVoiceJoinTime: currentSession?.joinTime || null,
          timeInCurrentVoice: currentSession ? Math.floor((Date.now() - new Date(currentSession.joinTime).getTime()) / 1000 / 60) : 0,
          roles: userRoles,
          roleCount: userRoles.length,
          currentNickname: userNickname
        };
      });
    }

    // Sort by creation date (newest first) and limit results
    combinedUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    combinedUsers = combinedUsers.slice(0, 1000);

    return NextResponse.json({
      success: true,
      users: combinedUsers,
      totalFound: combinedUsers.length,
      source: EnhancedUser ? 'enhanced' : 'legacy'
    });

  } catch (error) {
    console.error('Search users error:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}