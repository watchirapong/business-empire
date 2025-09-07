require('dotenv').config();
const mongoose = require('mongoose');

// This simulates the profile redirect logic
async function testSessionLogic() {
  try {
    console.log('Testing profile redirect logic...\n');

    // Simulate different user ID scenarios
    const testUserIds = [
      '664458019442262018', // Real user from database
      '123456789012345678', // Fake user ID
      null, // No user ID
      undefined // Undefined user ID
    ];

    for (const userId of testUserIds) {
      console.log(`Testing with userId: ${userId}`);

      // This simulates the profile page redirect logic
      if (userId) {
        console.log(`  Would redirect to: /profile/${userId}`);

        // Simulate the profile API call
        await mongoose.connect(process.env.MONGODB_URI);
        const userCollection = mongoose.connection.collection('users');

        const userData = await userCollection.findOne({ discordId: userId });
        if (userData) {
          console.log(`  ✅ User found: ${userData.username} (${userData.globalName})`);
        } else {
          console.log(`  ❌ User not found in database`);
        }
      } else {
        console.log(`  ❌ No userId available, would redirect to /`);
      }

      console.log('');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testSessionLogic();
