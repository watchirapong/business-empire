import { Client, GatewayIntentBits, Events, VoiceState } from 'discord.js';
import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connections[0].readyState) {
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI!, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('📊 MongoDB connected successfully for Discord bot');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
};

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

// Daily Voice Reward Schema
const DailyVoiceRewardSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  voiceTimeMinutes: { type: Number, default: 0 },
  rewardClaimed: { type: Boolean, default: false },
  rewardAmount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index for faster queries
DailyVoiceRewardSchema.index({ userId: 1, date: 1 }, { unique: true });

// Currency Schema for coin rewards
const CurrencySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  hamsterCoins: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// User Schema for creating user records
const UserSchema = new mongoose.Schema({
  discordId: String,
  username: String,
  email: String,
  avatar: String,
  discriminator: String,
  globalName: String,
  accessToken: String,
  refreshToken: String,
  lastLogin: Date,
  loginCount: Number,
  isActive: Boolean,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const VoiceActivity = mongoose.models.VoiceActivity || mongoose.model('VoiceActivity', VoiceActivitySchema);
const VoiceSession = mongoose.models.VoiceSession || mongoose.model('VoiceSession', VoiceSessionSchema);
const DailyVoiceReward = mongoose.models.DailyVoiceReward || mongoose.model('DailyVoiceReward', DailyVoiceRewardSchema);
const Currency = mongoose.models.Currency || mongoose.model('Currency', CurrencySchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);

class DiscordBot {
  private client: Client;
  private isConnected: boolean = false;
  private guildId: string = '699984143542517801'; // Your Discord server ID
  private guildName: string = 'Hamster Hub'; // Your Discord server name

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
      ]
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Voice state update event
    this.client.on(Events.VoiceStateUpdate, async (oldState: VoiceState, newState: VoiceState) => {
      await this.handleVoiceStateUpdate(oldState, newState);
    });

    // Bot ready event
    this.client.on(Events.ClientReady, () => {
      console.log(`🤖 Discord Bot logged in as ${this.client.user?.tag}`);
      this.isConnected = true;
    });

    // Error handling
    this.client.on('error', (error) => {
      console.error('Discord Bot error:', error);
    });
  }

  private async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    try {
      // Only track voice activity in the specific guild
      if (oldState.guild.id !== this.guildId && newState.guild.id !== this.guildId) {
        return;
      }

      const userId = newState.member?.id || oldState.member?.id;
      const username = newState.member?.user.username || oldState.member?.user.username;
      const globalName = newState.member?.displayName || oldState.member?.displayName;
      const avatar = newState.member?.user.avatar || oldState.member?.user.avatar;

      if (!userId || !username) {
        return;
      }

      // User joined a voice channel
      if (!oldState.channelId && newState.channelId) {
        await this.handleVoiceJoin(userId, username, globalName || '', avatar || '', newState);
      }
      // User left a voice channel
      else if (oldState.channelId && !newState.channelId) {
        await this.handleVoiceLeave(userId, oldState);
      }
      // User moved between voice channels
      else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        await this.handleVoiceMove(userId, username, globalName || '', avatar || '', oldState, newState);
      }
    } catch (error) {
      console.error('Error handling voice state update:', error);
    }
  }

  private async handleVoiceJoin(userId: string, username: string, globalName: string, avatar: string, newState: VoiceState) {
    try {
      console.log(`🎤 User ${username} joined voice channel: ${newState.channel?.name}`);

      // Ensure MongoDB connection
      await connectDB();

      // Create or update voice activity record
      let voiceActivity = await VoiceActivity.findOne({ userId });
      
      if (!voiceActivity) {
        voiceActivity = new VoiceActivity({
          userId,
          username,
          globalName,
          avatar,
          voiceJoinCount: 0,
          totalVoiceTime: 0,
          userType: 'real_user'
        });
      }

      // Update voice activity
      voiceActivity.voiceJoinCount += 1;
      voiceActivity.lastVoiceJoin = new Date();
      voiceActivity.username = username;
      voiceActivity.globalName = globalName;
      voiceActivity.avatar = avatar;
      voiceActivity.updatedAt = new Date();
      await voiceActivity.save();

      // Create voice session
      const voiceSession = new VoiceSession({
        userId,
        username,
        globalName,
        channelId: newState.channelId,
        channelName: newState.channel?.name || 'Unknown Channel',
        joinTime: new Date()
      });
      await voiceSession.save();

      console.log(`✅ Voice join tracked for ${username}`);
    } catch (error) {
      console.error('Error handling voice join:', error);
    }
  }

  private async handleVoiceLeave(userId: string, oldState: VoiceState) {
    try {
      const username = oldState.member?.user.username || 'Unknown User';
      console.log(`🎤 User ${username} left voice channel: ${oldState.channel?.name}`);

      // Ensure MongoDB connection
      await connectDB();

      // Find the most recent voice session for this user
      const voiceSession = await VoiceSession.findOne({
        userId,
        channelId: oldState.channelId,
        leaveTime: { $exists: false }
      }).sort({ joinTime: -1 });

      if (voiceSession) {
        // Calculate duration
        const leaveTime = new Date();
        const duration = Math.round((leaveTime.getTime() - voiceSession.joinTime.getTime()) / (1000 * 60)); // in minutes

        // Update voice session
        voiceSession.leaveTime = leaveTime;
        voiceSession.duration = duration;
        await voiceSession.save();

        // Update voice activity
        const voiceActivity = await VoiceActivity.findOne({ userId });
        if (voiceActivity) {
          voiceActivity.totalVoiceTime += duration;
          voiceActivity.lastVoiceLeave = leaveTime;
          voiceActivity.updatedAt = new Date();
          await voiceActivity.save();
        }

        console.log(`✅ Voice leave tracked for ${username} - Duration: ${duration} minutes`);
        console.log(`🔍 Discord bot - User ID: ${userId}, Username: ${username}`);
        
        // Check and award daily voice reward
        await this.checkDailyVoiceReward(userId, username, duration);
      }
    } catch (error) {
      console.error('Error handling voice leave:', error);
    }
  }

  private async handleVoiceMove(userId: string, username: string, globalName: string, avatar: string, oldState: VoiceState, newState: VoiceState) {
    try {
      console.log(`🎤 User ${username} moved from ${oldState.channel?.name} to ${newState.channel?.name}`);

      // Handle the leave from old channel
      await this.handleVoiceLeave(userId, oldState);

      // Handle the join to new channel
      await this.handleVoiceJoin(userId, username, globalName, avatar, newState);
    } catch (error) {
      console.error('Error handling voice move:', error);
    }
  }

  private async checkDailyVoiceReward(userId: string, username: string, sessionDuration: number) {
    try {
      // Ensure MongoDB connection
      await connectDB();
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const DAILY_VOICE_REQUIREMENT = 15; // 15 minutes
      const TICKET_REWARD = 1; // 1 gacha ticket per day
      const COIN_REWARD = 10; // 10 coins per day (after 3-day streak)
      const STREAK_REQUIREMENT = 3; // 3 consecutive days for coins

      // Find or create daily voice reward record
      let dailyReward = await DailyVoiceReward.findOne({ userId, date: today });
      
      if (!dailyReward) {
        dailyReward = new DailyVoiceReward({
          userId,
          date: today,
          voiceTimeMinutes: 0,
          rewardClaimed: false,
          rewardAmount: 0
        });
      }

      // Add session duration to daily total
      dailyReward.voiceTimeMinutes += sessionDuration;
      dailyReward.updatedAt = new Date();
      
      // Check if user has reached the daily requirement and hasn't claimed reward yet
      if (dailyReward.voiceTimeMinutes >= DAILY_VOICE_REQUIREMENT && !dailyReward.rewardClaimed) {
        // Calculate current streak to determine coin eligibility
        const recentRewards = await DailyVoiceReward.find({ userId })
          .sort({ date: -1 })
          .limit(10); // Get last 10 days to calculate streak
        
        let currentStreak = 0;
        for (const reward of recentRewards) {
          if (reward.voiceTimeMinutes >= DAILY_VOICE_REQUIREMENT) {
            currentStreak++;
          } else {
            break; // Streak broken
          }
        }

        const isEligibleForCoins = currentStreak >= STREAK_REQUIREMENT;

        // Award ticket (always given)
        await this.awardTickets(userId, TICKET_REWARD, 'Daily voice activity reward (15+ minutes)');
        
        // Award coins (only if streak is 3+ days)
        if (isEligibleForCoins) {
          await this.awardCoins(userId, COIN_REWARD, 'Daily voice activity reward (3+ day streak)');
        }
        
        // Mark reward as claimed
        dailyReward.rewardClaimed = true;
        dailyReward.rewardAmount = TICKET_REWARD + (isEligibleForCoins ? COIN_REWARD : 0);
        
        const rewardMessage = isEligibleForCoins 
          ? `🎁 ${username} earned ${TICKET_REWARD} gacha ticket and ${COIN_REWARD} coins for ${dailyReward.voiceTimeMinutes} minutes of voice activity today! (${currentStreak} day streak)`
          : `🎁 ${username} earned ${TICKET_REWARD} gacha ticket for ${dailyReward.voiceTimeMinutes} minutes of voice activity today! (${currentStreak}/${STREAK_REQUIREMENT} days streak)`;
        
        console.log(rewardMessage);
      }

      await dailyReward.save();
      
      // Log progress if not yet reached requirement
      if (dailyReward.voiceTimeMinutes < DAILY_VOICE_REQUIREMENT && !dailyReward.rewardClaimed) {
        const remaining = DAILY_VOICE_REQUIREMENT - dailyReward.voiceTimeMinutes;
        console.log(`📊 ${username} has ${dailyReward.voiceTimeMinutes}/${DAILY_VOICE_REQUIREMENT} minutes today (${remaining} minutes remaining for reward)`);
      }

    } catch (error) {
      console.error('Error checking daily voice reward:', error);
    }
  }

  private async awardTickets(userId: string, amount: number, description: string) {
    try {
      // Ensure MongoDB connection
      await connectDB();
      
      // Ensure user exists in users collection before awarding tickets
      await this.ensureUserExists(userId);
      
      // Find or create ticket record
      const TicketSchema = new mongoose.Schema({
        userId: { type: String, required: true, unique: true },
        balance: { type: Number, default: 0 },
        totalEarned: { type: Number, default: 0 },
        totalSpent: { type: Number, default: 0 },
        lastTicketEarned: { type: Date, default: null },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
      });

      const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);
      
      let ticketData = await Ticket.findOne({ userId });
      
      if (!ticketData) {
        ticketData = new Ticket({
          userId,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          lastTicketEarned: null
        });
      }

      // Add tickets
      ticketData.balance += amount;
      ticketData.totalEarned += amount;
      ticketData.lastTicketEarned = new Date();
      ticketData.updatedAt = new Date();
      
      await ticketData.save();
      
      console.log(`🎫 Awarded ${amount} gacha ticket(s) to user ${userId}: ${description}`);
    } catch (error) {
      console.error('Error awarding tickets:', error);
    }
  }

  private async awardCoins(userId: string, amount: number, description: string) {
    try {
      // Ensure MongoDB connection
      await connectDB();
      
      // Ensure user exists in users collection before awarding coins
      await this.ensureUserExists(userId);
      
      // Find or create currency record
      let currency = await Currency.findOne({ userId });
      
      if (!currency) {
        currency = new Currency({
          userId,
          hamsterCoins: 0,
          totalEarned: 0,
          totalSpent: 0
        });
      }

      // Add coins
      currency.hamsterCoins += amount;
      currency.totalEarned += amount;
      currency.updatedAt = new Date();
      
      await currency.save();
      
      console.log(`💰 Awarded ${amount} HamsterCoins to user ${userId}: ${description}`);
    } catch (error) {
      console.error('Error awarding coins:', error);
    }
  }

  private async ensureUserExists(userId: string) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ discordId: userId });
      
      if (!existingUser) {
        // Fetch user data from Discord API
        const discordUser = await this.fetchDiscordUser(userId);
        
        if (discordUser) {
          // Create basic user record
          const newUser = new User({
            discordId: userId,
            username: discordUser.username,
            globalName: discordUser.global_name,
            avatar: discordUser.avatar,
            discriminator: discordUser.discriminator,
            lastLogin: new Date(),
            loginCount: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          await newUser.save();
          console.log(`👤 Created user record for ${discordUser.username} (${userId}) from voice activity`);
        } else {
          console.log(`⚠️ Could not fetch Discord user data for ${userId}, coins awarded anyway`);
        }
      }
    } catch (error) {
      console.error('Error ensuring user exists:', error);
      // Don't throw - we still want to award coins even if user creation fails
    }
  }

  private async fetchDiscordUser(userId: string) {
    try {
      if (!process.env.DISCORD_BOT_TOKEN) {
        return null;
      }

      const response = await fetch(`https://discord.com/api/v10/users/${userId}`, {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.log(`Failed to fetch Discord user ${userId}: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error('Error fetching Discord user:', error);
      return null;
    }
  }

  public async start() {
    try {
      if (!process.env.DISCORD_BOT_TOKEN) {
        throw new Error('Discord bot token not configured');
      }

      console.log('🤖 Starting Discord Bot...');
      
      // Connect to MongoDB first
      await connectDB();
      
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
    } catch (error) {
      console.error('Failed to start Discord bot:', error);
      this.isConnected = false;
    }
  }

  public async stop() {
    try {
      console.log('🤖 Stopping Discord Bot...');
      await this.client.destroy();
      this.isConnected = false;
    } catch (error) {
      console.error('Error stopping Discord bot:', error);
    }
  }

  public isBotConnected() {
    return this.isConnected;
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
            totalTime: { $sum: '$totalVoiceTime' },
            avgJoins: { $avg: '$voiceJoinCount' },
            avgTime: { $avg: '$totalVoiceTime' }
          }
        }
      ]);

      const totalUsers = await VoiceActivity.countDocuments();
      const realUsers = await VoiceActivity.countDocuments({ userType: 'real_user' });
      const suspiciousUsers = await VoiceActivity.countDocuments({ userType: 'suspicious_user' });

      // Get top voice users
      const topVoiceUsers = await VoiceActivity.find()
        .sort({ totalVoiceTime: -1 })
        .limit(10);

      // Get recent voice sessions
      const recentSessions = await VoiceSession.find()
        .sort({ joinTime: -1 })
        .limit(20);

      return {
        totalUsers,
        realUsers,
        suspiciousUsers,
        breakdown: stats,
        topVoiceUsers,
        recentSessions
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
      const voiceSessions = await VoiceSession.find({ userId }).sort({ joinTime: -1 }).limit(50);

      // Calculate additional statistics
      let totalSessions = 0;
      let totalDuration = 0;
      let avgSessionDuration = 0;
      let longestSession = 0;
      let mostActiveChannel = '';

      if (voiceSessions.length > 0) {
        totalSessions = voiceSessions.length;
        totalDuration = voiceSessions.reduce((sum, session) => sum + (session.duration || 0), 0);
        avgSessionDuration = Math.round(totalDuration / totalSessions);
        longestSession = Math.max(...voiceSessions.map(s => s.duration || 0));

        // Find most active channel
        const channelStats = voiceSessions.reduce((acc, session) => {
          const channel = session.channelName || 'Unknown';
          acc[channel] = (acc[channel] || 0) + (session.duration || 0);
          return acc;
        }, {} as { [key: string]: number });

        mostActiveChannel = Object.entries(channelStats)
          .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || '';
      }

      return {
        voiceActivity,
        voiceSessions,
        statistics: {
          totalSessions,
          totalDuration,
          avgSessionDuration,
          longestSession,
          mostActiveChannel
        }
      };
    } catch (error) {
      console.error('Error getting user voice activity:', error);
      return null;
    }
  }

  // Get voice activity for all users
  public static async getAllVoiceActivity(filter: string = 'all', limit: number = 50) {
    try {
      let query = {};
      if (filter && filter !== 'all') {
        query = { userType: filter };
      }

      const voiceActivities = await VoiceActivity.find(query)
        .sort({ totalVoiceTime: -1 })
        .limit(limit);

      return voiceActivities;
    } catch (error) {
      console.error('Error getting all voice activity:', error);
      return [];
    }
  }

  // Get server information
  public getServerInfo() {
    return {
      guildId: this.guildId,
      guildName: this.guildName,
      description: 'Voice activity tracking server',
      botConnected: this.isConnected,
      botUserId: this.client.user?.id || null,
      botUsername: this.client.user?.username || null
    };
  }

  // Static method for backwards compatibility
  public static getServerInfo() {
    return {
      guildId: '699984143542517801',
      guildName: 'Hamster Hub',
      description: 'Voice activity tracking server',
      botConnected: false,
      botUserId: null,
      botUsername: null
    };
  }
}

export default DiscordBot;
