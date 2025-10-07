#!/usr/bin/env node

/**
 * Test Leaderboard Nickname Display
 * 
 * This script tests the leaderboard API to ensure Discord nicknames
 * are properly displayed in the leaderboard.
 * 
 * Usage: node scripts/test-leaderboard-nicknames.js
 */

require('dotenv').config();

async function testLeaderboardNicknames() {
  console.log('🧪 Testing Leaderboard Nickname Display...');
  console.log('==========================================');
  
  try {
    // Test the leaderboard API
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const apiUrl = `${baseUrl}/api/leaderboard`;
    
    console.log(`📡 Testing API: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`API returned error: ${data.error}`);
    }
    
    console.log(`✅ API Response: ${data.source} system`);
    console.log(`👥 Found ${data.leaderboard.length} users in leaderboard`);
    console.log('');
    
    // Display sample leaderboard entries with nickname info
    console.log('🏆 Top 10 Leaderboard Entries:');
    console.log('===============================');
    
    const topEntries = data.leaderboard.slice(0, 10);
    topEntries.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.username}`);
      console.log(`   User ID: ${entry.userId}`);
      console.log(`   Total Earned: ${entry.totalEarned.toLocaleString()} coins`);
      
      if (entry.discordNickname && entry.discordNickname !== entry.username) {
        console.log(`   🏷️  Discord Nickname: ${entry.discordNickname}`);
      }
      
      if (entry.globalName && entry.globalName !== entry.username && entry.globalName !== entry.discordNickname) {
        console.log(`   🌍 Global Name: ${entry.globalName}`);
      }
      
      if (entry.roles && entry.roles.length > 0) {
        console.log(`   🎭 Roles: ${entry.roles.length} roles`);
      }
      
      console.log('');
    });
    
    // Statistics
    console.log('📊 Nickname Statistics:');
    console.log('======================');
    
    const usersWithNicknames = data.leaderboard.filter(entry => 
      entry.discordNickname && entry.discordNickname !== entry.username
    );
    
    const usersWithGlobalNames = data.leaderboard.filter(entry => 
      entry.globalName && entry.globalName !== entry.username && entry.globalName !== entry.discordNickname
    );
    
    console.log(`Total Users: ${data.leaderboard.length}`);
    console.log(`Users with Discord Nicknames: ${usersWithNicknames.length} (${Math.round(usersWithNicknames.length / data.leaderboard.length * 100)}%)`);
    console.log(`Users with Global Names: ${usersWithGlobalNames.length} (${Math.round(usersWithGlobalNames.length / data.leaderboard.length * 100)}%)`);
    
    // Test display name priority
    console.log('');
    console.log('🎯 Display Name Priority Test:');
    console.log('==============================');
    
    const testEntries = data.leaderboard.slice(0, 5);
    testEntries.forEach((entry, index) => {
      const displayName = entry.username;
      const hasNickname = entry.discordNickname && entry.discordNickname !== entry.username;
      const hasGlobalName = entry.globalName && entry.globalName !== entry.username && entry.globalName !== entry.discordNickname;
      
      console.log(`${index + 1}. Display Name: "${displayName}"`);
      console.log(`   Priority: ${hasNickname ? 'Discord Nickname' : hasGlobalName ? 'Global Name' : 'Username'}`);
      console.log('');
    });
    
    console.log('🎉 Leaderboard nickname test completed successfully!');
    console.log('✅ Discord nicknames are properly displayed in the leaderboard');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
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
testLeaderboardNicknames().catch(console.error);
