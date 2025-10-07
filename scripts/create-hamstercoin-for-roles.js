const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');
const User = require('../models/User');
const Currency = require('../models/Currency');
require('dotenv').config();

// Role IDs to check for
const REQUIRED_ROLE_IDS = [
  '1397111512619028551',
  '1388546120912998554',
  '1409522065698193518',
  '849738417683693638'
];

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('📊 MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Create Discord client
const createDiscordClient = () => {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences
    ]
  });

  return client;
};

// Main function
const createHamsterCoinForRoles = async () => {
  console.log('🚀 Starting HamsterCoin creation for role members...');

  // Connect to database
  await connectDB();

  // Create Discord client
  const client = createDiscordClient();

  try {
    // Login to Discord
    console.log('🔗 Connecting to Discord...');
    await client.login(process.env.DISCORD_BOT_TOKEN);
    console.log('✅ Discord connected successfully');

    // Get the guild
    const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
    if (!guild) {
      throw new Error('Guild not found');
    }

    console.log(`📍 Found guild: ${guild.name}`);

    // Fetch all members
    console.log('👥 Fetching guild members...');
    await guild.members.fetch();
    console.log(`✅ Fetched ${guild.members.cache.size} members`);

    // Filter members who have the required roles
    const eligibleMembers = guild.members.cache.filter(member => {
      return REQUIRED_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
    });

    console.log(`🎯 Found ${eligibleMembers.size} members with required roles`);

    // Process each eligible member
    let processed = 0;
    let created = 0;
    let skipped = 0;

    for (const member of eligibleMembers.values()) {
      try {
        const discordId = member.user.id;
        const username = member.user.username;
        const nickname = member.nickname || member.user.globalName || username;

        console.log(`\n👤 Processing: ${username} (${discordId})`);
        console.log(`   Nickname: ${nickname}`);

        // Check if user exists in database
        let user = await User.findOne({ discordId });

        if (!user) {
          console.log(`   ⚠️  User not found in database, creating...`);
          user = new User({
            discordId,
            username,
            email: `${discordId}@discord.user`, // Placeholder email
            globalName: member.user.globalName,
            avatar: member.user.avatar
          });
          await user.save();
          console.log(`   ✅ User created in database`);
        } else {
          console.log(`   ℹ️  User already exists in database`);
        }

        // Check if currency already exists
        let currency = await Currency.findOne({ userId: discordId });

        if (!currency) {
          console.log(`   💰 Creating HamsterCoin currency...`);
          currency = new Currency({
            userId: discordId,
            hamsterCoins: 0, // Starting with 0, can be adjusted
            totalEarned: 0,
            totalSpent: 0
          });
          await currency.save();
          created++;
          console.log(`   ✅ HamsterCoin currency created`);
        } else {
          console.log(`   ℹ️  HamsterCoin currency already exists (${currency.hamsterCoins} coins)`);
          skipped++;
        }

        processed++;

        // Add small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error processing member ${member.user.username}:`, error.message);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total processed: ${processed}`);
    console.log(`   Currencies created: ${created}`);
    console.log(`   Currencies skipped: ${skipped}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Clean up
    client.destroy();
    await mongoose.disconnect();
    console.log('🧹 Cleanup completed');
  }
};

// Run the script
createHamsterCoinForRoles().catch(console.error);
