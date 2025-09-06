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

// User Visit Schema
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

const UserVisit = mongoose.models.UserVisit || mongoose.model('UserVisit', UserVisitSchema);

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const date = searchParams.get('date');

    let startDate: Date;
    let endDate: Date;

    if (date) {
      // Get stats for specific date
      const targetDate = new Date(date);
      startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    } else {
      // Get stats for last N days
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
    }

    // Get daily active users
    const dailyStats = await UserVisit.aggregate([
      {
        $match: {
          visitDate: {
            $gte: startDate,
            $lt: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$visitDate" } },
            userId: "$userId"
          },
          username: { $first: "$username" },
          globalName: { $first: "$globalName" },
          avatar: { $first: "$avatar" },
          firstVisit: { $min: "$visitTime" },
          lastVisit: { $max: "$visitTime" },
          totalVisits: { $sum: 1 },
          uniqueSessions: { $addToSet: "$sessionId" }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          date: { $first: "$_id.date" },
          uniqueUsers: { $sum: 1 },
          totalVisits: { $sum: "$totalVisits" },
          totalSessions: { $sum: { $size: "$uniqueSessions" } },
          users: {
            $push: {
              userId: "$_id.userId",
              username: "$username",
              globalName: "$globalName",
              avatar: "$avatar",
              firstVisit: "$firstVisit",
              lastVisit: "$lastVisit",
              totalVisits: "$totalVisits",
              sessionCount: { $size: "$uniqueSessions" }
            }
          }
        }
      },
      {
        $sort: { date: -1 }
      }
    ]);

    // Get overall statistics
    const overallStats = await UserVisit.aggregate([
      {
        $match: {
          visitDate: {
            $gte: startDate,
            $lt: endDate
          }
        }
      },
      {
        $group: {
          _id: null,
          totalUniqueUsers: { $addToSet: "$userId" },
          totalVisits: { $sum: 1 },
          totalSessions: { $addToSet: "$sessionId" },
          avgVisitsPerUser: { $avg: 1 }
        }
      },
      {
        $project: {
          totalUniqueUsers: { $size: "$totalUniqueUsers" },
          totalVisits: 1,
          totalSessions: { $size: "$totalSessions" },
          avgVisitsPerUser: 1
        }
      }
    ]);

    // Get hourly distribution for today
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const hourlyStats = await UserVisit.aggregate([
      {
        $match: {
          visitDate: {
            $gte: todayStart,
            $lt: todayEnd
          }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: "$visitTime" }
          },
          uniqueUsers: { $addToSet: "$userId" },
          totalVisits: { $sum: 1 }
        }
      },
      {
        $project: {
          hour: "$_id.hour",
          uniqueUsers: { $size: "$uniqueUsers" },
          totalVisits: 1
        }
      },
      {
        $sort: { hour: 1 }
      }
    ]);

    // Get top pages
    const topPages = await UserVisit.aggregate([
      {
        $match: {
          visitDate: {
            $gte: startDate,
            $lt: endDate
          }
        }
      },
      {
        $group: {
          _id: "$page",
          visits: { $sum: 1 },
          uniqueUsers: { $addToSet: "$userId" }
        }
      },
      {
        $project: {
          page: "$_id",
          visits: 1,
          uniqueUsers: { $size: "$uniqueUsers" }
        }
      },
      {
        $sort: { visits: -1 }
      },
      {
        $limit: 10
      }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days: days
        },
        dailyStats,
        overallStats: overallStats[0] || {
          totalUniqueUsers: 0,
          totalVisits: 0,
          totalSessions: 0,
          avgVisitsPerUser: 0
        },
        hourlyStats,
        topPages
      }
    });

  } catch (error) {
    console.error('Error fetching daily stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily stats' },
      { status: 500 }
    );
  }
}
