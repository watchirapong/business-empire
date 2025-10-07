#!/usr/bin/env node

/**
 * Discord User Recovery Script
 * 
 * This script recovers user data from Discord after a MongoDB hack.
 * It fetches all users with role 1397111512619028551 and creates new accounts
 * with 100 hamstercoins each.
 * 
 * Usage: node scripts/discord-recovery.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import the recovery service
const DiscordRecoveryService = require('../services/discordRecoveryService');

async function main() {
  console.log('🔄 Starting Discord User Recovery Process...');
  console.log('=====================================');
  
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
    
    if (!process.env.DISCORD_GUILD_ID) {
      console.log('⚠️  DISCORD_GUILD_ID not set, using default: 699984143542517801');
    }
    
    console.log('🎯 Target Role ID: 1397111512619028551');
    console.log('🏰 Guild ID:', process.env.DISCORD_GUILD_ID || '699984143542517801');
    console.log('');
    
    // Create recovery service instance
    const recoveryService = new DiscordRecoveryService();
    
    // Perform the recovery
    const results = await recoveryService.performFullRecovery();
    
    console.log('');
    console.log('📊 Recovery Results:');
    console.log('===================');
    
    if (results.success) {
      console.log('✅ Recovery completed successfully!');
      console.log(`👥 Found ${results.discordUsers} users with target role`);
      
      if (results.saveResults) {
        console.log('');
        console.log('💾 User Data Recovery:');
        console.log(`   • Users Created: ${results.saveResults.created}`);
        console.log(`   • Users Updated: ${results.saveResults.updated}`);
        console.log(`   • Currency Accounts Created: ${results.saveResults.currencyCreated}`);
        console.log(`   • Errors: ${results.saveResults.errors}`);
        
        if (results.saveResults.errors > 0) {
          console.log('');
          console.log('❌ Errors encountered:');
          results.saveResults.errors.forEach(error => {
            console.log(`   • ${error.username} (${error.discordId}): ${error.error}`);
          });
        }
      }
      
      if (results.migrationResults) {
        console.log('');
        console.log('🔄 Enhanced Model Migration:');
        console.log(`   • Users Migrated: ${results.migrationResults.migrated}`);
        console.log(`   • Migration Errors: ${results.migrationResults.errors}`);
        
        if (results.migrationResults.errors > 0) {
          console.log('');
          console.log('❌ Migration errors:');
          results.migrationResults.errorDetails.forEach(error => {
            console.log(`   • ${error.username} (${error.discordId}): ${error.error}`);
          });
        }
      }
      
      console.log('');
      console.log('🎉 All users have been given 100 hamstercoins!');
      console.log('🔧 The enhanced user management system is now ready to use.');
      
    } else {
      console.log('❌ Recovery failed!');
      console.log(`Error: ${results.error}`);
    }
    
  } catch (error) {
    console.error('💥 Fatal error during recovery:', error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('');
    console.log('📡 Disconnected from MongoDB');
    console.log('🏁 Recovery process completed');
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

// Run the main function
main().catch(console.error);
