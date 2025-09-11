import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';

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
    required: false,
    default: 'system'
  },
  updateReason: {
    type: String,
    default: 'Manual update'
  }
});

const HousePoints = mongoose.models.HousePoints || mongoose.model('HousePoints', housePointsSchema);

// User Schema for email lookup
const UserSchema = new mongoose.Schema({
  discordId: String,
  username: String,
  email: String,
  avatar: String,
  discriminator: String,
  globalName: String,
  accessToken: String,
  refreshToken: String,
  lastLogin: Date,
  loginCount: Number,
  isActive: Boolean,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession();
    const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917', '315548736388333568'];

    if (!session) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Try to get user ID from session
    let userId = (session.user as any)?.id;
    
    // If no user ID in session, try to get it from email
    if (!userId && session.user?.email) {
      try {
        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (user) {
          userId = user.discordId;
        }
      } catch (error) {
        console.error('Error finding user by email:', error);
      }
    }

    if (!ADMIN_USER_IDS.includes(userId)) {
      return NextResponse.json({ error: 'Unauthorized - Not admin' }, { status: 401 });
    }

    await connectDB();

    const houses = await HousePoints.find({})
      .sort({ points: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      houses: houses
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
    // Check admin authorization
    const session = await getServerSession();
    const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917', '315548736388333568'];

    if (!session) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Try to get user ID from session
    let userId = (session.user as any)?.id;
    
    // If no user ID in session, try to get it from email
    if (!userId && session.user?.email) {
      try {
        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (user) {
          userId = user.discordId;
        }
      } catch (error) {
        console.error('Error finding user by email:', error);
      }
    }

    if (!ADMIN_USER_IDS.includes(userId)) {
      return NextResponse.json({ error: 'Unauthorized - Not admin' }, { status: 401 });
    }

    const body = await request.json();
    const { houseName, points, updateReason } = body;

    if (!houseName || points === undefined || points < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid data provided' },
        { status: 400 }
      );
    }

    if (!houseName || houseName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'House name is required' },
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
        updatedBy: userId || 'admin',
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
    // Check admin authorization
    const session = await getServerSession();
    const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917', '315548736388333568'];

    if (!session) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    // Try to get user ID from session
    let userId = (session.user as any)?.id;
    
    // If no user ID in session, try to get it from email
    if (!userId && session.user?.email) {
      try {
        await connectDB();
        const user = await User.findOne({ email: session.user.email });
        if (user) {
          userId = user.discordId;
        }
      } catch (error) {
        console.error('Error finding user by email:', error);
      }
    }

    if (!ADMIN_USER_IDS.includes(userId)) {
      return NextResponse.json({ error: 'Unauthorized - Not admin' }, { status: 401 });
    }

    const body = await request.json();
    const { houseName, pointsToAdd, updateReason } = body;

    if (!houseName || pointsToAdd === undefined) {
      return NextResponse.json(
        { success: false, error: 'Invalid data provided' },
        { status: 400 }
      );
    }

    if (!houseName || houseName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'House name is required' },
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
        updatedBy: userId || 'admin',
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
