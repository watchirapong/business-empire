import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';
import { Class, ClassReminder, ClassAttendance } from '@/lib/schemas/class-management';

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

// GET - Get reminders for a specific class
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

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

    // Get reminders for the class
    const reminders = await ClassReminder.find({
      classId
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      reminders: reminders.map(reminder => ({
        id: reminder._id.toString(),
        classId: reminder.classId,
        managerId: reminder.managerId,
        reminderType: reminder.reminderType,
        schedule: reminder.schedule,
        messageTemplate: reminder.messageTemplate,
        isActive: reminder.isActive,
        lastSent: reminder.lastSent,
        nextSend: reminder.nextSend,
        sentCount: reminder.sentCount,
        createdAt: reminder.createdAt,
        updatedAt: reminder.updatedAt
      }))
    });

  } catch (error) {
    console.error('Get reminders error:', error);
    return NextResponse.json(
      { error: 'Failed to load reminders' },
      { status: 500 }
    );
  }
}

// POST - Create a new reminder
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { 
      classId, 
      reminderType, 
      schedule, 
      messageTemplate 
    } = await request.json();

    if (!classId || !reminderType || !schedule) {
      return NextResponse.json(
        { error: 'Class ID, reminder type, and schedule are required' },
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

    // Calculate next send time based on schedule
    const nextSend = calculateNextSendTime(schedule);

    const newReminder = new ClassReminder({
      classId,
      managerId: classData.managerId,
      reminderType,
      schedule: {
        time: schedule.time,
        days: schedule.days || [],
        timezone: 'Asia/Bangkok'
      },
      messageTemplate: {
        type: messageTemplate?.type || 'auto_generated',
        customMessage: messageTemplate?.customMessage || ''
      },
      nextSend,
      isActive: true
    });

    await newReminder.save();

    return NextResponse.json({
      success: true,
      reminder: {
        id: newReminder._id.toString(),
        classId: newReminder.classId,
        managerId: newReminder.managerId,
        reminderType: newReminder.reminderType,
        schedule: newReminder.schedule,
        messageTemplate: newReminder.messageTemplate,
        isActive: newReminder.isActive,
        nextSend: newReminder.nextSend,
        sentCount: newReminder.sentCount,
        createdAt: newReminder.createdAt
      }
    });

  } catch (error) {
    console.error('Create reminder error:', error);
    return NextResponse.json(
      { error: 'Failed to create reminder' },
      { status: 500 }
    );
  }
}

// PUT - Update a reminder
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { 
      id, 
      reminderType, 
      schedule, 
      messageTemplate, 
      isActive 
    } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Reminder ID is required' },
        { status: 400 }
      );
    }

    // Verify reminder exists and user has access through class
    const reminder = await ClassReminder.findById(id).populate('classId');
    if (!reminder || (reminder.classId as any).createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Reminder not found or access denied' },
        { status: 404 }
      );
    }

    // Update fields
    if (reminderType) reminder.reminderType = reminderType;
    if (schedule) {
      reminder.schedule = {
        time: schedule.time,
        days: schedule.days || [],
        timezone: 'Asia/Bangkok'
      };
      // Recalculate next send time
      reminder.nextSend = calculateNextSendTime(schedule);
    }
    if (messageTemplate) {
      reminder.messageTemplate = {
        type: messageTemplate.type || 'auto_generated',
        customMessage: messageTemplate.customMessage || ''
      };
    }
    if (isActive !== undefined) reminder.isActive = isActive;
    
    reminder.updatedAt = new Date();
    await reminder.save();

    return NextResponse.json({
      success: true,
      reminder: {
        id: reminder._id.toString(),
        classId: reminder.classId,
        managerId: reminder.managerId,
        reminderType: reminder.reminderType,
        schedule: reminder.schedule,
        messageTemplate: reminder.messageTemplate,
        isActive: reminder.isActive,
        nextSend: reminder.nextSend,
        sentCount: reminder.sentCount,
        createdAt: reminder.createdAt,
        updatedAt: reminder.updatedAt
      }
    });

  } catch (error) {
    console.error('Update reminder error:', error);
    return NextResponse.json(
      { error: 'Failed to update reminder' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a reminder
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const reminderId = searchParams.get('id');

    if (!reminderId) {
      return NextResponse.json(
        { error: 'Reminder ID is required' },
        { status: 400 }
      );
    }

    // Verify reminder exists and user has access through class
    const reminder = await ClassReminder.findById(reminderId).populate('classId');
    if (!reminder || (reminder.classId as any).createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Reminder not found or access denied' },
        { status: 404 }
      );
    }

    await ClassReminder.deleteOne({ _id: reminderId });

    return NextResponse.json({
      success: true,
      message: 'Reminder deleted successfully'
    });

  } catch (error) {
    console.error('Delete reminder error:', error);
    return NextResponse.json(
      { error: 'Failed to delete reminder' },
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
