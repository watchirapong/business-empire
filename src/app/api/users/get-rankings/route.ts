import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// Define schemas locally
const currencySchema = new mongoose.Schema({
  userId: String,
  hamsterCoins: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 }
});

const serverMemberDataSchema = new mongoose.Schema({
  userId: String,
  serverId: String,
  serverData: mongoose.Schema.Types.Mixed
}, { strict: false });

const Currency = mongoose.models.Currency || mongoose.model('Currency', currencySchema);
const ServerMemberData = mongoose.models.ServerMemberData || mongoose.model('ServerMemberData', serverMemberDataSchema);

// House role mappings
const HOUSE_ROLE_MAP = {
  '1407921062808785017': 'Selene',
  '1407921679757344888': 'Pleiades',
  '1407921686526824478': 'Ophira'
};

async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    await connectDB();

    // Get user's house
    const serverData = await ServerMemberData.findOne({ 
      userId, 
      serverId: '699984143542517801' 
    });

    let userHouse = 'None';
    if (serverData?.serverData?.roles) {
      const roles = serverData.serverData.roles;
      for (const roleId of roles) {
        if (HOUSE_ROLE_MAP[roleId as keyof typeof HOUSE_ROLE_MAP]) {
          userHouse = HOUSE_ROLE_MAP[roleId as keyof typeof HOUSE_ROLE_MAP];
          break;
        }
      }
    }

    // Get all users with their earnings
    const allUsers = await Currency.find({}).sort({ totalEarned: -1 });
    
    // Find user's global rank
    const userGlobalRank = allUsers.findIndex(user => user.userId === userId) + 1;
    
    // Get house members and their rankings
    let houseRank = 0;
    let houseMembersCount = 0;
    if (userHouse !== 'None') {
      const houseMembers = [];
      
      // Get all server members and filter by house
      const allServerMembers = await ServerMemberData.find({ 
        serverId: '699984143542517801' 
      });

      for (const member of allServerMembers) {
        if (member.serverData?.roles) {
          const roles = member.serverData.roles;
          for (const roleId of roles) {
            if (HOUSE_ROLE_MAP[roleId as keyof typeof HOUSE_ROLE_MAP] === userHouse) {
              // Get this member's currency data
              const memberCurrency = await Currency.findOne({ userId: member.userId });
              if (memberCurrency) {
                houseMembers.push({
                  userId: member.userId,
                  totalEarned: memberCurrency.totalEarned || 0
                });
              }
              break;
            }
          }
        }
      }

      // Sort house members by earnings and find user's rank
      houseMembers.sort((a, b) => b.totalEarned - a.totalEarned);
      const userHouseRank = houseMembers.findIndex(member => member.userId === userId) + 1;
      houseRank = userHouseRank > 0 ? userHouseRank : 0;
      houseMembersCount = houseMembers.length;
    }

    return NextResponse.json({
      success: true,
      globalRank: userGlobalRank > 0 ? userGlobalRank : 0,
      houseRank: houseRank,
      house: userHouse,
      totalMembers: allUsers.length,
      houseMembers: houseMembersCount
    });

  } catch (error) {
    console.error('Error getting user rankings:', error);
    return NextResponse.json({ 
      error: 'Failed to get user rankings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
