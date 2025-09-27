# 🎓 Class Management System Setup Guide

This guide explains how to set up and use the new Discord Class Management System for tracking student attendance and sending automated reminders.

## 🎯 What This System Does

- ✅ **Create Classes** - Set up classes with Discord roles and voice channels
- ✅ **Track Attendance** - Automatically track who's in voice channels
- ✅ **Send Reminders** - Automated attendance summaries to class managers
- ✅ **Real-time Monitoring** - See who's currently in class
- ✅ **Thailand Timezone** - All times are in Asia/Bangkok timezone

## 🔧 Setup Requirements

### 1. Discord Bot Setup

Your Discord bot needs these permissions:
- `guilds.members.read` - Read server member information
- `guilds.read` - Read server information
- `guilds.voice-states.read` - Track voice channel activity

### 2. Environment Variables

Make sure these are set in your `.env` file:

```env
# Existing variables...
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_BOT_TOKEN=your-discord-bot-token
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.com
MONGODB_URI=your-mongodb-connection-string

# For cron jobs (optional)
CRON_SECRET=your-secure-cron-secret
```

### 3. Start the Discord Bot

Make sure your Discord bot is running and connected to your server.

## 🚀 How to Use

### 1. Access Class Management

1. Go to your admin panel
2. Click on the **🎓 Class Management** tab
3. You'll see the class management dashboard

### 2. Create a New Class

1. Click **"Create New Class"** button
2. Fill in the required information:
   - **Class Name**: e.g., "Math 101", "English Advanced"
   - **Description**: Optional description
   - **Discord Role ID**: The role ID that students have
   - **Voice Channel ID**: The voice channel where class happens
   - **Voice Channel Name**: Display name for the channel
   - **Manager Discord ID**: Who receives attendance reports
   - **Manager Name**: Display name for the manager
   - **Schedule**: Days and times when class occurs
3. Click **"Create Class"**

### 3. View Attendance

1. On the dashboard, you'll see all your classes
2. Each class shows today's attendance summary:
   - ✅ Present students
   - ❌ Absent students
   - 🎤 Currently in voice channel
   - 📊 Attendance rate
3. Click **"View Students"** to see detailed attendance

### 4. Send Reminders

1. Click **"Send Reminder"** on any class
2. This sends a test attendance summary to the class manager
3. The message includes:
   - Who's present/absent
   - Time spent in voice channel
   - Next class information

### 5. Set Up Automated Reminders

1. In the class detail view, you can set up automated reminders
2. Choose when to send reminders:
   - End of class
   - Daily reports
   - Weekly summaries
3. Set the time and days
4. Choose message type (auto-generated or custom)

## 📊 How Attendance Tracking Works

### Automatic Tracking

The system automatically tracks attendance by:

1. **Monitoring Voice Channels** - When students join/leave voice channels
2. **Role Detection** - Only tracks students with the class role
3. **Time Calculation** - Calculates total time spent in class
4. **Real-time Updates** - Updates attendance status in real-time

### Attendance Status

- **Present**: Student was in the voice channel today
- **Absent**: Student was not in the voice channel today
- **Currently In VC**: Student is in voice channel right now

## 📨 Reminder System

### Types of Reminders

1. **End of Class** - Sent when class ends
2. **Daily Report** - Sent at a specific time each day
3. **Weekly Summary** - Sent weekly with attendance summary

### Reminder Content

Auto-generated reminders include:
- Class name and date
- Attendance summary (present/absent counts)
- List of present students with time in VC
- List of absent students
- Next class information
- Custom message (if set)

### Setting Up Automated Reminders

1. Go to class management dashboard
2. Click on a class
3. Set up reminder schedule
4. Choose message type
5. Save the reminder

## 🔄 Cron Job Setup (Optional)

To automatically send reminders, set up a cron job:

```bash
# Add to your crontab (runs every minute)
* * * * * curl -X POST https://your-domain.com/api/cron/send-class-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

## 🎯 Best Practices

### 1. Class Setup

- Use descriptive class names
- Set up voice channels specifically for classes
- Assign dedicated class managers
- Set realistic class schedules

### 2. Role Management

- Create specific roles for each class
- Make sure students have the correct roles
- Regularly update role assignments

### 3. Reminder Timing

- Send reminders after class ends
- Use daily reports for important classes
- Set appropriate times for your timezone

### 4. Monitoring

- Check attendance regularly
- Follow up with absent students
- Use the real-time monitoring features

## 🛠️ Troubleshooting

### Common Issues

1. **Bot Not Tracking Voice Activity**
   - Check bot permissions
   - Ensure bot is in the voice channel
   - Verify voice channel ID is correct

2. **Reminders Not Sending**
   - Check Discord bot token
   - Verify manager Discord ID
   - Test with manual reminder first

3. **Attendance Not Updating**
   - Check if students have the correct role
   - Verify voice channel ID
   - Check bot connection status

### Getting Help

1. Check the Discord bot logs
2. Verify all environment variables
3. Test with a small class first
4. Check MongoDB for data

## 📈 Features

### Current Features

- ✅ Class creation and management
- ✅ Real-time voice channel tracking
- ✅ Automatic attendance calculation
- ✅ Attendance summaries and reports
- ✅ Automated reminder system
- ✅ Thailand timezone support
- ✅ Discord integration

### Future Enhancements

- 📊 Detailed analytics and trends
- 📱 Mobile-friendly interface
- 🔔 Push notifications
- 📋 Assignment tracking
- 🎯 Grade management
- 📈 Performance metrics

## 🎉 Getting Started

1. **Set up your Discord bot** with proper permissions
2. **Create your first class** using the dashboard
3. **Test the system** with a small group
4. **Set up reminders** for your classes
5. **Monitor attendance** and enjoy the automation!

The system is designed to be simple and intuitive while providing powerful features for class management. Start with one class and expand as you get comfortable with the system.
