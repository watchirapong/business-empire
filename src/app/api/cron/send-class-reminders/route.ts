import { NextRequest, NextResponse } from 'next/server';
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

// POST - Send scheduled class reminders
export async function POST(request: NextRequest) {
  try {
    // Verify this is a cron job request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit'
    });
    const currentDay = now.toLocaleDateString('en-US', { 
      weekday: 'long',
      timeZone: 'Asia/Bangkok'
    }).toLowerCase();

    console.log(`🕐 Checking reminders at ${currentTime} (${currentDay})`);

    // Find active reminders that should be sent now
    const activeReminders = await ClassReminder.find({
      isActive: true,
      'schedule.days': currentDay,
      'schedule.time': currentTime
    }).populate('classId');

    console.log(`📨 Found ${activeReminders.length} reminders to send`);

    const results = [];

    for (const reminder of activeReminders) {
      try {
        const classData = reminder.classId as any;
        if (!classData) {
          console.log(`❌ Class not found for reminder ${reminder._id}`);
          continue;
        }

        // Get today's attendance data
        const today = now.toISOString().split('T')[0];
        const attendance = await ClassAttendance.findOne({
          classId: classData._id,
          date: today
        });

        // Generate attendance summary message
        const message = generateAttendanceMessage(classData, attendance, reminder);

        // Send Discord DM to class manager
        const result = await sendDiscordDM(classData.managerId, message);

        if (result.success) {
          // Update reminder last sent time
          reminder.lastSent = new Date();
          reminder.sentCount += 1;
          
          // Calculate next send time
          reminder.nextSend = calculateNextSendTime(reminder.schedule);
          
          await reminder.save();

          results.push({
            reminderId: reminder._id.toString(),
            className: classData.name,
            managerId: classData.managerId,
            status: 'sent',
            message: 'Reminder sent successfully'
          });

          console.log(`✅ Sent reminder for class: ${classData.name}`);
        } else {
          results.push({
            reminderId: reminder._id.toString(),
            className: classData.name,
            managerId: classData.managerId,
            status: 'failed',
            message: result.error || 'Failed to send reminder'
          });

          console.log(`❌ Failed to send reminder for class: ${classData.name} - ${result.error}`);
        }
      } catch (error) {
        console.error(`Error processing reminder ${reminder._id}:`, error);
        results.push({
          reminderId: reminder._id.toString(),
          className: 'Unknown',
          managerId: 'Unknown',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      timezone: 'Asia/Bangkok',
      currentTime,
      currentDay,
      totalReminders: activeReminders.length,
      results
    });

  } catch (error) {
    console.error('Send class reminders error:', error);
    return NextResponse.json(
      { error: 'Failed to send reminders' },
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
    const tomorrowDay = tomorrow.toLocaleDateString('en-US', { 
      weekday: 'long',
      timeZone: 'Asia/Bangkok'
    }).toLowerCase();
    
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
