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

// GET - List all houses
export async function GET() {
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
      lastUpdated: new Date(),
      updatedBy: userId || 'admin',
      updateReason: 'House created'
    });

    await newHouse.save();

    return NextResponse.json({
      success: true,
      message: `House "${houseName.trim()}" created successfully`,
      house: newHouse
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
