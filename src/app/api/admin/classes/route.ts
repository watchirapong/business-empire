import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin-config';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { ClassSchema } from '@/lib/schemas/class-management';

// Helper function to check admin access with database
async function isAdminWithDB(userId: string): Promise<boolean> {
  try {
    return isAdmin(userId);
  } catch (error) {
    console.error('Error checking admin access:', error);
    return false;
  }
}

// Create Class model
const Class = mongoose.models.Class || mongoose.model('Class', ClassSchema);

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
    const includeAttendance = searchParams.get('includeAttendance') === 'true';

    // Get all classes
    const classes = await Class.find({})
      .sort({ createdAt: -1 })
      .lean();

    // Try to enhance user data with Discord nicknames
    try {
      let EnhancedUser;
      try {
        EnhancedUser = mongoose.model('EnhancedUser');
      } catch (error) {
        // Enhanced user model not available
      }

      if (EnhancedUser) {
        // Get all unique user IDs from classes
        const allUserIds = new Set<string>();
        classes.forEach(classData => {
          if (classData.managerId) {
            allUserIds.add(classData.managerId);
          }
          if (classData.createdBy) {
            allUserIds.add(classData.createdBy);
          }
        });

        // Get enhanced user data
        const enhancedUsers = await EnhancedUser.find({ discordId: { $in: Array.from(allUserIds) } });
        const enhancedUserMap = new Map();
        enhancedUsers.forEach(user => {
          enhancedUserMap.set(user.discordId, {
            discordNickname: user.discordServerData?.nickname,
            displayName: user.discordServerData?.nickname || user.globalName || user.username
          });
        });

        // Enhance class data with Discord nicknames
        classes.forEach(classData => {
          // Enhance manager
          if (classData.managerId) {
            const enhancedData = enhancedUserMap.get(classData.managerId);
            if (enhancedData) {
              classData.managerDisplayName = enhancedData.displayName;
              classData.managerDiscordNickname = enhancedData.discordNickname;
            }
          }

          // Enhance creator
          if (classData.createdBy) {
            const enhancedData = enhancedUserMap.get(classData.createdBy);
            if (enhancedData) {
              classData.creatorDisplayName = enhancedData.displayName;
              classData.creatorDiscordNickname = enhancedData.discordNickname;
            }
          }
        });
      }
    } catch (error) {
      console.error('Error enhancing class data:', error);
    }

    // If attendance data is requested, add it
    if (includeAttendance) {
      // This would require additional logic to calculate attendance
      // For now, we'll add placeholder data
      classes.forEach(classData => {
        classData.todayAttendance = {
          present: 0,
          absent: 0,
          late: 0,
          currentlyInVC: 0,
          totalStudentsWithRole: 0,
          attendanceRate: 0
        };
      });
    }

    return NextResponse.json({
      success: true,
      classes
    });

  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
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

    // Try to get enhanced user data for the manager
    let managerDisplayName = managerName || 'Unknown';
    let managerDiscordNickname = null;

    try {
      let EnhancedUser;
      try {
        EnhancedUser = mongoose.model('EnhancedUser');
      } catch (error) {
        // Enhanced user model not available
      }

      if (EnhancedUser) {
        const enhancedUser = await EnhancedUser.findOne({ discordId: managerId });
        if (enhancedUser) {
          managerDisplayName = enhancedUser.discordServerData?.nickname || 
                              enhancedUser.globalName || 
                              enhancedUser.username || 
                              managerDisplayName;
          managerDiscordNickname = enhancedUser.discordServerData?.nickname;
        }
      }
    } catch (error) {
      console.error('Error fetching enhanced user data:', error);
    }

    // Prepare voice channels data
    let voiceChannelsData = [];
    if (voiceChannels && voiceChannels.length > 0) {
      voiceChannelsData = voiceChannels;
    } else if (voiceChannelId) {
      // Legacy format
      voiceChannelsData = [{
        id: voiceChannelId,
        name: voiceChannelName || ''
      }];
    }

    // Create new class
    const newClass = new Class({
      name: name.trim(),
      description: description || '',
      roleId,
      voiceChannels: voiceChannelsData,
      // Keep legacy fields for backward compatibility
      voiceChannelId: voiceChannelId || (voiceChannelsData.length > 0 ? voiceChannelsData[0].id : ''),
      voiceChannelName: voiceChannelName || (voiceChannelsData.length > 0 ? voiceChannelsData[0].name : ''),
      managerId,
      managerName: managerDisplayName,
      managerDisplayName,
      managerDiscordNickname,
      schedule: schedule || {
        days: [],
        startTime: '10:00',
        endTime: '12:00',
        timezone: 'Asia/Bangkok'
      },
      reminderSettings: reminderSettings || {
        enabled: false,
        time: '17:00',
        type: 'end_of_class',
        days: []
      },
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newClass.save();

    return NextResponse.json({
      success: true,
      message: 'Class created successfully',
      class: newClass.toObject()
    });

  } catch (error) {
    console.error('Error creating class:', error);
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

    const { id, ...updateData } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      );
    }

    // Try to enhance manager data if managerId is being updated
    if (updateData.managerId) {
      try {
        let EnhancedUser;
        try {
          EnhancedUser = mongoose.model('EnhancedUser');
        } catch (error) {
          // Enhanced user model not available
        }

        if (EnhancedUser) {
          const enhancedUser = await EnhancedUser.findOne({ discordId: updateData.managerId });
          if (enhancedUser) {
            updateData.managerDisplayName = enhancedUser.discordServerData?.nickname || 
                                           enhancedUser.globalName || 
                                           enhancedUser.username || 
                                           updateData.managerName;
            updateData.managerDiscordNickname = enhancedUser.discordServerData?.nickname;
          }
        }
      } catch (error) {
        console.error('Error fetching enhanced user data:', error);
      }
    }

    updateData.updatedAt = new Date();

    const updatedClass = await Class.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedClass) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Class updated successfully',
      class: updatedClass.toObject()
    });

  } catch (error) {
    console.error('Error updating class:', error);
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      );
    }

    const deletedClass = await Class.findByIdAndDelete(id);

    if (!deletedClass) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Class deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting class:', error);
    return NextResponse.json(
      { error: 'Failed to delete class' },
      { status: 500 }
    );
  }
}