import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// MongoDB connection
const connectDB = async () => {
  if (mongoose.connections[0]?.readyState === 1) {
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('MongoDB connected successfully');
};

// User Schema
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

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// UsernameHistory Schema
const UsernameHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  usernameHistory: [{
    username: String,
    globalName: String,
    discriminator: String,
    nickname: String,
    changedAt: { type: Date, default: Date.now }
  }],
  currentUsername: String,
  currentGlobalName: String,
  currentDiscriminator: String,
  currentNickname: String,
  lastUpdated: { type: Date, default: Date.now }
});

const UsernameHistory = mongoose.models.UsernameHistory || mongoose.model('UsernameHistory', UsernameHistorySchema);

// POST - Update all user nicknames (called by cron job)
export async function POST(request: NextRequest) {
  try {
    // Verify cron job secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;
    
    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const guildId = '699984143542517801'; // Your Discord server ID

    // Check if we have a bot token
    if (!process.env.DISCORD_BOT_TOKEN) {
      return NextResponse.json({ error: 'Discord bot token not configured' }, { status: 500 });
    }

    console.log('🔄 Starting daily nickname update process...');

    // Get all active users from database
    const users = await User.find({ isActive: true });
    console.log(`📊 Found ${users.length} active users to process`);

    const results = {
      total: users.length,
      updated: 0,
      noChange: 0,
      errors: [] as string[],
      notInServer: 0,
      noNickname: 0,
      failed: 0
    };

    // Process each user
    for (const user of users) {
      try {
        console.log(`🔄 Processing user: ${user.username} (${user.discordId})`);

        // Fetch current server member data from Discord
        const discordResponse = await fetch(
          `https://discord.com/api/v10/guilds/${guildId}/members/${user.discordId}`,
          {
            headers: {
              'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!discordResponse.ok) {
          if (discordResponse.status === 404) {
            console.log(`❌ User ${user.username} not found in server`);
            results.notInServer++;
            results.errors.push(`User ${user.username}: Not found in server`);
          } else {
            console.log(`❌ Failed to fetch data for user ${user.username}: ${discordResponse.status}`);
            results.failed++;
            results.errors.push(`User ${user.username}: Discord API error ${discordResponse.status}`);
          }
          continue;
        }

        const memberData = await discordResponse.json();
        const currentNickname = memberData.nick || null;

        if (!currentNickname) {
          console.log(`ℹ️ User ${user.username} has no nickname set`);
          results.noNickname++;
        }

        // Fetch user data from Discord
        const userResponse = await fetch(
          `https://discord.com/api/v10/users/${user.discordId}`,
          {
            headers: {
              'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );

        let userData = null;
        if (userResponse.ok) {
          userData = await userResponse.json();
        }

        // Update or create UsernameHistory
        let history = await UsernameHistory.findOne({ userId: user.discordId });

        if (!history) {
          // Create new history record
          history = new UsernameHistory({
            userId: user.discordId,
            usernameHistory: [{
              username: userData?.username || user.username,
              globalName: userData?.global_name || user.globalName,
              discriminator: userData?.discriminator || user.discriminator,
              nickname: currentNickname,
              changedAt: new Date()
            }],
            currentUsername: userData?.username || user.username,
            currentGlobalName: userData?.global_name || user.globalName,
            currentDiscriminator: userData?.discriminator || user.discriminator,
            currentNickname: currentNickname
          });
        } else {
          // Check if nickname has changed
          const hasChanged = history.currentNickname !== currentNickname ||
                           history.currentUsername !== (userData?.username || user.username) ||
                           history.currentGlobalName !== (userData?.global_name || user.globalName) ||
                           history.currentDiscriminator !== (userData?.discriminator || user.discriminator);

          if (hasChanged) {
            // Add to history
            history.usernameHistory.push({
              username: userData?.username || user.username,
              globalName: userData?.global_name || user.globalName,
              discriminator: userData?.discriminator || user.discriminator,
              nickname: currentNickname,
              changedAt: new Date()
            });

            // Update current values
            history.currentUsername = userData?.username || user.username;
            history.currentGlobalName = userData?.global_name || user.globalName;
            history.currentDiscriminator = userData?.discriminator || user.discriminator;
            history.currentNickname = currentNickname;
            history.lastUpdated = new Date();

            console.log(`✅ Updated nickname for ${user.username}: ${history.currentNickname || 'No nickname'} -> ${currentNickname || 'No nickname'}`);
            results.updated++;
          } else {
            console.log(`ℹ️ No changes for ${user.username}`);
            results.noChange++;
          }
        }

        await history.save();

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error processing user ${user.username}:`, error);
        results.failed++;
        results.errors.push(`User ${user.username}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('✅ Daily nickname update completed!');
    console.log('📊 Results:', results);

    return NextResponse.json({
      success: true,
      message: 'Daily nickname update completed',
      timestamp: new Date().toISOString(),
      results
    });

  } catch (error) {
    console.error('❌ Error in daily nickname update:', error);
    return NextResponse.json({ 
      error: 'Failed to update nicknames',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Manual trigger for testing (admin only)
export async function GET(request: NextRequest) {
  try {
    // For testing purposes, you can trigger this manually
    // In production, this should be disabled or require admin authentication
    
    const { searchParams } = new URL(request.url);
    const testMode = searchParams.get('test');
    
    if (testMode !== 'true') {
      return NextResponse.json({ error: 'Manual trigger disabled' }, { status: 403 });
    }

    // Call the POST method logic
    const postRequest = new NextRequest(request.url, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    return await POST(postRequest);

  } catch (error) {
    console.error('Error in manual nickname update:', error);
    return NextResponse.json({ 
      error: 'Failed to update nicknames',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
