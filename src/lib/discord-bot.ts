import mongoose from 'mongoose';

// Voice Activity Schema
const VoiceActivitySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: String,
  globalName: String,
  avatar: String,
  voiceJoinCount: { type: Number, default: 0 },
  totalVoiceTime: { type: Number, default: 0 }, // in minutes
  lastVoiceJoin: Date,
  lastVoiceLeave: Date,
  userType: { type: String, enum: ['real_user', 'suspicious_user'], default: 'suspicious_user' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Voice Session Schema for tracking individual sessions
const VoiceSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: String,
  globalName: String,
  channelId: String,
  channelName: String,
  joinTime: { type: Date, required: true },
  leaveTime: Date,
  duration: Number, // in minutes
  createdAt: { type: Date, default: Date.now }
});

const VoiceActivity = mongoose.models.VoiceActivity || mongoose.model('VoiceActivity', VoiceActivitySchema);
const VoiceSession = mongoose.models.VoiceSession || mongoose.model('VoiceSession', VoiceSessionSchema);

class DiscordBot {
  private isConnected: boolean = false;
  private voiceSessions: Map<string, { joinTime: Date; channelId: string; channelName: string }> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;
  private guildId: string | null = null;
  private lastVoiceStates: Map<string, { channelId: string | null; timestamp: Date }> = new Map();
  private recentVoiceActivity: Array<{userId: string, username: string, action: string, channelName: string, timestamp: Date}> = [];

  constructor() {
    console.log('🤖 Discord Bot initialized (API-based voice tracking)');
    console.log('📝 Voice tracking available through Discord API polling');
  }

  private async ensureMongoConnection() {
    try {
      if (mongoose.connection.readyState !== 1) {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI!, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          bufferCommands: false
        });
        console.log('✅ MongoDB connected');
      }
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  public async start() {
    try {
      if (!process.env.DISCORD_BOT_TOKEN) {
        throw new Error('Discord bot token not configured');
      }

      // Ensure MongoDB connection first
      await this.ensureMongoConnection();

      // Get guild ID from environment
      this.guildId = process.env.DISCORD_GUILD_ID || null;

      console.log('🤖 Discord Bot starting...');
      
      // Test bot connection
      const botInfo = await this.getBotInfo();
      if (botInfo) {
        console.log(`✅ Discord Bot connected as: ${botInfo.username}#${botInfo.discriminator}`);
        this.isConnected = true;
        
        // Start polling for voice activity if guild ID is available
        if (this.guildId) {
          this.startVoicePolling();
        } else {
          console.log('⚠️ No guild ID configured, voice polling disabled');
        }
      } else {
        throw new Error('Failed to connect to Discord');
      }
    } catch (error) {
      console.error('Failed to start Discord bot:', error);
      this.isConnected = false;
    }
  }

  public async stop() {
    try {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
      this.isConnected = false;
      console.log('🤖 Discord Bot stopped');
    } catch (error) {
      console.error('Error stopping Discord bot:', error);
    }
  }

  public isBotConnected() {
    return this.isConnected;
  }

  private async getBotInfo() {
    try {
      const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Error getting bot info:', error);
      return null;
    }
  }

  private startVoicePolling() {
    if (!this.guildId) return;

    console.log(`🔄 Starting voice activity polling for guild: ${this.guildId}`);
    
    // Initial voice state fetch
    this.pollVoiceActivity();
    
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollVoiceActivity();
      } catch (error) {
        console.error('Error polling voice activity:', error);
      }
    }, 30000); // Poll every 30 seconds to reduce database load
  }

  private async pollVoiceActivity() {
    if (!this.guildId) return;

    try {
      console.log(`🔄 Polling voice activity for guild: ${this.guildId}`);
      
      // Try to fetch guild members first
      const response = await fetch(`https://discord.com/api/v10/guilds/${this.guildId}/members?limit=1000`, {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const members = await response.json();
        console.log(`📊 Found ${members.length} members in guild`);
        
        const currentVoiceStates = new Map<string, { channelId: string | null; timestamp: Date }>();
        let voiceUsersCount = 0;
        
        // Process each member
        for (const member of members) {
          const userId = member.user?.id;
          if (!userId) continue;

          console.log(`🔍 Checking member: ${member.user?.username || 'Unknown'} (${userId})`);

          // Get voice state for this member
          const voiceState = await this.getMemberVoiceState(userId);
          const channelId = voiceState?.channel_id || null;
          
          console.log(`🔍 User ${member.user?.username || 'Unknown'} voice state:`, voiceState ? `Channel: ${voiceState.channel_id}` : 'Not in voice');
          
          if (channelId) {
            voiceUsersCount++;
            console.log(`🎤 User ${member.user?.username || 'Unknown'} is in voice channel: ${channelId}`);
          } else {
            console.log(`🔇 User ${member.user?.username || 'Unknown'} is not in voice`);
          }
          
          currentVoiceStates.set(userId, {
            channelId,
            timestamp: new Date()
          });

          // Check if voice state changed
          const previousState = this.lastVoiceStates.get(userId);
          
          if (!previousState) {
            // New user, check if they're in a voice channel
            if (channelId) {
              await this.handleVoiceJoin(userId, member.user, channelId);
            }
          } else if (previousState.channelId !== channelId) {
            // Voice state changed
            if (previousState.channelId && !channelId) {
              // User left voice channel
              await this.handleVoiceLeave(userId, member.user, previousState.channelId);
            } else if (!previousState.channelId && channelId) {
              // User joined voice channel
              await this.handleVoiceJoin(userId, member.user, channelId);
            } else if (previousState.channelId && channelId && previousState.channelId !== channelId) {
              // User moved between channels
              await this.handleVoiceLeave(userId, member.user, previousState.channelId);
              await this.handleVoiceJoin(userId, member.user, channelId);
            }
          }
        }

        // Check for users who left voice channels (not in current state)
        for (const [userId, previousState] of this.lastVoiceStates.entries()) {
          if (previousState.channelId && !currentVoiceStates.has(userId)) {
            // User is no longer in the guild or left voice channel
            await this.handleVoiceLeave(userId, { username: 'Unknown', global_name: 'Unknown' }, previousState.channelId);
          }
        }

        // Update last voice states
        this.lastVoiceStates = currentVoiceStates;
        
        console.log(`📊 Voice activity poll completed. Active voice users: ${voiceUsersCount}`);
      } else {
        console.error(`❌ Failed to fetch guild members: ${response.status} ${response.statusText}`);
        
        // Fallback: Try to check specific user directly
        console.log(`🔄 Trying fallback: Direct voice state check for known users`);
        await this.checkSpecificUsers();
      }
    } catch (error) {
      console.error('Error polling guild voice activity:', error);
      
      // Fallback: Try to check specific user directly
      console.log(`🔄 Trying fallback: Direct voice state check for known users`);
      await this.checkSpecificUsers();
    }
  }

  private async checkSpecificUsers() {
    // Known user IDs to check directly
    const knownUsers = [
      { id: '641285950902632459', username: 'watchirapongth' }, // Your user ID
      { id: '1402212628956315709', username: 'Starbot' } // Bot ID
    ];

    for (const user of knownUsers) {
      try {
        console.log(`🔍 Direct check for user: ${user.username} (${user.id})`);
        const voiceState = await this.getMemberVoiceState(user.id);
        
        if (voiceState && voiceState.channel_id) {
          console.log(`🎤 User ${user.username} is in voice channel: ${voiceState.channel_id}`);
          
          // Check if this is a new voice session
          const previousState = this.lastVoiceStates.get(user.id);
          if (!previousState || previousState.channelId !== voiceState.channel_id) {
            await this.handleVoiceJoin(user.id, { username: user.username }, voiceState.channel_id);
          }
          
          this.lastVoiceStates.set(user.id, {
            channelId: voiceState.channel_id,
            timestamp: new Date()
          });
        } else {
          console.log(`🔇 User ${user.username} is not in voice`);
          
          // Check if user left voice
          const previousState = this.lastVoiceStates.get(user.id);
          if (previousState && previousState.channelId) {
            await this.handleVoiceLeave(user.id, { username: user.username }, previousState.channelId);
          }
          
          this.lastVoiceStates.set(user.id, {
            channelId: null,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error(`Error checking voice state for ${user.username}:`, error);
      }
    }
  }

  private async getMemberVoiceState(userId: string) {
    try {
      const response = await fetch(`https://discord.com/api/v10/guilds/${this.guildId}/members/${userId}`, {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const member = await response.json();
        if (member.voice_state) {
          console.log(`🔍 User ${userId} voice state: ${member.voice_state.channel_id || 'not in voice'}`);
        }
        return member.voice_state || null;
      } else {
        console.log(`⚠️ Could not get voice state for user ${userId}: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error(`Error getting voice state for user ${userId}:`, error);
      return null;
    }
  }

  private async handleVoiceJoin(userId: string, user: any, channelId: string) {
    try {
      const username = user.username || 'Unknown';
      const globalName = user.global_name || username;
      const avatar = user.avatar || '';

      // Get channel name
      const channelName = await this.getChannelName(channelId);

      console.log(`🎤 User ${username} joined voice channel: ${channelName}`);

      // Track in memory for immediate access
      this.recentVoiceActivity.push({
        userId,
        username,
        action: 'join',
        channelName,
        timestamp: new Date()
      });

      // Keep only last 50 activities
      if (this.recentVoiceActivity.length > 50) {
        this.recentVoiceActivity = this.recentVoiceActivity.slice(-50);
      }

      // Record join time
      this.voiceSessions.set(userId, {
        joinTime: new Date(),
        channelId: channelId,
        channelName: channelName
      });

      // Update voice activity (async, don't wait for completion)
      this.updateVoiceActivity(userId, username, 'join', globalName, avatar).catch(err => 
        console.error('Background voice activity update failed:', err)
      );
      
      // Create voice session (async, don't wait for completion)
      this.createVoiceSession(userId, username, globalName, channelId, channelName).catch(err => 
        console.error('Background voice session creation failed:', err)
      );

    } catch (error) {
      console.error('Error handling voice join:', error);
    }
  }

  private async handleVoiceLeave(userId: string, user: any, channelId: string) {
    try {
      const username = user.username || 'Unknown';
      const globalName = user.global_name || username;
      const avatar = user.avatar || '';

      // Get channel name
      const channelName = await this.getChannelName(channelId);

      console.log(`🔇 User ${username} left voice channel: ${channelName}`);
      
      // Track in memory for immediate access
      this.recentVoiceActivity.push({
        userId,
        username,
        action: 'leave',
        channelName,
        timestamp: new Date()
      });

      // Keep only last 50 activities
      if (this.recentVoiceActivity.length > 50) {
        this.recentVoiceActivity = this.recentVoiceActivity.slice(-50);
      }
      
      const session = this.voiceSessions.get(userId);
      if (session) {
        const leaveTime = new Date();
        const calculatedDuration = Math.round((leaveTime.getTime() - session.joinTime.getTime()) / (1000 * 60));
        
        // Update voice session with leave time and duration (async)
        this.updateVoiceSession(userId, leaveTime, calculatedDuration).catch(err => 
          console.error('Background voice session update failed:', err)
        );
        
        // Update voice activity (async)
        this.updateVoiceActivity(userId, username, 'leave', globalName, avatar, calculatedDuration).catch(err => 
          console.error('Background voice activity update failed:', err)
        );
        
        // Remove from active sessions
        this.voiceSessions.delete(userId);
      }

    } catch (error) {
      console.error('Error handling voice leave:', error);
    }
  }

  private async getChannelName(channelId: string): Promise<string> {
    try {
      const response = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const channel = await response.json();
        return channel.name || 'Unknown';
      }
      return 'Unknown';
    } catch (error) {
      console.error(`Error getting channel name for ${channelId}:`, error);
      return 'Unknown';
    }
  }

  // Manual voice activity tracking (for testing and API calls)
  public async trackVoiceActivity(
    userId: string, 
    username: string, 
    action: 'join' | 'leave', 
    globalName?: string, 
    avatar?: string, 
    channelId?: string, 
    channelName?: string,
    duration?: number
  ) {
    try {
      if (action === 'join') {
        console.log(`🎤 User ${username} joined voice channel: ${channelName || 'Unknown'}`);
        
        // Record join time
        this.voiceSessions.set(userId, {
          joinTime: new Date(),
          channelId: channelId || 'unknown',
          channelName: channelName || 'Unknown'
        });

        // Update voice activity
        await this.updateVoiceActivity(userId, username, 'join', globalName, avatar);
        
        // Create voice session
        await this.createVoiceSession(userId, username, globalName, channelId, channelName);

      } else if (action === 'leave') {
        console.log(`🔇 User ${username} left voice channel: ${channelName || 'Unknown'}`);
        
        const session = this.voiceSessions.get(userId);
        if (session) {
          const leaveTime = new Date();
          const calculatedDuration = duration || Math.round((leaveTime.getTime() - session.joinTime.getTime()) / (1000 * 60));
          
          // Update voice session with leave time and duration
          await this.updateVoiceSession(userId, leaveTime, calculatedDuration);
          
          // Update voice activity
          await this.updateVoiceActivity(userId, username, 'leave', globalName, avatar, calculatedDuration);
          
          // Remove from active sessions
          this.voiceSessions.delete(userId);
        }
      }
    } catch (error) {
      console.error('Error tracking voice activity:', error);
    }
  }

  // Get voice activity statistics
  public static async getVoiceActivityStats() {
    try {
      const stats = await VoiceActivity.aggregate([
        {
          $group: {
            _id: '$userType',
            count: { $sum: 1 },
            totalJoins: { $sum: '$voiceJoinCount' },
            totalTime: { $sum: '$totalVoiceTime' }
          }
        }
      ]);

      const totalUsers = await VoiceActivity.countDocuments();
      const realUsers = await VoiceActivity.countDocuments({ userType: 'real_user' });
      const suspiciousUsers = await VoiceActivity.countDocuments({ userType: 'suspicious_user' });

      return {
        totalUsers,
        realUsers,
        suspiciousUsers,
        breakdown: stats,
        recentActivity: await VoiceActivity.find().sort({ updatedAt: -1 }).limit(10)
      };
    } catch (error) {
      console.error('Error getting voice activity stats:', error);
      return null;
    }
  }

  // Get user voice activity
  public static async getUserVoiceActivity(userId: string) {
    try {
      const voiceActivity = await VoiceActivity.findOne({ userId });
      const voiceSessions = await VoiceSession.find({ userId }).sort({ joinTime: -1 }).limit(20);

      return {
        voiceActivity,
        voiceSessions
      };
    } catch (error) {
      console.error('Error getting user voice activity:', error);
      return null;
    }
  }

  // Initialize voice activity for a user
  public async initializeVoiceActivity(userId: string, username: string, globalName?: string, avatar?: string) {
    try {
      const existingActivity = await VoiceActivity.findOne({ userId });
      
      if (!existingActivity) {
        await VoiceActivity.create({
          userId,
          username,
          globalName,
          avatar,
          voiceJoinCount: 0,
          totalVoiceTime: 0,
          userType: 'real_user',
          isActive: true
        });
        console.log(`📝 Initialized voice activity for user: ${username}`);
      }
    } catch (error) {
      console.error('Error initializing voice activity:', error);
    }
  }

  private async updateVoiceActivity(
    userId: string, 
    username: string, 
    action: 'join' | 'leave', 
    globalName?: string, 
    avatar?: string, 
    duration?: number
  ) {
    try {
      const updateData: any = {
        username,
        globalName,
        avatar,
        updatedAt: new Date()
      };

      if (action === 'join') {
        updateData.lastVoiceJoin = new Date();
        updateData.$inc = { voiceJoinCount: 1 };
      } else if (action === 'leave') {
        updateData.lastVoiceLeave = new Date();
        if (duration) {
          updateData.$inc = { totalVoiceTime: duration };
        }
      }

      // Use a shorter timeout for database operations
      await VoiceActivity.findOneAndUpdate(
        { userId },
        updateData,
        { upsert: true, new: true, maxTimeMS: 5000 }
      );
    } catch (error) {
      console.error('Error updating voice activity:', error);
      // Don't throw error to prevent bot from crashing
    }
  }

  private async createVoiceSession(
    userId: string, 
    username: string, 
    globalName?: string, 
    channelId?: string, 
    channelName?: string
  ) {
    try {
      await VoiceSession.create({
        userId,
        username,
        globalName,
        channelId,
        channelName,
        joinTime: new Date()
      });
    } catch (error) {
      console.error('Error creating voice session:', error);
      // Don't throw error to prevent bot from crashing
    }
  }

  private async updateVoiceSession(userId: string, leaveTime: Date, duration: number) {
    try {
      await VoiceSession.findOneAndUpdate(
        { userId, leaveTime: { $exists: false } },
        { leaveTime, duration },
        { sort: { joinTime: -1 }, maxTimeMS: 5000 }
      );
    } catch (error) {
      console.error('Error updating voice session:', error);
      // Don't throw error to prevent bot from crashing
    }
  }

  // Get active voice sessions
  public getActiveVoiceSessions() {
    return Array.from(this.voiceSessions.entries()).map(([userId, session]) => ({
      userId,
      ...session
    }));
  }

  // Get bot mode info
  public getBotMode() {
    return {
      useFullDiscordJS: false,
      isConnected: this.isConnected,
      mode: 'API-based Voice Tracking',
      guildId: this.guildId,
      pollingActive: !!this.pollingInterval,
      activeSessions: this.voiceSessions.size,
      lastVoiceStates: this.lastVoiceStates.size,
      recentActivityCount: this.recentVoiceActivity.length
    };
  }

  // Get recent voice activity (in-memory, works even if MongoDB is slow)
  public getRecentVoiceActivity() {
    return this.recentVoiceActivity.slice(-20); // Return last 20 activities
  }

  // Get current voice channel users (simulated)
  public getCurrentVoiceUsers() {
    // This would need to be implemented with actual Discord API calls
    // For now, return the active sessions
    return this.getActiveVoiceSessions();
  }

  // Test Discord API connection
  public async testConnection() {
    try {
      const botInfo = await this.getBotInfo();
      if (botInfo) {
        return {
          success: true,
          botInfo,
          message: 'Discord API connection successful'
        };
      } else {
        return {
          success: false,
          message: 'Failed to connect to Discord API'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error}`
      };
    }
  }

  // New method: Check if specific user is in voice channel
  public async checkUserVoiceStatus(userId: string, username?: string) {
    try {
      console.log(`🔍 Checking voice status for user: ${username || userId}`);
      
      const voiceState = await this.getMemberVoiceState(userId);
      
      if (voiceState && voiceState.channel_id) {
        const channelName = await this.getChannelName(voiceState.channel_id);
        console.log(`🎤 User ${username || userId} is in voice channel: ${channelName} (${voiceState.channel_id})`);
        
        return {
          isInVoice: true,
          channelId: voiceState.channel_id,
          channelName: channelName,
          userId: userId,
          username: username || 'Unknown',
          timestamp: new Date()
        };
      } else {
        console.log(`🔇 User ${username || userId} is not in voice`);
        return {
          isInVoice: false,
          channelId: null,
          channelName: null,
          userId: userId,
          username: username || 'Unknown',
          timestamp: new Date()
        };
      }
    } catch (error) {
      console.error(`Error checking voice status for ${username || userId}:`, error);
      return {
        isInVoice: false,
        channelId: null,
        channelName: null,
        userId: userId,
        username: username || 'Unknown',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // New method: Get all users currently in voice channels
  public async getAllVoiceUsers() {
    try {
      console.log(`🔍 Getting all voice users in guild: ${this.guildId}`);
      
      if (!this.guildId) {
        return { error: 'No guild ID configured' };
      }

      const response = await fetch(`https://discord.com/api/v10/guilds/${this.guildId}/members?limit=1000`, {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`❌ Failed to fetch guild members: ${response.status}`);
        return { error: `Failed to fetch guild members: ${response.status}` };
      }

      const members = await response.json();
      const voiceUsers = [];

      for (const member of members) {
        const userId = member.user?.id;
        if (!userId) continue;

        const voiceState = await this.getMemberVoiceState(userId);
        
        if (voiceState && voiceState.channel_id) {
          const channelName = await this.getChannelName(voiceState.channel_id);
          voiceUsers.push({
            userId: userId,
            username: member.user?.username || 'Unknown',
            globalName: member.user?.global_name || member.user?.username || 'Unknown',
            avatar: member.user?.avatar || '',
            channelId: voiceState.channel_id,
            channelName: channelName,
            joinTime: new Date() // Approximate, since we don't have exact join time
          });
        }
      }

      console.log(`📊 Found ${voiceUsers.length} users in voice channels`);
      return {
        totalVoiceUsers: voiceUsers.length,
        voiceUsers: voiceUsers,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Error getting all voice users:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // New method: Set bot presence (make bot appear online with status)
  public async setBotPresence(status: 'online' | 'idle' | 'dnd' | 'invisible' = 'online', activity?: string) {
    try {
      console.log(`🤖 Setting bot presence: ${status}${activity ? ` - ${activity}` : ''}`);
      
      const presenceData: any = {
        status: status,
        since: 0,
        activities: [],
        afk: false
      };

      if (activity) {
        presenceData.activities = [{
          name: activity,
          type: 0, // Playing
          created_at: Date.now()
        }];
      }

      // Note: This would require a WebSocket connection to Discord Gateway
      // For now, we'll simulate the presence update
      console.log(`✅ Bot presence set to: ${status}${activity ? ` - ${activity}` : ''}`);
      
      return {
        success: true,
        status: status,
        activity: activity,
        message: 'Bot presence updated (simulated)'
      };
    } catch (error) {
      console.error('Error setting bot presence:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // New method: Get voice channel information
  public async getVoiceChannelInfo(channelId: string) {
    try {
      console.log(`🔍 Getting voice channel info: ${channelId}`);
      
      const response = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const channel = await response.json();
        console.log(`📊 Voice channel info: ${channel.name} (${channel.id})`);
        
        return {
          id: channel.id,
          name: channel.name,
          type: channel.type,
          guildId: channel.guild_id,
          position: channel.position,
          bitrate: channel.bitrate,
          userLimit: channel.user_limit,
          parentId: channel.parent_id,
          nsfw: channel.nsfw
        };
      } else {
        console.error(`❌ Failed to get channel info: ${response.status}`);
        return { error: `Failed to get channel info: ${response.status}` };
      }
    } catch (error) {
      console.error('Error getting voice channel info:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // New method: Get all voice channels in the guild
  public async getAllVoiceChannels() {
    try {
      console.log(`🔍 Getting all voice channels in guild: ${this.guildId}`);
      
      if (!this.guildId) {
        return { error: 'No guild ID configured' };
      }

      const response = await fetch(`https://discord.com/api/v10/guilds/${this.guildId}/channels`, {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`❌ Failed to fetch guild channels: ${response.status}`);
        return { error: `Failed to fetch guild channels: ${response.status}` };
      }

      const channels = await response.json();
      const voiceChannels = channels.filter((channel: any) => channel.type === 2); // Type 2 = Voice Channel

      console.log(`📊 Found ${voiceChannels.length} voice channels`);
      
      return {
        totalVoiceChannels: voiceChannels.length,
        voiceChannels: voiceChannels.map((channel: any) => ({
          id: channel.id,
          name: channel.name,
          position: channel.position,
          bitrate: channel.bitrate,
          userLimit: channel.user_limit,
          parentId: channel.parent_id
        })),
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Error getting all voice channels:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // New method: Force check voice activity (manual trigger)
  public async forceCheckVoiceActivity() {
    try {
      console.log(`🔄 Force checking voice activity...`);
      
      // Set bot presence to show it's active
      await this.setBotPresence('online', 'Monitoring Voice Channels');
      
      // Check all voice users
      const voiceUsers = await this.getAllVoiceUsers();
      
      // Update recent activity
      if (voiceUsers.voiceUsers && voiceUsers.voiceUsers.length > 0) {
        for (const user of voiceUsers.voiceUsers) {
          this.recentVoiceActivity.push({
            userId: user.userId,
            username: user.username,
            action: 'check',
            channelName: user.channelName,
            timestamp: new Date()
          });
        }
        
        // Keep only last 50 activities
        if (this.recentVoiceActivity.length > 50) {
          this.recentVoiceActivity = this.recentVoiceActivity.slice(-50);
        }
      }
      
      console.log(`✅ Force check completed. Found ${voiceUsers.totalVoiceUsers || 0} users in voice`);
      
      return {
        success: true,
        voiceUsers: voiceUsers,
        activeSessions: this.voiceSessions.size,
        recentActivityCount: this.recentVoiceActivity.length,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('Error in force check voice activity:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default DiscordBot;
