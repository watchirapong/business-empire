import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

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