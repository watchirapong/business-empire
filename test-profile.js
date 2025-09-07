require('dotenv').config();
const mongoose = require('mongoose');

async function testProfile() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);

    // Get a sample user from the database
    const userCollection = mongoose.connection.collection('users');
    const sampleUser = await userCollection.findOne({});
    console.log('Sample user from database:');
    console.log(JSON.stringify(sampleUser, null, 2));

    // Test the profile API logic
    if (sampleUser && sampleUser.discordId) {
      console.log('\nTesting profile API logic with userId:', sampleUser.discordId);

      // This simulates what the profile API does
      const userData = await userCollection.findOne({ discordId: sampleUser.discordId });
      console.log('User found with discordId query:', !!userData);

      if (userData) {
        console.log('User data:', {
          discordId: userData.discordId,
          username: userData.username,
          globalName: userData.globalName
        });
      }

      // Try with wrong field name (what the old code might have done)
      const wrongQuery = await userCollection.findOne({ id: sampleUser.discordId });
      console.log('User found with id query (should be false):', !!wrongQuery);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testProfile();
