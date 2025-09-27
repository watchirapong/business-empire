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

// GET - Load all classes for the current admin
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

    const classes = await Class.find({
      createdBy: session.user.id
    }).sort({ createdAt: -1 });

    // Get today's attendance data for each class
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const classesWithAttendance = await Promise.all(
      classes.map(async (classData) => {
        const attendance = await ClassAttendance.findOne({
          classId: classData._id,
          date: today
        });

        // Get students with the specified role who are currently in voice channels
        let studentsInVC = 0;
        let totalStudentsWithRole = 0;
        
        try {
          if (process.env.DISCORD_BOT_TOKEN && classData.roleId) {
            const guildId = process.env.DISCORD_GUILD_ID || '699984143542517801';
            
            // Get all guild members with the specified role
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
              
              if (members.length < 1000) {
                hasMore = false;
              } else {
                after = members[members.length - 1].user.id;
              }
            }

            // Filter members who have the specified role
            const studentsWithRole = allMembers.filter(member => 
              member.roles && member.roles.includes(classData.roleId)
            );
            totalStudentsWithRole = studentsWithRole.length;

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

            if (voiceStatesResponse.ok) {
              const voiceStates = await voiceStatesResponse.json();
              
              // Check which voice channels this class uses
              const voiceChannels = classData.voiceChannels && classData.voiceChannels.length > 0 
                ? classData.voiceChannels 
                : [{ id: classData.voiceChannelId }];
              
              const classVoiceChannelIds = voiceChannels.map((vc: any) => vc.id).filter(Boolean);
              
              // Count students with the role who are currently in class voice channels
              studentsInVC = studentsWithRole.filter(student => {
                const studentVoiceState = voiceStates.find((state: any) => state.user_id === student.user.id);
                return studentVoiceState && 
                       studentVoiceState.channel_id && 
                       classVoiceChannelIds.includes(studentVoiceState.channel_id);
              }).length;
            }
          }
        } catch (error) {
          console.error('Error fetching role-based VC data:', error);
        }

        return {
          id: classData._id.toString(),
          name: classData.name,
          description: classData.description,
          roleId: classData.roleId,
          voiceChannels: classData.voiceChannels || [],
          // Keep legacy fields for backward compatibility
          voiceChannelId: classData.voiceChannelId,
          voiceChannelName: classData.voiceChannelName,
          managerId: classData.managerId,
          managerName: classData.managerName,
          studentCount: totalStudentsWithRole || classData.studentCount,
          roleName: classData.roleName,
          schedule: classData.schedule,
          isActive: classData.isActive,
          createdAt: classData.createdAt,
          updatedAt: classData.updatedAt,
          todayAttendance: {
            present: attendance?.totalPresent || 0,
            absent: attendance?.totalAbsent || 0,
            late: attendance?.totalLate || 0,
            currentlyInVC: studentsInVC,
            totalStudentsWithRole: totalStudentsWithRole,
            attendanceRate: totalStudentsWithRole > 0 
              ? Math.round(((attendance?.totalPresent || 0) / totalStudentsWithRole) * 100)
              : 0
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      classes: classesWithAttendance
    });

  } catch (error) {
    console.error('Get classes error:', error);
    return NextResponse.json(
      { error: 'Failed to load classes' },
      { status: 500 }
    );
  }
}

// POST - Create a new class
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

    const { 
      name, 
      description, 
      roleId, 
      voiceChannels, // New field for multiple voice channels
      voiceChannelId, // Legacy field for backward compatibility
      voiceChannelName, // Legacy field for backward compatibility
      managerId, 
      managerName,
      schedule,
      reminderSettings // New field for reminder settings
    } = await request.json();

    if (!name || !roleId || !managerId) {
      return NextResponse.json(
        { error: 'Class name, role ID, and manager ID are required' },
        { status: 400 }
      );
    }

    // Validate voice channels - either new format or legacy format
    if (!voiceChannels || voiceChannels.length === 0) {
      if (!voiceChannelId) {
        return NextResponse.json(
          { error: 'At least one voice channel is required' },
          { status: 400 }
        );
      }
    }

    // Check if class with same name already exists
    const existingClass = await Class.findOne({
      name: name.trim(),
      createdBy: session.user.id
    });

    if (existingClass) {
      return NextResponse.json(
        { error: 'A class with this name already exists' },
        { status: 400 }
      );
    }

    // Prepare voice channels data
    let voiceChannelsData = [];
    if (voiceChannels && voiceChannels.length > 0) {
      // New format: multiple voice channels
      voiceChannelsData = voiceChannels.map((vc: any) => ({
        id: vc.id,
        name: vc.name || ''
      }));
    } else if (voiceChannelId) {
      // Legacy format: single voice channel
      voiceChannelsData = [{
        id: voiceChannelId,
        name: voiceChannelName || ''
      }];
    }

    const newClass = new Class({
      name: name.trim(),
      description: description || '',
      roleId,
      voiceChannels: voiceChannelsData,
      // Keep legacy fields for backward compatibility
      voiceChannelId: voiceChannelId || (voiceChannelsData.length > 0 ? voiceChannelsData[0].id : ''),
      voiceChannelName: voiceChannelName || (voiceChannelsData.length > 0 ? voiceChannelsData[0].name : ''),
      managerId,
      managerName: managerName || '',
      studentCount: 0, // Will be calculated later
      schedule: {
        days: schedule?.days || [],
        startTime: schedule?.startTime || '10:00',
        endTime: schedule?.endTime || '12:00',
        timezone: 'Asia/Bangkok'
      },
      createdBy: session.user.id
    });

    await newClass.save();

    // Create reminder if enabled
    let reminder = null;
    if (reminderSettings && reminderSettings.enabled) {
      const { ClassReminder } = await import('@/lib/schemas/class-management');
      
      // Calculate next send time based on schedule
      const nextSend = calculateNextSendTime(reminderSettings);

      reminder = new ClassReminder({
        classId: newClass._id,
        managerId: newClass.managerId,
        reminderType: reminderSettings.type,
        schedule: {
          time: reminderSettings.time,
          days: reminderSettings.days || [],
          timezone: 'Asia/Bangkok'
        },
        messageTemplate: {
          type: 'auto_generated',
          customMessage: ''
        },
        nextSend,
        isActive: true
      });

      await reminder.save();
    }

    return NextResponse.json({
      success: true,
      class: {
        id: newClass._id.toString(),
        name: newClass.name,
        description: newClass.description,
        roleId: newClass.roleId,
        voiceChannels: newClass.voiceChannels,
        // Keep legacy fields for backward compatibility
        voiceChannelId: newClass.voiceChannelId,
        voiceChannelName: newClass.voiceChannelName,
        managerId: newClass.managerId,
        managerName: newClass.managerName,
        studentCount: newClass.studentCount,
        schedule: newClass.schedule,
        isActive: newClass.isActive,
        createdAt: newClass.createdAt,
        updatedAt: newClass.updatedAt
      },
      reminder: reminder ? {
        id: reminder._id.toString(),
        type: reminder.reminderType,
        time: reminder.schedule.time,
        days: reminder.schedule.days,
        nextSend: reminder.nextSend
      } : null
    });

  } catch (error) {
    console.error('Create class error:', error);
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    );
  }
}

// PUT - Update a class
export async function PUT(request: NextRequest) {
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

    const { 
      id, 
      name, 
      description, 
      roleId, 
      voiceChannels, // New field for multiple voice channels
      voiceChannelId, // Legacy field for backward compatibility
      voiceChannelName, // Legacy field for backward compatibility
      managerId, 
      managerName,
      schedule,
      isActive 
    } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      );
    }

    const classData = await Class.findOne({
      _id: id,
      createdBy: session.user.id
    });

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found or access denied' },
        { status: 404 }
      );
    }

    // Update fields
    if (name) classData.name = name.trim();
    if (description !== undefined) classData.description = description;
    if (roleId) classData.roleId = roleId;
    
    // Handle voice channels update
    if (voiceChannels && voiceChannels.length > 0) {
      // New format: multiple voice channels
      classData.voiceChannels = voiceChannels.map((vc: any) => ({
        id: vc.id,
        name: vc.name || ''
      }));
      // Update legacy fields for backward compatibility
      classData.voiceChannelId = voiceChannels[0].id;
      classData.voiceChannelName = voiceChannels[0].name || '';
    } else if (voiceChannelId) {
      // Legacy format: single voice channel
      classData.voiceChannelId = voiceChannelId;
      if (voiceChannelName !== undefined) classData.voiceChannelName = voiceChannelName;
      // Update new format for consistency
      if (classData.voiceChannels && classData.voiceChannels.length > 0) {
        classData.voiceChannels[0].id = voiceChannelId;
        classData.voiceChannels[0].name = voiceChannelName || '';
      } else {
        classData.voiceChannels = [{
          id: voiceChannelId,
          name: voiceChannelName || ''
        }];
      }
    }
    
    if (managerId) classData.managerId = managerId;
    if (managerName !== undefined) classData.managerName = managerName;
    if (schedule) classData.schedule = { ...classData.schedule, ...schedule };
    if (isActive !== undefined) classData.isActive = isActive;
    
    classData.updatedAt = new Date();

    await classData.save();

    return NextResponse.json({
      success: true,
      class: {
        id: classData._id.toString(),
        name: classData.name,
        description: classData.description,
        roleId: classData.roleId,
        voiceChannels: classData.voiceChannels || [],
        // Keep legacy fields for backward compatibility
        voiceChannelId: classData.voiceChannelId,
        voiceChannelName: classData.voiceChannelName,
        managerId: classData.managerId,
        managerName: classData.managerName,
        studentCount: classData.studentCount,
        schedule: classData.schedule,
        isActive: classData.isActive,
        createdAt: classData.createdAt,
        updatedAt: classData.updatedAt
      }
    });

  } catch (error) {
    console.error('Update class error:', error);
    return NextResponse.json(
      { error: 'Failed to update class' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a class
export async function DELETE(request: NextRequest) {
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
    const classId = searchParams.get('id');

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      );
    }

    const result = await Class.deleteOne({
      _id: classId,
      createdBy: session.user.id
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Class not found or access denied' },
        { status: 404 }
      );
    }

    // Also delete related data
    await ClassAttendance.deleteMany({ classId });
    await ClassVoiceActivity.deleteMany({ classId });

    return NextResponse.json({
      success: true,
      message: 'Class deleted successfully'
    });

  } catch (error) {
    console.error('Delete class error:', error);
    return NextResponse.json(
      { error: 'Failed to delete class' },
      { status: 500 }
    );
  }
}

// Helper function to calculate next send time
function calculateNextSendTime(schedule: any): Date {
  const now = new Date();
  const [hours, minutes] = schedule.time.split(':').map(Number);
  
  // Create next send time for today
  const nextSend = new Date();
  nextSend.setHours(hours, minutes, 0, 0);
  
  // If time has passed today, move to next day
  if (nextSend <= now) {
    nextSend.setDate(nextSend.getDate() + 1);
  }
  
  // Find the next selected day
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  let foundNextDay = false;
  
  for (let i = 0; i < 7; i++) {
    const dayName = dayNames[nextSend.getDay()];
    if (schedule.days.includes(dayName)) {
      foundNextDay = true;
      break;
    }
    nextSend.setDate(nextSend.getDate() + 1);
  }
  
  if (!foundNextDay) {
    // If no valid day found in next 7 days, set to next week
    nextSend.setDate(nextSend.getDate() + 7);
  }
  
  return nextSend;
}
