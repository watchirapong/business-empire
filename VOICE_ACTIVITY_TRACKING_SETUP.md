# Voice Activity Tracking System Setup

This guide explains how to set up automatic voice activity tracking for your Discord server.

## 🎯 What This Does

- ✅ **Tracks voice channel activity** in real-time
- ✅ **Records join/leave times** for all users
- ✅ **Calculates session durations** automatically
- ✅ **Stores data in MongoDB** for analysis
- ✅ **Provides user statistics** and analytics
- ✅ **Admin dashboard** for monitoring all users

## 🔧 Setup Requirements

### 1. Discord Bot Setup

1. **Go to Discord Developer Portal**: https://discord.com/developers/applications
2. **Create a new application** or use existing one
3. **Go to "Bot" section** and create a bot
4. **Copy the bot token** (you'll need this)

### 2. Bot Permissions

Your Discord bot needs these permissions:
- `guilds.members.read` - Read server member information
- `guilds.voice-states.read` - Read voice state updates
- `guilds.presences.read` - Read presence updates

### 3. Environment Variables

Add this to your `.env` file:

```env
# Existing variables...
DISCORD_BOT_TOKEN=your-discord-bot-token-here
MONGODB_URI=your-mongodb-connection-string

# Voice activity tracking
DISCORD_GUILD_ID=699984143542517801
```

### 4. Invite Bot to Server

Generate an invite link with these scopes:
- `bot`
- `guilds.members.read`
- `guilds.voice-states.read`
- `guilds.presences.read`

Example invite URL:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_CLIENT_ID&permissions=1024&scope=bot
```

## 🚀 Starting the System

### 1. Start the Discord Bot

```bash
# Start the voice activity tracking bot
npm run discord-bot
```

### 2. Start the Web Application

```bash
# In another terminal
npm run dev
```

### 3. Verify Bot Connection

Check the console output for:
```
🤖 Discord Bot logged in as [BotName]#[Discriminator]
✅ Discord Bot started successfully!
🎤 Voice activity tracking is now active
```

## 📊 Accessing Voice Activity Data

### 1. User Voice Activity Page

Users can view their own voice activity at:
```
https://hamsterhub.fun/voice-activity
```

**Features:**
- Total voice time and join count
- Recent voice sessions
- Detailed statistics
- Channel usage breakdown

### 2. Admin Voice Dashboard

Admins can view all users' voice activity at:
```
https://hamsterhub.fun/admin/voice-dashboard
```

**Features:**
- All users' voice statistics
- Filtering by user type
- Detailed user profiles
- Recent activity monitoring

### 3. API Endpoints

#### Get User Voice Activity
```
GET /api/users/voice-activity?userId=[USER_ID]
```

#### Get All Voice Activity (Admin)
```
GET /api/admin/voice-activity?filter=[all|real_user|suspicious_user]&limit=[NUMBER]
```

#### Get Specific User Details (Admin)
```
GET /api/admin/user-voice-activity?userId=[USER_ID]
```

## 📈 Data Structure

### Voice Activity Collection
```javascript
{
  userId: String,           // Discord user ID
  username: String,         // Discord username
  globalName: String,       // Display name
  avatar: String,           // Avatar hash
  voiceJoinCount: Number,   // Total times joined voice
  totalVoiceTime: Number,   // Total time in minutes
  lastVoiceJoin: Date,      // Last join timestamp
  lastVoiceLeave: Date,     // Last leave timestamp
  userType: String,         // 'real_user' or 'suspicious_user'
  isActive: Boolean,        // User activity status
  createdAt: Date,          // First activity
  updatedAt: Date           // Last update
}
```

### Voice Session Collection
```javascript
{
  userId: String,           // Discord user ID
  username: String,         // Discord username
  globalName: String,       // Display name
  channelId: String,        // Voice channel ID
  channelName: String,      // Voice channel name
  joinTime: Date,           // Join timestamp
  leaveTime: Date,          // Leave timestamp
  duration: Number,         // Session duration in minutes
  createdAt: Date           // Record creation time
}
```

## 🎮 How It Works

### 1. Voice State Tracking

The Discord bot listens for `voiceStateUpdate` events:
- **User joins voice channel** → Creates session record
- **User leaves voice channel** → Calculates duration and updates stats
- **User moves between channels** → Handles as leave + join

### 2. Data Processing

For each voice activity:
1. **Create/update** voice activity record
2. **Track individual sessions** with timestamps
3. **Calculate statistics** (total time, average session, etc.)
4. **Store in MongoDB** for persistence

### 3. Real-time Updates

- **Immediate tracking** of voice state changes
- **Automatic duration calculation** when users leave
- **Live statistics** available via API

## 📊 Statistics Available

### User Statistics
- **Total voice time** (in minutes/hours)
- **Number of voice joins**
- **Average session duration**
- **Longest session**
- **Most active channel**
- **Recent activity timeline**

### Server Statistics
- **Total users with voice activity**
- **Real vs suspicious users**
- **Total voice joins across server**
- **Average voice time per user**
- **Top voice users**

## 🔒 Security & Privacy

### 1. Data Access
- **Users can only see their own data**
- **Admins can see all users' data**
- **API endpoints are protected** by authentication

### 2. Data Storage
- **Voice activity data** stored in MongoDB
- **Session history** preserved for analysis
- **User privacy** maintained through proper access controls

### 3. Bot Permissions
- **Minimal required permissions** for voice tracking
- **No access to message content**
- **Only voice state and member information**

## 🛠️ Troubleshooting

### Common Issues

1. **Bot not connecting:**
   - Check `DISCORD_BOT_TOKEN` is correct
   - Verify bot has proper permissions
   - Ensure bot is invited to server

2. **No voice activity recorded:**
   - Check bot has `guilds.voice-states.read` permission
   - Verify bot is online and connected
   - Check MongoDB connection

3. **API errors:**
   - Verify user authentication
   - Check admin permissions for admin endpoints
   - Ensure MongoDB is running

### Debug Commands

```bash
# Check bot status
npm run discord-bot

# Check MongoDB connection
mongo --eval "db.runCommand('ping')"

# View recent voice activity
mongo --eval "db.voiceactivities.find().sort({updatedAt: -1}).limit(5)"

# Check voice sessions
mongo --eval "db.voicesessions.find().sort({joinTime: -1}).limit(5)"
```

## 📈 Monitoring & Analytics

### 1. Real-time Monitoring

- **Bot status** in console output
- **Voice activity logs** in real-time
- **Error tracking** and reporting

### 2. Data Analytics

- **User engagement metrics**
- **Voice channel usage patterns**
- **Activity trends over time**

### 3. Performance Metrics

- **Session duration analysis**
- **Most active users**
- **Channel popularity**

## 🔄 Maintenance

### 1. Regular Tasks

- **Monitor bot connection** status
- **Check voice activity data** quality
- **Review user statistics** periodically
- **Update bot permissions** if needed

### 2. Data Management

- **Voice activity data** is automatically maintained
- **Session history** preserved for analysis
- **User statistics** updated in real-time

### 3. Updates

- **Keep Discord.js** updated
- **Monitor Discord API changes**
- **Update bot functionality** as needed

## 🎉 Success!

Once set up, your system will:

1. **Automatically track** all voice channel activity
2. **Record detailed statistics** for each user
3. **Provide real-time analytics** via web interface
4. **Store historical data** for trend analysis
5. **Enable user engagement** monitoring

Users can now see exactly how much time they spend in voice chat, and admins can monitor server-wide voice activity patterns!
