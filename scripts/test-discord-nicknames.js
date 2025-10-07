#!/usr/bin/env node

/**
 * Test Discord Nickname Functionality
 * 
 * This script tests the Discord nickname recovery functionality
 * to ensure nicknames are properly captured and stored.
 * 
 * Usage: node scripts/test-discord-nicknames.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import the recovery service
const DiscordRecoveryService = require('../services/discordRecoveryService');

async function testDiscordNicknames() {
  console.log('🧪 Testing Discord Nickname Functionality...');
  console.log('==========================================');
  
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire';
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully');
    
    // Check environment variables
    if (!process.env.DISCORD_BOT_TOKEN) {
      throw new Error('DISCORD_BOT_TOKEN environment variable is required');
    }
    
    console.log('🎯 Target Role ID: 1397111512619028551');
    console.log('🏰 Guild ID:', process.env.DISCORD_GUILD_ID || '699984143542517801');
    console.log('');
    
    // Create recovery service instance
    const recoveryService = new DiscordRecoveryService();
    
    // Test 1: Fetch users from Discord
    console.log('🔍 Test 1: Fetching users from Discord...');
    const discordUsers = await recoveryService.fetchUsersWithRole();
    
    console.log(`✅ Found ${discordUsers.length} users with target role`);
    
    // Display sample users with their nickname data
    console.log('');
    console.log('👥 Sample Users with Nickname Data:');
    console.log('===================================');
    
    const sampleUsers = discordUsers.slice(0, 5); // Show first 5 users
    sampleUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.displayName}`);
      console.log(`   Username: @${user.username}`);
      console.log(`   Global Name: ${user.globalName || 'N/A'}`);
      console.log(`   Server Nickname: ${user.nickname || 'None'}`);
      console.log(`   Display Name: ${user.displayName}`);
      console.log(`   Roles: ${user.roles.length} roles`);
      console.log(`   Joined: ${new Date(user.joinedAt).toLocaleDateString()}`);
      console.log('');
    });
    
    // Test 2: Check nickname statistics
    console.log('📊 Nickname Statistics:');
    console.log('======================');
    
    const usersWithNicknames = discordUsers.filter(user => user.nickname);
    const usersWithoutNicknames = discordUsers.filter(user => !user.nickname);
    
    console.log(`Total Users: ${discordUsers.length}`);
    console.log(`Users with Server Nicknames: ${usersWithNicknames.length} (${Math.round(usersWithNicknames.length / discordUsers.length * 100)}%)`);
    console.log(`Users without Server Nicknames: ${usersWithoutNicknames.length} (${Math.round(usersWithoutNicknames.length / discordUsers.length * 100)}%)`);
    
    // Test 3: Test enhanced user model creation
    console.log('');
    console.log('🏗️  Test 3: Creating Enhanced User Model...');
    const EnhancedUser = await recoveryService.createEnhancedUserModel();
    console.log('✅ Enhanced User model created successfully');
    
    // Test 4: Test Discord server data update
    console.log('');
    console.log('🔄 Test 4: Testing Discord Server Data Update...');
    const serverDataResults = await recoveryService.updateDiscordServerData();
    console.log(`✅ Updated Discord server data for ${serverDataResults.updated} users`);
    
    if (serverDataResults.errors > 0) {
      console.log(`⚠️  ${serverDataResults.errors} errors occurred during update`);
      serverDataResults.errorDetails.forEach(error => {
        console.log(`   • ${error.username}: ${error.error}`);
      });
    }
    
    console.log('');
    console.log('🎉 All tests completed successfully!');
    console.log('✅ Discord nickname functionality is working correctly');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('');
    console.log('📡 Disconnected from MongoDB');
    console.log('🏁 Test completed');
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the test
testDiscordNicknames().catch(console.error);
