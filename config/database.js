const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire';
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Do not crash the process here; allow the app to start without DB
    // so non-DB pages remain available. Upstream code can decide how to handle.
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
  } catch (error) {
    console.error('MongoDB disconnection error:', error);
  }
};

module.exports = { connectDB, disconnectDB };
