require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Server Member Data schema
const serverMemberDataSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  serverId: { type: String, required: true },
  serverData: {
    member: {
      user: {
        id: String,
        username: String,
        avatar: String
      },
      nick: String,
      roles: [String],
      joined_at: String
    },
    guild: {
      id: String,
      name: String,
      icon: String
    },
    serverInfo: {
      guildId: String,
      userId: String,
      joinedAt: String,
      roles: [String],
      nick: String,
      avatar: String,
      guildName: String,
      guildIcon: String
    }
  },
  lastUpdated: { type: Date, default: Date.now }
});

const ServerMemberData = mongoose.models.ServerMemberData || mongoose.model('ServerMemberData', serverMemberDataSchema);

// Role ID to rank mapping
const ROLE_ID_RANK_MAP = {
  '807189391927410728': 'Ace',
  '857990230472130561': 'Hero', 
  '1127432595081277484': 'Enigma',
  '1388546120912998554': 'Warrior',
  '1397111512619028551': 'Trainee'
};

// Rank priority (higher number = higher rank)
const RANK_PRIORITY = {
  'Ace': 5,
  'Hero': 4,
  'Enigma': 3,
  'Warrior': 2,
  'Trainee': 1
};

function getRankFromRoles(userData) {
  // Check different possible data structures
  let roleArray = [];
  
  console.log('userData.serverData keys:', Object.keys(userData.serverData || {}));
  console.log('Checking userData.serverData?.roles:', userData.serverData?.roles);
  console.log('Checking userData.serverData?.serverInfo?.roles:', userData.serverData?.serverInfo?.roles);
  console.log('Checking userData.serverData?.member?.roles:', userData.serverData?.member?.roles);
  console.log('Checking userData.roles:', userData.roles);
  
  if (userData.serverData?.roles) {
    roleArray = userData.serverData.roles;
    console.log('Found roles in userData.serverData.roles');
  } else if (userData.serverData?.serverInfo?.roles) {
    roleArray = userData.serverData.serverInfo.roles;
    console.log('Found roles in userData.serverData.serverInfo.roles');
  } else if (userData.serverData?.member?.roles) {
    roleArray = userData.serverData.member.roles;
    console.log('Found roles in userData.serverData.member.roles');
  } else if (userData.roles) {
    roleArray = userData.roles;
    console.log('Found roles in userData.roles');
  }

  console.log('Final roleArray:', roleArray);
  
  // If no roles, return None
  if (roleArray.length === 0) {
    return 'None';
  }

  // Find the highest priority role that the user has
  let highestRank = 'None';
  let highestPriority = 0;

  for (const userRoleId of roleArray) {
    if (ROLE_ID_RANK_MAP[userRoleId]) {
      const priority = RANK_PRIORITY[ROLE_ID_RANK_MAP[userRoleId]];
      console.log(`Role ${userRoleId} maps to ${ROLE_ID_RANK_MAP[userRoleId]} with priority ${priority}`);
      if (priority > highestPriority) {
        highestPriority = priority;
        highestRank = ROLE_ID_RANK_MAP[userRoleId];
      }
    }
  }

  return highestRank;
}

async function testRank() {
  try {
    await connectDB();
    
    // Check if there's any data for the HamsterHub server
    const allData = await ServerMemberData.find({ serverId: '699984143542517801' });
    console.log('Total records for HamsterHub server:', allData.length);
    
    if (allData.length > 0) {
      console.log('Sample data structure:');
      console.log(JSON.stringify(allData[0], null, 2));
    }
    
    // Check specific user
    const userData = await ServerMemberData.findOne({ 
      userId: '664458019442262018', 
      serverId: '699984143542517801' 
    });
    
    if (userData) {
      console.log('\nUser data found:');
      console.log(JSON.stringify(userData, null, 2));
      
      // Test the rank logic
      console.log('\n=== Testing Rank Logic ===');
      const rank = getRankFromRoles(userData);
      console.log(`Final rank for user 664458019442262018: ${rank}`);
      
      // Direct database query to see raw data
      console.log('\n=== Direct Database Query ===');
      const db = mongoose.connection.db;
      const rawData = await db.collection('servermemberdatas').findOne({ 
        userId: '664458019442262018', 
        serverId: '699984143542517801' 
      });
      console.log('Raw database data keys:', Object.keys(rawData.serverData || {}));
      console.log('Raw serverData.roles:', rawData.serverData?.roles);
      
      // Test the API logic with direct database query
      console.log('\n=== Testing API Logic with Direct DB Query ===');
      let roles: string[] = [];
      
      // Try to get roles from Mongoose model first (should fail)
      if (userData.serverData?.roles) {
        roles = userData.serverData.roles;
        console.log('Found roles via Mongoose (unexpected):', roles);
      } else if (userData.serverData?.serverInfo?.roles) {
        roles = userData.serverData.serverInfo.roles;
        console.log('Found roles via Mongoose serverInfo:', roles);
      } else if (userData.serverData?.member?.roles) {
        roles = userData.serverData.member.roles;
        console.log('Found roles via Mongoose member:', roles);
      } else if (userData.roles) {
        roles = userData.roles;
        console.log('Found roles via Mongoose root:', roles);
      }
      
      // If no roles found via Mongoose, try direct database query (should work)
      if (roles.length === 0) {
        console.log('No roles found via Mongoose, trying direct database query...');
        if (db) {
          const rawData = await db.collection('servermemberdatas').findOne({ 
            userId: '664458019442262018', 
            serverId: '699984143542517801' 
          });
          if (rawData?.serverData?.roles) {
            roles = rawData.serverData.roles;
            console.log('Found roles via direct database query:', roles);
          }
        }
      }
      
      console.log('Final roles array:', roles);
      
      // Test rank calculation
      if (roles.length > 0) {
        let highestRank = 'None';
        let highestPriority = 0;

        for (const userRoleId of roles) {
          if (ROLE_ID_RANK_MAP[userRoleId]) {
            const priority = RANK_PRIORITY[ROLE_ID_RANK_MAP[userRoleId]];
            console.log(`Role ${userRoleId} maps to ${ROLE_ID_RANK_MAP[userRoleId]} with priority ${priority}`);
            if (priority > highestPriority) {
              highestPriority = priority;
              highestRank = ROLE_ID_RANK_MAP[userRoleId];
            }
          }
        }
        console.log(`Final calculated rank: ${highestRank}`);
      } else {
        console.log('No roles found, rank: None');
      }
    } else {
      console.log('\nNo data found for user 664458019442262018');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

testRank();
