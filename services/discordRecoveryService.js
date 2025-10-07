const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');
const User = require('../models/User');
const Currency = require('../models/Currency');

class DiscordRecoveryService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
      ]
    });

    try {
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
      console.log('✅ Discord recovery service connected');
      this.isConnected = true;
    } catch (error) {
      console.error('❌ Discord recovery service connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      this.client.destroy();
      this.isConnected = false;
    }
  }

  async fetchUsersWithRole() {
    await this.connect();

    const guild = this.client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
    if (!guild) {
      throw new Error('Guild not found');
    }

    // Fetch all members
    await guild.members.fetch();

    // Role IDs to check for
    const REQUIRED_ROLE_IDS = [
      '1397111512619028551',
      '1388546120912998554',
      '1409522065698193518',
      '849738417683693638'
    ];

    // Filter members who have the required roles
    const eligibleMembers = guild.members.cache.filter(member => {
      return REQUIRED_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
    });

    // Convert to array of user objects
    const users = eligibleMembers.map(member => ({
      discordId: member.user.id,
      username: member.user.username,
      globalName: member.user.globalName,
      nickname: member.nickname,
      displayName: member.nickname || member.user.globalName || member.user.username,
      roles: member.roles.cache.map(role => role.id),
      joinedAt: member.joinedAt,
      avatar: member.user.avatar
    }));

    return users;
  }

  async performFullRecovery() {
    console.log('🚀 Starting full Discord user recovery...');

    const discordUsers = await this.fetchUsersWithRole();
    console.log(`👥 Found ${discordUsers.length} Discord users with required roles`);

    let processed = 0;
    let usersCreated = 0;
    let currenciesCreated = 0;
    let skipped = 0;

    for (const discordUser of discordUsers) {
      try {
        const { discordId, username, globalName, nickname, avatar } = discordUser;

        console.log(`\n👤 Processing: ${username} (${discordId})`);

        // Check if user exists in database
        let user = await User.findOne({ discordId });

        if (!user) {
          console.log(`   ⚠️  User not found in database, creating...`);
          user = new User({
            discordId,
            username,
            email: `${discordId}@discord.user`, // Placeholder email
            globalName,
            avatar,
            nickname
          });
          await user.save();
          usersCreated++;
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
            hamsterCoins: 0,
            totalEarned: 0,
            totalSpent: 0
          });
          await currency.save();
          currenciesCreated++;
          console.log(`   ✅ HamsterCoin currency created`);
        } else {
          console.log(`   ℹ️  HamsterCoin currency already exists (${currency.hamsterCoins} coins)`);
          skipped++;
        }

        processed++;

        // Add small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error processing user ${discordUser.username}:`, error.message);
      }
    }

    console.log(`\n📊 Recovery Summary:`);
    console.log(`   Total processed: ${processed}`);
    console.log(`   Users created: ${usersCreated}`);
    console.log(`   Currencies created: ${currenciesCreated}`);
    console.log(`   Currencies skipped: ${skipped}`);

    return {
      totalProcessed: processed,
      usersCreated,
      currenciesCreated,
      currenciesSkipped: skipped,
      discordUsers: discordUsers.length
    };
  }
}

module.exports = DiscordRecoveryService;