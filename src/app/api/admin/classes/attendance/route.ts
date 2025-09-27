import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminWithDB } from '@/lib/admin-config';
import mongoose from 'mongoose';
import { Class, ClassAttendance, ClassVoiceActivity } from '@/lib/schemas/class-management';

// MongoDB connection
const connectDB = async () => {
  try {
    if (mongoose.connections[0].readyState) {
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// GET - Get attendance data for a specific class
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 });
    }

    const hasAdminAccess = await isAdminWithDB(session.user.id);
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Unauthorized - Not an admin' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]; // Default to today

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      );
    }

    // Verify class exists and user has access
    const classData = await Class.findOne({
      _id: classId,
      createdBy: session.user.id
    });

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found or access denied' },
        { status: 404 }
      );
    }

    // Get attendance data for the specified date
    const attendance = await ClassAttendance.findOne({
      classId,
      date
    });

    // Get real-time voice channel data from Discord API - check ALL voice channels
    const voiceChannels = classData.voiceChannels && classData.voiceChannels.length > 0
      ? classData.voiceChannels
      : [{ id: classData.voiceChannelId }];
    
    console.log('🔍 Class Configuration Debug:');
    console.log('Class Name:', classData.name);
    console.log('Role ID:', classData.roleId);
    console.log('Configured Voice Channels:', voiceChannels);
    
    // Get students with the class role first
    const studentsWithRole = await getStudentsWithRole(classData.roleId);
    
    // Get ALL voice channel users (not just class-specific ones)
    console.log('🔍 Fetching ALL voice channel users...');
    const allVCUsers = await getAllVoiceUsers();
    console.log('🔍 All VC Users Result:', allVCUsers.length, 'users found');
    
    // Filter to only show students with the role who are in ANY voice channel
    const currentVCUsers = allVCUsers.filter(vcUser => 
      studentsWithRole.some(student => student.userId === vcUser.userId)
    );
    console.log('🔍 Filtered VC Users (with role):', currentVCUsers.length, 'users found');
    
    console.log('🔍 Voice Channel Debug:');
    console.log('Total Students with Role:', studentsWithRole.length);
    console.log('Students in ANY Voice Channel:', currentVCUsers.length);
    console.log('Students in VC:', currentVCUsers.map(u => ({
      userId: u.userId,
      username: u.username,
      nickname: u.nickname,
      channelId: u.channelId
    })));
    
    // Additional debugging for Earth specifically
    const earthInVC = currentVCUsers.find(u => u.username === 'dip898' || u.nickname?.includes('เอิร์ท'));
    console.log('🌍 Earth Debug:', earthInVC ? {
      userId: earthInVC.userId,
      username: earthInVC.username,
      nickname: earthInVC.nickname,
      channelId: earthInVC.channelId
    } : 'NOT IN VC');

    // Get all voice activity for the day from database
    const allVoiceActivity = await ClassVoiceActivity.find({
      classId,
      date
    }).sort({ joinTime: -1 });
    
    console.log('🔍 Voice Activity Debug:');
    console.log('Total Voice Activities Today:', allVoiceActivity.length);
    console.log('Voice Activities:', allVoiceActivity.map(va => ({
      userId: va.userId,
      username: va.username,
      joinTime: va.joinTime,
      leaveTime: va.leaveTime,
      duration: va.duration
    })));
    
    // Check if Earth is in the students list
    const earthStudent = studentsWithRole.find(s => s.username === 'dip898' || s.nick?.includes('เอิร์ท'));
    console.log('Earth Student Found:', earthStudent ? {
      userId: earthStudent.userId,
      username: earthStudent.username,
      nickname: earthStudent.nick || earthStudent.globalName || earthStudent.username
    } : 'NOT FOUND');
    
    // Earth voice channel check moved to the main debugging section above

    // Calculate attendance status for each student
    const studentAttendance = studentsWithRole.map((student: any) => {
      const voiceActivity = allVoiceActivity.find(va => va.userId === student.userId);
      const isCurrentlyInVC = currentVCUsers.some(va => va.userId === student.userId);
      
      let status = 'absent';
      let totalTime = 0;
      let joinTime = null;
      let leaveTime = null;
      let firstJoinToday = null;

      // Check if student has ANY voice activity today (from database)
      if (voiceActivity) {
        status = 'present';
        totalTime = voiceActivity.duration || 0;
        joinTime = voiceActivity.joinTime;
        leaveTime = voiceActivity.leaveTime;
        firstJoinToday = voiceActivity.joinTime;
      }

      // Check if student is currently in ANY voice channel
      if (isCurrentlyInVC) {
        status = 'present';
        const currentUser = currentVCUsers.find(va => va.userId === student.userId);
        if (currentUser) {
          // If they're currently in VC, use current time as join time
          joinTime = currentUser.joinTime;
          // If no previous activity today, this is their first join
          if (!firstJoinToday) {
            firstJoinToday = currentUser.joinTime;
          }
        }
      }

      // Additional check: Look for any voice activity today in the database
      // This covers cases where they joined and left earlier today
      const todayVoiceActivities = allVoiceActivity.filter(va => 
        va.userId === student.userId && 
        new Date(va.joinTime).toDateString() === new Date().toDateString()
      );

      if (todayVoiceActivities.length > 0) {
        status = 'present';
        // Get the earliest join time today
        const earliestJoin = todayVoiceActivities.reduce((earliest, current) => 
          new Date(current.joinTime) < new Date(earliest.joinTime) ? current : earliest
        );
        firstJoinToday = earliestJoin.joinTime;
        
        // Calculate total time spent in voice today
        totalTime = todayVoiceActivities.reduce((total, activity) => 
          total + (activity.duration || 0), 0
        );
      }

      return {
        userId: student.userId,
        username: student.username,
        globalName: student.globalName,
        nickname: student.nick || student.globalName || student.username, // Show nickname first
        status,
        joinTime: firstJoinToday || joinTime,
        leaveTime,
        totalTime,
        isCurrentlyInVC,
        firstJoinToday: firstJoinToday ? new Date(firstJoinToday).toLocaleTimeString('th-TH', { 
          timeZone: 'Asia/Bangkok',
          hour: '2-digit',
          minute: '2-digit'
        }) : null
      };
    });

    // Calculate summary statistics
    const present = studentAttendance.filter((s: any) => s.status === 'present').length;
    const absent = studentAttendance.filter((s: any) => s.status === 'absent').length;
    const currentlyInVC = studentAttendance.filter((s: any) => s.isCurrentlyInVC).length;

    return NextResponse.json({
      success: true,
      attendance: {
        classId,
        className: classData.name,
        date,
        students: studentAttendance,
        summary: {
          total: studentAttendance.length,
          present,
          absent,
          currentlyInVC,
          attendanceRate: studentAttendance.length > 0 
            ? Math.round((present / studentAttendance.length) * 100)
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json(
      { error: 'Failed to load attendance data' },
      { status: 500 }
    );
  }
}

// POST - Update attendance data (manual override)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 });
    }

    const hasAdminAccess = await isAdminWithDB(session.user.id);
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Unauthorized - Not an admin' }, { status: 401 });
    }

    await connectDB();

    const { classId, date, studentUpdates } = await request.json();

    if (!classId || !date || !studentUpdates) {
      return NextResponse.json(
        { error: 'Class ID, date, and student updates are required' },
        { status: 400 }
      );
    }

    // Verify class exists and user has access
    const classData = await Class.findOne({
      _id: classId,
      createdBy: session.user.id
    });

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found or access denied' },
        { status: 404 }
      );
    }

    // Find or create attendance record
    let attendance = await ClassAttendance.findOne({
      classId,
      date
    });

    if (!attendance) {
      attendance = new ClassAttendance({
        classId,
        date,
        students: [],
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        averageAttendanceTime: 0
      });
    }

    // Update student records
    for (const update of studentUpdates) {
      const existingStudent = attendance.students.find((s: any) => s.userId === update.userId);
      
      if (existingStudent) {
        // Update existing student
        existingStudent.status = update.status;
        if (update.joinTime) existingStudent.joinTime = update.joinTime;
        if (update.leaveTime) existingStudent.leaveTime = update.leaveTime;
        if (update.totalTime !== undefined) existingStudent.totalTime = update.totalTime;
      } else {
        // Add new student
        attendance.students.push({
          userId: update.userId,
          username: update.username,
          globalName: update.globalName || '',
          status: update.status,
          joinTime: update.joinTime,
          leaveTime: update.leaveTime,
          totalTime: update.totalTime || 0,
          sessions: []
        });
      }
    }

    // Recalculate summary statistics
    attendance.totalPresent = attendance.students.filter((s: any) => s.status === 'present').length;
    attendance.totalAbsent = attendance.students.filter((s: any) => s.status === 'absent').length;
    attendance.totalLate = attendance.students.filter((s: any) => s.status === 'late').length;
    
    const totalTime = attendance.students.reduce((sum: any, s: any) => sum + s.totalTime, 0);
    attendance.averageAttendanceTime = attendance.totalPresent > 0 
      ? Math.round(totalTime / attendance.totalPresent)
      : 0;

    attendance.updatedAt = new Date();
    await attendance.save();

    return NextResponse.json({
      success: true,
      message: 'Attendance updated successfully',
      attendance: {
        classId,
        date,
        summary: {
          total: attendance.students.length,
          present: attendance.totalPresent,
          absent: attendance.totalAbsent,
          late: attendance.totalLate,
          averageTime: attendance.averageAttendanceTime
        }
      }
    });

  } catch (error) {
    console.error('Update attendance error:', error);
    return NextResponse.json(
      { error: 'Failed to update attendance' },
      { status: 500 }
    );
  }
}

// Helper function to get ALL voice users from Discord API (any voice channel)
async function getAllVoiceUsers() {
  try {
    if (!process.env.DISCORD_BOT_TOKEN) {
      console.error('Discord bot token not configured');
      return [];
    }

    const guildId = process.env.DISCORD_GUILD_ID || '699984143542517801';
    
    // Get voice states for all users
    const voiceStatesResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/voice-states`,
      {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!voiceStatesResponse.ok) {
      console.error('Failed to fetch voice states:', voiceStatesResponse.status);
      return [];
    }

    const voiceStates = await voiceStatesResponse.json();
    
    console.log('🔍 getAllVoiceUsers: Voice states fetched successfully');
    console.log('🔍 All Voice States Debug:');
    console.log('Total Voice States Found:', voiceStates.length);
    console.log('All Voice States:', voiceStates.map((state: any) => ({
      userId: state.user_id,
      channelId: state.channel_id
    })));

    // Filter users currently in ANY voice channel
    const currentUsers = voiceStates.filter((state: any) => 
      state.channel_id // Any voice channel, not just class-specific ones
    );
    
    console.log('Users in ANY Voice Channel:', currentUsers.length);

    // Get member data for each user
    const usersWithData = await Promise.all(
      currentUsers.map(async (state: any) => {
        try {
          const memberResponse = await fetch(
            `https://discord.com/api/v10/guilds/${guildId}/members/${state.user_id}`,
            {
              headers: {
                'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!memberResponse.ok) {
            return {
              userId: state.user_id,
              username: 'Unknown',
              globalName: 'Unknown',
              nickname: 'Unknown',
              channelId: state.channel_id,
              joinTime: new Date().toISOString()
            };
          }

          const member = await memberResponse.json();
          return {
            userId: state.user_id,
            username: member.user.username,
            globalName: member.user.global_name || member.user.username,
            nickname: member.nick || member.user.global_name || member.user.username,
            channelId: state.channel_id,
            joinTime: new Date().toISOString()
          };
        } catch (error) {
          console.error('Error fetching member data:', error);
          return {
            userId: state.user_id,
            username: 'Unknown',
            globalName: 'Unknown',
            nickname: 'Unknown',
            channelId: state.channel_id,
            joinTime: new Date().toISOString()
          };
        }
      })
    );

    return usersWithData;
  } catch (error) {
    console.error('Error getting all voice users:', error);
    return [];
  }
}

// Helper function to get current voice users from Discord API (class-specific channels)
async function getCurrentVoiceUsers(voiceChannels: any[]) {
  try {
    if (!process.env.DISCORD_BOT_TOKEN) {
      console.error('Discord bot token not configured');
      return [];
    }

    const guildId = process.env.DISCORD_GUILD_ID || '699984143542517801';
    
    // Get voice states for all users
    const voiceStatesResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/voice-states`,
      {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!voiceStatesResponse.ok) {
      console.error('Failed to fetch voice states:', voiceStatesResponse.status);
      return [];
    }

    const voiceStates = await voiceStatesResponse.json();
    const classVoiceChannelIds = voiceChannels.map(vc => vc.id).filter(Boolean);

    console.log('🔍 Voice Channel Debug:');
    console.log('Class Voice Channel IDs:', classVoiceChannelIds);
    console.log('Total Voice States Found:', voiceStates.length);
    
    // Check if Earth (@dip898) is in any voice channel
    const earthVoiceState = voiceStates.find((state: any) => {
      // We need to find Earth by checking member data
      return state.user_id; // We'll check this in the member data fetch
    });
    
    console.log('All Voice States:', voiceStates.map((state: any) => ({
      userId: state.user_id,
      channelId: state.channel_id
    })));

    // Filter users currently in class voice channels
    const currentUsers = voiceStates.filter((state: any) => 
      state.channel_id && classVoiceChannelIds.includes(state.channel_id)
    );
    
    console.log('Users in Class Voice Channels:', currentUsers.length);

    // Get member data for each user
    const usersWithData = await Promise.all(
      currentUsers.map(async (state: any) => {
        try {
          const memberResponse = await fetch(
            `https://discord.com/api/v10/guilds/${guildId}/members/${state.user_id}`,
            {
              headers: {
                'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!memberResponse.ok) {
            return {
              userId: state.user_id,
              username: 'Unknown',
              globalName: 'Unknown',
              nickname: 'Unknown',
              channelId: state.channel_id,
              joinTime: new Date().toISOString()
            };
          }

          const member = await memberResponse.json();
          return {
            userId: state.user_id,
            username: member.user.username,
            globalName: member.user.global_name || member.user.username,
            nickname: member.nick || member.user.global_name || member.user.username,
            channelId: state.channel_id,
            joinTime: new Date().toISOString()
          };
        } catch (error) {
          console.error('Error fetching member data:', error);
          return {
            userId: state.user_id,
            username: 'Unknown',
            globalName: 'Unknown',
            nickname: 'Unknown',
            channelId: state.channel_id,
            joinTime: new Date().toISOString()
          };
        }
      })
    );

    return usersWithData;
  } catch (error) {
    console.error('Error getting current voice users:', error);
    return [];
  }
}

// Helper function to get students with a specific role
async function getStudentsWithRole(roleId: string) {
  try {
    // Check if we have a bot token
    if (!process.env.DISCORD_BOT_TOKEN) {
      console.error('Discord bot token not configured');
      return [];
    }

    // Get guild ID from environment or use default
    const guildId = process.env.DISCORD_GUILD_ID || '699984143542517801';
    
    // Get all guild members (this is a paginated endpoint)
    let allMembers: any[] = [];
    let after = '';
    let hasMore = true;

    while (hasMore) {
      const url = `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000${after ? `&after=${after}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch guild members:', response.status);
        break;
      }

      const members = await response.json();
      allMembers = allMembers.concat(members);
      
      // Check if there are more members to fetch
      if (members.length < 1000) {
        hasMore = false;
      } else {
        after = members[members.length - 1].user.id;
      }
    }

    // Filter members who have the specified role
    const membersWithRole = allMembers.filter(member => 
      member.roles && member.roles.includes(roleId)
    );

    // Transform to the expected format
    return membersWithRole.map(member => ({
      userId: member.user.id,
      username: member.user.username,
      globalName: member.user.global_name || member.user.username,
      discriminator: member.user.discriminator,
      avatar: member.user.avatar,
      nick: member.nick,
      roles: member.roles,
      joinedAt: member.joined_at
    }));

  } catch (error) {
    console.error('Error getting students with role:', error);
    return [];
  }
}
