import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/business-empire');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// House Points Schema
const housePointsSchema = new mongoose.Schema({
  houseName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 1,
    maxlength: 50
  },
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,
    required: true
  },
  updateReason: {
    type: String,
    default: 'Manual update'
  }
});

const HousePoints = mongoose.models.HousePoints || mongoose.model('HousePoints', housePointsSchema);

export async function GET() {
  try {
    await connectDB();

    // Get all houses with their points, sorted by points descending
    const houses = await HousePoints.find({})
      .sort({ points: -1 })
      .lean();

    // Return existing houses (no auto-creation of default houses)

    return NextResponse.json({
      success: true,
      houses
    });

  } catch (error) {
    console.error('Error fetching house leaderboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch house leaderboard' },
      { status: 500 }
    );
  }
}
