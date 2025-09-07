require('dotenv').config();
const mongoose = require('mongoose');

async function fixUserIds() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('Connected successfully');

    const userCollection = mongoose.connection.collection('users');

    // Get all users with undefined IDs
    const usersWithUndefinedIds = await userCollection.find({ id: { $exists: false } }).toArray();
    console.log(`Found ${usersWithUndefinedIds.length} users with undefined IDs`);

    // Get all users where id is null or undefined
    const usersWithNullIds = await userCollection.find({ $or: [{ id: null }, { id: undefined }] }).toArray();
    console.log(`Found ${usersWithNullIds.length} users with null/undefined IDs`);

    // For now, let's create a mapping based on existing data
    // We'll need to update these users when they log in again
    console.log('\nUsers that need ID fixes:');
    usersWithUndefinedIds.forEach((user, index) => {
      console.log(`${index + 1}. Username: ${user.username}, Email: ${user.email}`);
    });

    console.log('\nTo fix this issue:');
    console.log('1. Users need to log out and log back in');
    console.log('2. The updated authentication will properly store their Discord IDs');
    console.log('3. Or we can manually update user IDs if we have the Discord ID information');

    // Ask if user wants to see the actual user documents
    console.log('\nFirst few user documents:');
    const sampleUsers = await userCollection.find({}).limit(3).toArray();
    sampleUsers.forEach((user, index) => {
      console.log(`${index + 1}.`, JSON.stringify(user, null, 2));
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixUserIds();
