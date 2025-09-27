require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const TARGET_USER_ID = '547402456363958273';
const API_URL = 'https://cartoon-christmas-function-compromise.trycloudflare.com/api/users';
const MAX_POINTS_PER_DAY = 2;
const REQUIRED_VOICE_TIME_MINUTES = 120; // 2 hours
const LOG_FILE = path.join(__dirname, '..', 'logs', 'asset-point-bot.log');

// Connect to MongoDB
async function connectDB() {
  if (mongoose.connections[0].readyState) {
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('📊 MongoDB connected successfully for Asset Point Bot');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

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

const VoiceActivity = mongoose.models.VoiceActivity || mongoose.model('VoiceActivity', VoiceActivitySchema);
const DailyVoiceReward = mongoose.models.DailyVoiceReward || mongoose.model('DailyVoiceReward', DailyVoiceRewardSchema);

// Function to log messages
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;

  console.log(message);

  try {
    fs.appendFileSync(LOG_FILE, logMessage);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

// Function to get today's date in YYYY-MM-DD format
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

// Function to read tracking data
function readTrackingData() {
  const trackingFile = path.join(__dirname, '..', 'data', 'asset-point-tracking.json');

  try {
    if (fs.existsSync(trackingFile)) {
      const data = fs.readFileSync(trackingFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    log(`Error reading tracking data: ${error.message}`);
  }

  // Return default structure
  return {
    lastRun: null,
    dailyCounts: {}
  };
}

// Function to write tracking data
function writeTrackingData(data) {
  const trackingFile = path.join(__dirname, '..', 'data', 'asset-point-tracking.json');

  try {
    // Ensure data directory exists
    const dataDir = path.dirname(trackingFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(trackingFile, JSON.stringify(data, null, 2));
  } catch (error) {
    log(`Error writing tracking data: ${error.message}`);
  }
}

// Function to check if user has enough voice time today
async function checkVoiceTimeRequirement(userId) {
  try {
    await connectDB();

    const today = getTodayDate();

    // Find today's voice reward record
    const dailyReward = await DailyVoiceReward.findOne({ userId, date: today });

    if (!dailyReward) {
      log(`📊 No voice activity found for user ${userId} today`);
      return false;
    }

    const voiceTime = dailyReward.voiceTimeMinutes || 0;
    log(`📊 User ${userId} has ${voiceTime}/${REQUIRED_VOICE_TIME_MINUTES} minutes of voice time today`);

    return voiceTime >= REQUIRED_VOICE_TIME_MINUTES;
  } catch (error) {
    log(`❌ Error checking voice time: ${error.message}`);
    return false;
  }
}

// Function to give asset point
async function giveAssetPoint() {
  try {
    // First check if user has enough voice time
    const hasEnoughVoiceTime = await checkVoiceTimeRequirement(TARGET_USER_ID);

    if (!hasEnoughVoiceTime) {
      log(`⏳ User ${TARGET_USER_ID} hasn't reached ${REQUIRED_VOICE_TIME_MINUTES} minutes of voice time yet. Skipping AssetPoint.`);
      return false;
    }

    const url = `${API_URL}/${TARGET_USER_ID}/assetPoint`;

    log(`Attempting to give 1 AssetPoint to user ${TARGET_USER_ID}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 1
      })
    });

    const responseData = await response.json();

    if (response.ok) {
      log(`✅ Successfully gave 1 AssetPoint to user ${TARGET_USER_ID} (after ${REQUIRED_VOICE_TIME_MINUTES} minutes voice time)`);
      return true;
    } else {
      log(`❌ Failed to give AssetPoint: ${response.status} - ${responseData.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    log(`❌ Network error while giving AssetPoint: ${error.message}`);
    return false;
  }
}

// Main function
async function main() {
  log('🚀 Starting Asset Point Bot...');

  const now = new Date();
  const today = getTodayDate();

  try {
    // Connect to database for voice activity check
    await connectDB();

    // Read tracking data
    const trackingData = readTrackingData();

    // Check if we've already given max points today
    const todayCount = trackingData.dailyCounts[today] || 0;

    if (todayCount >= MAX_POINTS_PER_DAY) {
      log(`📊 Already gave maximum ${MAX_POINTS_PER_DAY} AssetPoints today (${todayCount}). Skipping.`);
      return;
    }

    // Check if we should run (every 2 hours)
    const lastRun = trackingData.lastRun ? new Date(trackingData.lastRun) : null;
    const hoursSinceLastRun = lastRun ? (now - lastRun) / (1000 * 60 * 60) : 24; // 24 hours if never run

    if (hoursSinceLastRun < 2) {
      log(`⏰ Too soon since last run (${hoursSinceLastRun.toFixed(1)} hours ago). Minimum 2 hours required.`);
      return;
    }

    // Check current voice time for user
    const dailyReward = await DailyVoiceReward.findOne({ userId: TARGET_USER_ID, date: today });
    const currentVoiceTime = dailyReward ? dailyReward.voiceTimeMinutes || 0 : 0;

    log(`🎤 Current voice time for user ${TARGET_USER_ID}: ${currentVoiceTime}/${REQUIRED_VOICE_TIME_MINUTES} minutes`);

    // Give asset point (this function now checks voice time requirement internally)
    const success = await giveAssetPoint();

    if (success) {
      // Update tracking data
      trackingData.lastRun = now.toISOString();
      trackingData.dailyCounts[today] = todayCount + 1;

      writeTrackingData(trackingData);

      log(`📊 Daily count updated: ${trackingData.dailyCounts[today]}/${MAX_POINTS_PER_DAY} AssetPoints given today`);
    } else {
      log('❌ Failed to give AssetPoint (insufficient voice time or API error), tracking data not updated');
    }

  } catch (error) {
    log(`💥 Error in main function: ${error.message}`);
  }

  log('🏁 Asset Point Bot finished');
}

// Run the bot
if (require.main === module) {
  main().catch(error => {
    log(`💥 Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main, giveAssetPoint };
