import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connections[0].readyState) {
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI!);
};

// Currency schema
const currencySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  hamsterCoins: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// User schema
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

// Username history schema
const usernameHistorySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  usernameHistory: [{
    username: { type: String, required: true },
    globalName: { type: String },
    discriminator: { type: String },
    nickname: { type: String },
    changedAt: { type: Date, default: Date.now }
  }],
  currentUsername: { type: String, required: true },
  currentGlobalName: { type: String },
  currentDiscriminator: { type: String },
  currentNickname: { type: String },
  lastUpdated: { type: Date, default: Date.now }
});

const Currency = mongoose.models.Currency || mongoose.model('Currency', currencySchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);
const UsernameHistory = mongoose.models.UsernameHistory || mongoose.model('UsernameHistory', usernameHistorySchema);

export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession();
    const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917', '315548736388333568'];

    if (!session) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    
    if (!ADMIN_USER_IDS.includes(userId)) {
      return NextResponse.json({ error: 'Unauthorized - Not admin' }, { status: 401 });
    }

    await connectDB();

    // Find all currency records that don't have corresponding user data
    const currencyRecords = await Currency.find({});
    const userIds = currencyRecords.map(c => c.userId);
    const existingUsers = await User.find({ discordId: { $in: userIds } });
    const existingUserIds = new Set(existingUsers.map(u => u.discordId));

    let fixed = 0;
    let failed = 0;

    // Process users without user data
    for (const currency of currencyRecords) {
      if (!existingUserIds.has(currency.userId)) {
        try {
          // Try to fetch user data from Discord API
          const response = await fetch(`${process.env.NEXTAUTH_URL}/api/users/get-server-nickname?userId=${currency.userId}`);
          
          if (response.ok) {
            const data = await response.json();
            
            // Create user record with Discord data
            const newUser = new User({
              discordId: currency.userId,
              username: data.username || `User${currency.userId.slice(-4)}`,
              globalName: data.globalName,
              avatar: data.avatar,
              discriminator: data.discriminator || '0',
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            await newUser.save();

            // Create username history record
            if (data.nickname || data.username) {
              const usernameHistory = new UsernameHistory({
                userId: currency.userId,
                usernameHistory: [{
                  username: data.username || `User${currency.userId.slice(-4)}`,
                  globalName: data.globalName,
                  discriminator: data.discriminator || '0',
                  nickname: data.nickname,
                  changedAt: new Date()
                }],
                currentUsername: data.username || `User${currency.userId.slice(-4)}`,
                currentGlobalName: data.globalName,
                currentDiscriminator: data.discriminator || '0',
                currentNickname: data.nickname,
                lastUpdated: new Date()
              });
              
              await usernameHistory.save();
            }

            fixed++;
            console.log(`✅ Fixed user data for ${currency.userId}: ${data.nickname || data.username}`);
          } else {
            failed++;
            console.log(`❌ Failed to fetch data for ${currency.userId}`);
          }
        } catch (error) {
          failed++;
          console.error(`Error fixing user ${currency.userId}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixed} users, ${failed} failed`,
      details: {
        totalCurrencyRecords: currencyRecords.length,
        existingUsers: existingUsers.length,
        fixed,
        failed
      }
    });

  } catch (error) {
    console.error('Fix user data error:', error);
    return NextResponse.json(
      { error: 'Failed to fix user data' },
      { status: 500 }
    );
  }
}
