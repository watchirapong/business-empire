import mongoose from 'mongoose';

// Class Management Schema
export const ClassSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  roleId: { type: String, required: true }, // Discord role ID
  voiceChannels: [{ // Support multiple voice channels
    id: { type: String, required: true }, // Discord voice channel ID
    name: { type: String, default: '' } // Voice channel name
  }],
  // Keep legacy fields for backward compatibility
  voiceChannelId: { type: String }, // Discord voice channel ID (deprecated)
  voiceChannelName: { type: String, default: '' }, // Voice channel name (deprecated)
  managerId: { type: String, required: true }, // Discord user ID of class manager
  managerName: { type: String, default: '' },
  studentCount: { type: Number, default: 0 },
  schedule: {
    days: [{ type: String }], // ['monday', 'tuesday', etc.]
    startTime: { type: String, default: '10:00' },
    endTime: { type: String, default: '12:00' },
    timezone: { type: String, default: 'Asia/Bangkok' } // Thailand timezone
  },
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, required: true }, // Admin who created the class
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Class Attendance Schema for daily tracking
export const ClassAttendanceSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  students: [{
    userId: { type: String, required: true },
    username: { type: String, required: true },
    globalName: { type: String, default: '' },
    status: { 
      type: String, 
      enum: ['present', 'absent', 'late', 'left_early'], 
      default: 'absent' 
    },
    joinTime: { type: Date },
    leaveTime: { type: Date },
    totalTime: { type: Number, default: 0 }, // in minutes
    sessions: [{ // Track multiple VC sessions per day
      joinTime: { type: Date, required: true },
      leaveTime: { type: Date },
      duration: { type: Number, default: 0 } // in minutes
    }]
  }],
  totalPresent: { type: Number, default: 0 },
  totalAbsent: { type: Number, default: 0 },
  totalLate: { type: Number, default: 0 },
  averageAttendanceTime: { type: Number, default: 0 }, // in minutes
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Class Reminder Schema
export const ClassReminderSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  managerId: { type: String, required: true }, // Discord user ID
  reminderType: { 
    type: String, 
    enum: ['end_of_class', 'daily_report', 'weekly_summary', 'attendance_alert'],
    required: true 
  },
  schedule: {
    time: { type: String, required: true }, // '17:00'
    days: [{ type: String }], // ['monday', 'tuesday', etc.]
    timezone: { type: String, default: 'Asia/Bangkok' } // Thailand timezone
  },
  messageTemplate: {
    type: { type: String, enum: ['auto_generated', 'custom'], default: 'auto_generated' },
    customMessage: { type: String, default: '' }
  },
  isActive: { type: Boolean, default: true },
  lastSent: { type: Date },
  nextSend: { type: Date },
  sentCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Class Voice Activity Schema for real-time tracking
export const ClassVoiceActivitySchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  globalName: { type: String, default: '' },
  voiceChannelId: { type: String, required: true },
  joinTime: { type: Date, required: true },
  leaveTime: { type: Date },
  duration: { type: Number, default: 0 }, // in minutes
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  isCurrentlyInVC: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Create indexes for better performance
ClassAttendanceSchema.index({ classId: 1, date: 1 }, { unique: true });
ClassVoiceActivitySchema.index({ classId: 1, userId: 1, date: 1 });
ClassVoiceActivitySchema.index({ classId: 1, isCurrentlyInVC: 1 });
ClassReminderSchema.index({ classId: 1, isActive: 1 });

export const Class = mongoose.models.Class || mongoose.model('Class', ClassSchema);
export const ClassAttendance = mongoose.models.ClassAttendance || mongoose.model('ClassAttendance', ClassAttendanceSchema);
export const ClassReminder = mongoose.models.ClassReminder || mongoose.model('ClassReminder', ClassReminderSchema);
export const ClassVoiceActivity = mongoose.models.ClassVoiceActivity || mongoose.model('ClassVoiceActivity', ClassVoiceActivitySchema);
