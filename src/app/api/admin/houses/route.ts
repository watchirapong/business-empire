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

// GET - List all houses
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
    console.error('Error fetching houses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch houses' },
      { status: 500 }
    );
  }
}

// POST - Add new house
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
    const { houseName, initialPoints = 0 } = body;

    if (!houseName || houseName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'House name is required' },
        { status: 400 }
      );
    }

    if (houseName.trim().length > 50) {
      return NextResponse.json(
        { success: false, error: 'House name must be 50 characters or less' },
        { status: 400 }
      );
    }

    if (initialPoints < 0) {
      return NextResponse.json(
        { success: false, error: 'Initial points cannot be negative' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if house already exists
    const existingHouse = await HousePoints.findOne({ 
      houseName: houseName.trim() 
    });

    if (existingHouse) {
      return NextResponse.json(
        { success: false, error: 'House already exists' },
        { status: 400 }
      );
    }

    // Create new house
    const newHouse = new HousePoints({
      houseName: houseName.trim(),
      points: initialPoints,
      updatedBy: userId,
      updateReason: 'House created'
    });

    await newHouse.save();

    return NextResponse.json({
      success: true,
      house: newHouse,
      message: `House "${houseName}" created successfully with ${initialPoints} points`
    });

  } catch (error) {
    console.error('Error creating house:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create house' },
      { status: 500 }
    );
  }
}

// DELETE - Remove house
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const houseName = searchParams.get('houseName');

    if (!houseName) {
      return NextResponse.json(
        { success: false, error: 'House name is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if house exists
    const house = await HousePoints.findOne({ houseName });
    if (!house) {
      return NextResponse.json(
        { success: false, error: 'House not found' },
        { status: 404 }
      );
    }

    // Delete the house
    await HousePoints.deleteOne({ houseName });

    return NextResponse.json({
      success: true,
      message: `House "${houseName}" deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting house:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete house' },
      { status: 500 }
    );
  }
}