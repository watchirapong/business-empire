import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminWithDB } from '@/lib/admin-config';
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

// POST - Send test reminder or trigger reminder
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

    const { classId, reminderId, testMode = false } = await request.json();

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

    // Get reminder if specified
    let reminder = null;
    if (reminderId) {
      reminder = await ClassReminder.findOne({
        _id: reminderId,
        classId
      });
    }

    // Get today's attendance data
    const today = new Date().toISOString().split('T')[0];
    const attendance = await ClassAttendance.findOne({
      classId,
      date: today
    });

    // Generate attendance summary message
    const message = generateAttendanceMessage(classData, attendance, reminder);

    // Send Discord DM to class manager
    const result = await sendDiscordDM(classData.managerId, message);

    if (result.success) {
      // Update reminder last sent time if not in test mode
      if (reminder && !testMode) {
        reminder.lastSent = new Date();
        reminder.sentCount += 1;
        await reminder.save();
      }

      return NextResponse.json({
        success: true,
        message: testMode ? 'Test reminder sent successfully' : 'Reminder sent successfully',
        testMode,
        managerId: classData.managerId,
        managerName: classData.managerName,
        messageContent: message,
        attendance: attendance ? {
          present: attendance.totalPresent,
          absent: attendance.totalAbsent,
          late: attendance.totalLate,
          total: attendance.students.length
        } : null
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send reminder' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Send reminder error:', error);
    return NextResponse.json(
      { error: 'Failed to send reminder' },
      { status: 500 }
    );
  }
}

// Helper function to generate attendance message
function generateAttendanceMessage(classData: any, attendance: any, reminder: any): string {
  const today = new Date().toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  let message = `📚 **${classData.name} - รายงานการเข้าเรียน**\n`;
  message += `📅 วันที่: ${today}\n`;
  message += `🎤 ช่องเสียง: ${classData.voiceChannelName || 'ไม่ระบุ'}\n\n`;

  if (attendance) {
    const total = attendance.students.length;
    const present = attendance.totalPresent;
    const absent = attendance.totalAbsent;
    const late = attendance.totalLate;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

    message += `📊 **สรุปการเข้าเรียน:**\n`;
    message += `✅ เข้าเรียน: ${present}/${total} คน (${attendanceRate}%)\n`;
    message += `❌ ขาดเรียน: ${absent} คน\n`;
    if (late > 0) {
      message += `⏰ สาย: ${late} คน\n`;
    }
    message += `\n`;

    // List present students
    const presentStudents = attendance.students.filter((s: any) => s.status === 'present');
    if (presentStudents.length > 0) {
      message += `✅ **นักเรียนที่เข้าเรียน (${presentStudents.length} คน):**\n`;
      presentStudents.slice(0, 10).forEach((student: any) => {
        const timeStr = student.totalTime > 0 ? ` (${Math.round(student.totalTime)} นาที)` : '';
        message += `• ${student.globalName || student.username}${timeStr}\n`;
      });
      if (presentStudents.length > 10) {
        message += `• และอีก ${presentStudents.length - 10} คน\n`;
      }
      message += `\n`;
    }

    // List absent students
    const absentStudents = attendance.students.filter((s: any) => s.status === 'absent');
    if (absentStudents.length > 0) {
      message += `❌ **นักเรียนที่ขาดเรียน (${absentStudents.length} คน):**\n`;
      absentStudents.slice(0, 10).forEach((student: any) => {
        message += `• ${student.globalName || student.username}\n`;
      });
      if (absentStudents.length > 10) {
        message += `• และอีก ${absentStudents.length - 10} คน\n`;
      }
      message += `\n`;
    }

    // Add average attendance time
    if (attendance.averageAttendanceTime > 0) {
      message += `⏱️ เวลาเฉลี่ยในการเรียน: ${attendance.averageAttendanceTime} นาที\n\n`;
    }
  } else {
    message += `📊 **ยังไม่มีข้อมูลการเข้าเรียนสำหรับวันนี้**\n\n`;
  }

  // Add next class info if available
  if (classData.schedule && classData.schedule.days.length > 0) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDay = tomorrow.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    if (classData.schedule.days.includes(tomorrowDay)) {
      message += `⏰ **คาบเรียนถัดไป:** พรุ่งนี้ ${classData.schedule.startTime} - ${classData.schedule.endTime}\n`;
    }
  }

  // Add custom message if reminder has one
  if (reminder && reminder.messageTemplate.type === 'custom' && reminder.messageTemplate.customMessage) {
    message += `\n📝 **ข้อความเพิ่มเติม:**\n${reminder.messageTemplate.customMessage}`;
  }

  return message;
}

// Helper function to send Discord DM
async function sendDiscordDM(userId: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.DISCORD_BOT_TOKEN) {
      return { success: false, error: 'Discord bot token not configured' };
    }

    // Create DM channel
    const dmResponse = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient_id: userId
      })
    });

    if (!dmResponse.ok) {
      const errorData = await dmResponse.json();
      return { success: false, error: `Failed to create DM channel: ${errorData.message}` };
    }

    const dmChannel = await dmResponse.json();

    // Send message
    const messageResponse = await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message
      })
    });

    if (!messageResponse.ok) {
      const errorData = await messageResponse.json();
      return { success: false, error: `Failed to send message: ${errorData.message}` };
    }

    return { success: true };

  } catch (error) {
    console.error('Discord DM error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
