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

// User Behavior Schema for tracking specific user actions
const UserBehaviorSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  globalName: { type: String },
  avatar: { type: String },
  behaviorType: { 
    type: String, 
    required: true,
    enum: ['shop_visit', 'gacha_play', 'university_visit', 'hamsterboard_visit', 'profile_visit', 'admin_visit', 'purchase', 'gacha_win', 'gacha_spend']
  },
  section: { 
    type: String, 
    required: true,
    enum: ['shop', 'gacha', 'university', 'hamsterboard', 'profile', 'admin', 'home']
  },
  action: { type: String, required: true }, // e.g., 'view_items', 'make_purchase', 'play_gacha', 'view_board'
  details: { type: mongoose.Schema.Types.Mixed }, // Additional data like item purchased, coins spent, etc.
  page: { type: String, required: true },
  visitDate: { type: Date, required: true },
  visitTime: { type: Date, required: true },
  sessionId: { type: String, required: true },
  userAgent: { type: String },
  ipAddress: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Create compound indexes for efficient queries
UserBehaviorSchema.index({ userId: 1, visitDate: 1 });
UserBehaviorSchema.index({ behaviorType: 1, visitDate: 1 });
UserBehaviorSchema.index({ section: 1, visitDate: 1 });
UserBehaviorSchema.index({ visitDate: 1 });

const UserBehavior = mongoose.models.UserBehavior || mongoose.model('UserBehavior', UserBehaviorSchema);

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { 
      userId, 
      username, 
      globalName, 
      avatar, 
      behaviorType, 
      section, 
      action, 
      details, 
      page, 
      sessionId 
    } = body;

    if (!userId || !username || !behaviorType || !section || !action || !page) {
      return NextResponse.json(
        { error: 'Required fields: userId, username, behaviorType, section, action, page' },
        { status: 400 }
      );
    }

    // Get client IP
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Create new behavior record
    const behavior = new UserBehavior({
      userId,
      username,
      globalName,
      avatar,
      behaviorType,
      section,
      action,
      details: details || {},
      page,
      visitDate: today,
      visitTime: now,
      sessionId: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userAgent: request.headers.get('user-agent'),
      ipAddress
    });

    await behavior.save();

    return NextResponse.json({
      success: true,
      message: 'Behavior tracked successfully',
      data: {
        behaviorId: behavior._id,
        behaviorType,
        section,
        action
      }
    });

  } catch (error) {
    console.error('Error tracking behavior:', error);
    return NextResponse.json(
      { error: 'Failed to track behavior' },
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
    const behaviorType = searchParams.get('behaviorType');
    const section = searchParams.get('section');
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

    if (behaviorType) {
      query.behaviorType = behaviorType;
    }

    if (section) {
      query.section = section;
    }

    const behaviors = await UserBehavior.find(query)
      .sort({ visitTime: -1 })
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: {
        behaviors,
        count: behaviors.length
      }
    });

  } catch (error) {
    console.error('Error fetching behaviors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch behaviors' },
      { status: 500 }
    );
  }
}
