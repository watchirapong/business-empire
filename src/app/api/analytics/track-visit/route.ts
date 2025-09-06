import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    if (mongoose.connections[0].readyState) {
      return;
    }
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// User Visit Schema for tracking daily active users
const UserVisitSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  globalName: { type: String },
  avatar: { type: String },
  visitDate: { type: Date, required: true },
  visitTime: { type: Date, required: true },
  userAgent: { type: String },
  ipAddress: { type: String },
  referrer: { type: String },
  page: { type: String },
  sessionId: { type: String },
  isNewSession: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Create compound index for efficient queries
UserVisitSchema.index({ userId: 1, visitDate: 1 });
UserVisitSchema.index({ visitDate: 1 });
UserVisitSchema.index({ userId: 1, visitTime: 1 });

const UserVisit = mongoose.models.UserVisit || mongoose.model('UserVisit', UserVisitSchema);

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { userId, username, globalName, avatar, page, sessionId, userAgent, referrer } = body;

    if (!userId || !username) {
      return NextResponse.json(
        { error: 'User ID and username are required' },
        { status: 400 }
      );
    }

    // Get client IP
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if this is a new session for today
    const existingSession = await UserVisit.findOne({
      userId,
      visitDate: today,
      sessionId
    });

    const isNewSession = !existingSession;

    // Create new visit record
    const visit = new UserVisit({
      userId,
      username,
      globalName,
      avatar,
      visitDate: today,
      visitTime: now,
      userAgent: userAgent || request.headers.get('user-agent'),
      ipAddress,
      referrer: referrer || request.headers.get('referer'),
      page: page || 'unknown',
      sessionId: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isNewSession
    });

    await visit.save();

    return NextResponse.json({
      success: true,
      message: 'Visit tracked successfully',
      data: {
        visitId: visit._id,
        isNewSession,
        sessionId: visit.sessionId
      }
    });

  } catch (error) {
    console.error('Error tracking visit:', error);
    return NextResponse.json(
      { error: 'Failed to track visit' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '100');

    const query: any = {};

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      
      query.visitDate = {
        $gte: startOfDay,
        $lt: endOfDay
      };
    }

    if (userId) {
      query.userId = userId;
    }

    const visits = await UserVisit.find(query)
      .sort({ visitTime: -1 })
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: {
        visits,
        count: visits.length
      }
    });

  } catch (error) {
    console.error('Error fetching visits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch visits' },
      { status: 500 }
    );
  }
}
