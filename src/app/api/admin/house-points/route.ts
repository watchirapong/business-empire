import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { isAdmin } from '@/lib/admin-config';
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

// GET - Get all house points
export async function GET() {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Try to get user ID from session
    const userId = (session.user as any)?.id;
    
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Unauthorized - Not admin' }, { status: 401 });
    }

    await connectDB();

    const houses = await HousePoints.find({})
      .sort({ points: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      houses
    });

  } catch (error) {
    console.error('Error fetching house points:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch house points' },
      { status: 500 }
    );
  }
}

// POST - Update house points
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Try to get user ID from session
    const userId = (session.user as any)?.id;
    
    if (!isAdmin(userId)) {
      return NextResponse.json({ error: 'Unauthorized - Not admin' }, { status: 401 });
    }

    const body = await request.json();
    const { houseName, points, reason } = body;

    if (!houseName) {
      return NextResponse.json(
        { success: false, error: 'House name is required' },
        { status: 400 }
      );
    }

    if (points === undefined || points === null) {
      return NextResponse.json(
        { success: false, error: 'Points value is required' },
        { status: 400 }
      );
    }

    if (points < 0) {
      return NextResponse.json(
        { success: false, error: 'Points cannot be negative' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the house
    const house = await HousePoints.findOne({ houseName });
    if (!house) {
      return NextResponse.json(
        { success: false, error: 'House not found' },
        { status: 404 }
      );
    }

    // Update the house points
    house.points = points;
    house.lastUpdated = new Date();
    house.updatedBy = userId;
    house.updateReason = reason || 'Manual update';

    await house.save();

    return NextResponse.json({
      success: true,
      house: house.toObject(),
      message: `House "${houseName}" points updated to ${points}`
    });

  } catch (error) {
    console.error('Error updating house points:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update house points' },
      { status: 500 }
    );
  }
}