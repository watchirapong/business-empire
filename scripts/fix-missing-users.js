const mongoose = require('mongoose');

async function connectDB() {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    console.log('MongoDB Connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Define schemas
const currencySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  hamsterCoins: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
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

const voiceActivitySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: String,
  globalName: String,
  avatar: String,
  voiceJoinCount: { type: Number, default: 0 },
  totalVoiceTime: { type: Number, default: 0 },
  lastVoiceJoin: Date,
  lastVoiceLeave: Date,
  userType: { type: String, enum: ['real_user', 'suspicious_user'], default: 'suspicious_user' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Currency = mongoose.models.Currency || mongoose.model('Currency', currencySchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);
const VoiceActivity = mongoose.models.VoiceActivity || mongoose.model('VoiceActivity', voiceActivitySchema);

async function fixMissingUsers() {
  try {
    await connectDB();
    console.log('🔍 Starting fix for missing users...');

    // Get all currency records
    const currencyRecords = await Currency.find({});
    console.log(`📊 Found ${currencyRecords.length} currency records`);

    // Get all existing users
    const existingUsers = await User.find({});
    const existingUserIds = new Set(existingUsers.map(user => user.discordId));
    console.log(`👥 Found ${existingUsers.length} existing user records`);

    // Find currency records without corresponding user records
    const missingUserIds = currencyRecords
      .map(currency => currency.userId)
      .filter(userId => !existingUserIds.has(userId));

    console.log(`❌ Found ${missingUserIds.length} users with currency but no user record`);

    if (missingUserIds.length === 0) {
      console.log('✅ All users have proper records!');
      return;
    }

    // Get voice activity data for missing users
    const voiceActivities = await VoiceActivity.find({ 
      userId: { $in: missingUserIds } 
    });

    const voiceActivityMap = new Map();
    voiceActivities.forEach(activity => {
      voiceActivityMap.set(activity.userId, activity);
    });

    console.log(`🎤 Found voice activity data for ${voiceActivities.length} missing users`);

    let createdCount = 0;
    let skippedCount = 0;

    // Create user records for missing users
    for (const userId of missingUserIds) {
      const voiceActivity = voiceActivityMap.get(userId);
      
      if (voiceActivity && voiceActivity.username) {
        // Create user record from voice activity data
        try {
          const newUser = new User({
            discordId: userId,
            username: voiceActivity.username,
            globalName: voiceActivity.globalName,
            avatar: voiceActivity.avatar,
            lastLogin: new Date(),
            loginCount: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });

          await newUser.save();
          console.log(`✅ Created user record for ${voiceActivity.username} (${userId})`);
          createdCount++;
        } catch (error) {
          console.error(`❌ Failed to create user ${userId}:`, error.message);
          skippedCount++;
        }
      } else {
        console.log(`⚠️ No voice activity data found for user ${userId}, skipping`);
        skippedCount++;
      }
    }

    console.log('\n🎉 Fix completed!');
    console.log(`✅ Created: ${createdCount} user records`);
    console.log(`⚠️ Skipped: ${skippedCount} users (no voice data)`);
    console.log(`📊 Total processed: ${missingUserIds.length} users`);

  } catch (error) {
    console.error('❌ Error fixing missing users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix if this script is called directly
if (require.main === module) {
  fixMissingUsers();
}

module.exports = fixMissingUsers;