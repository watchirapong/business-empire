require('dotenv').config();
const mongoose = require('mongoose');

async function checkUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('Connected successfully');

    const userCollection = mongoose.connection.collection('users');
    const users = await userCollection.find({}, { id: 1, username: 1, global_name: 1 }).limit(10).toArray();

    console.log(`Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}, Username: ${user.username}, Global Name: ${user.global_name}`);
    });

    if (users.length === 0) {
      console.log('No users found in database. This might be the issue.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();
