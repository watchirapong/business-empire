import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { isAdmin } from '@/lib/admin-config';

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
    enum: ['Selene', 'Pleiades', 'Ophira']
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user || !isAdmin((session.user as any).id)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user || !isAdmin((session.user as any).id)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { houseName, points, updateReason } = body;

    if (!houseName || points === undefined || points < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid data provided' },
        { status: 400 }
      );
    }

    if (!['Selene', 'Pleiades', 'Ophira'].includes(houseName)) {
      return NextResponse.json(
        { success: false, error: 'Invalid house name' },
        { status: 400 }
      );
    }

    await connectDB();

    // Update or create house points
    const housePoints = await HousePoints.findOneAndUpdate(
      { houseName },
      {
        points,
        lastUpdated: new Date(),
        updatedBy: (session.user as any).id,
        updateReason: updateReason || 'Manual update'
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      house: housePoints
    });

  } catch (error) {
    console.error('Error updating house points:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update house points' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user || !isAdmin((session.user as any).id)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { houseName, pointsToAdd, updateReason } = body;

    if (!houseName || pointsToAdd === undefined) {
      return NextResponse.json(
        { success: false, error: 'Invalid data provided' },
        { status: 400 }
      );
    }

    if (!['Selene', 'Pleiades', 'Ophira'].includes(houseName)) {
      return NextResponse.json(
        { success: false, error: 'Invalid house name' },
        { status: 400 }
      );
    }

    await connectDB();

    // Add points to existing house
    const housePoints = await HousePoints.findOneAndUpdate(
      { houseName },
      {
        $inc: { points: pointsToAdd },
        lastUpdated: new Date(),
        updatedBy: (session.user as any).id,
        updateReason: updateReason || 'Points added'
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      house: housePoints
    });

  } catch (error) {
    console.error('Error adding house points:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add house points' },
      { status: 500 }
    );
  }
}
