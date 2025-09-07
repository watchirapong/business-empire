require('dotenv').config();
const mongoose = require('mongoose');

async function checkCollections() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('Connected successfully');

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:');
    collections.forEach((col, index) => {
      console.log(`${index + 1}. ${col.name}`);
    });

    // Check if users collection exists and get a sample
    try {
      const userCollection = mongoose.connection.collection('users');
      const userCount = await userCollection.countDocuments();
      console.log(`\nUsers collection has ${userCount} documents`);

      if (userCount > 0) {
        const sampleUser = await userCollection.findOne({});
        console.log('Sample user document:');
        console.log(JSON.stringify(sampleUser, null, 2));
      }
    } catch (error) {
      console.log('Error accessing users collection:', error.message);
    }

    // Check if serverdatas collection exists and get a sample
    try {
      const serverDataCollection = mongoose.connection.collection('serverdatas');
      const serverDataCount = await serverDataCollection.countDocuments();
      console.log(`\nServerdatas collection has ${serverDataCount} documents`);

      if (serverDataCount > 0) {
        const sampleServerData = await serverDataCollection.findOne({});
        console.log('Sample serverdatas document:');
        console.log(JSON.stringify(sampleServerData, null, 2));
      }
    } catch (error) {
      console.log('Error accessing serverdatas collection:', error.message);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCollections();
