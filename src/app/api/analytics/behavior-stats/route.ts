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

// User Behavior Schema
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
  action: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed },
  page: { type: String, required: true },
  visitDate: { type: Date, required: true },
  visitTime: { type: Date, required: true },
  sessionId: { type: String, required: true },
  userAgent: { type: String },
  ipAddress: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const UserBehavior = mongoose.models.UserBehavior || mongoose.model('UserBehavior', UserBehaviorSchema);

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

    // Get section-wise statistics
    const sectionStats = await UserBehavior.aggregate([
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
            section: "$section",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$visitDate" } }
          },
          uniqueUsers: { $addToSet: "$userId" },
          totalActions: { $sum: 1 },
          actions: { $push: "$action" }
        }
      },
      {
        $group: {
          _id: "$_id.section",
          section: { $first: "$_id.section" },
          totalUniqueUsers: { $addToSet: { $arrayElemAt: ["$uniqueUsers", 0] } },
          totalActions: { $sum: "$totalActions" },
          dailyStats: {
            $push: {
              date: "$_id.date",
              uniqueUsers: { $size: "$uniqueUsers" },
              totalActions: "$totalActions"
            }
          }
        }
      },
      {
        $project: {
          section: 1,
          totalUniqueUsers: { $size: "$totalUniqueUsers" },
          totalActions: 1,
          dailyStats: 1
        }
      },
      {
        $sort: { totalActions: -1 }
      }
    ]);

    // Get behavior type statistics
    const behaviorTypeStats = await UserBehavior.aggregate([
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
          _id: "$behaviorType",
          uniqueUsers: { $addToSet: "$userId" },
          totalActions: { $sum: 1 },
          avgActionsPerUser: { $avg: 1 }
        }
      },
      {
        $project: {
          behaviorType: "$_id",
          uniqueUsers: { $size: "$uniqueUsers" },
          totalActions: 1,
          avgActionsPerUser: 1
        }
      },
      {
        $sort: { totalActions: -1 }
      }
    ]);

    // Get top users by activity
    const topUsers = await UserBehavior.aggregate([
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
          _id: "$userId",
          username: { $first: "$username" },
          globalName: { $first: "$globalName" },
          avatar: { $first: "$avatar" },
          totalActions: { $sum: 1 },
          sections: { $addToSet: "$section" },
          behaviorTypes: { $addToSet: "$behaviorType" },
          lastActivity: { $max: "$visitTime" },
          firstActivity: { $min: "$visitTime" }
        }
      },
      {
        $project: {
          userId: "$_id",
          username: 1,
          globalName: 1,
          avatar: 1,
          totalActions: 1,
          sections: 1,
          behaviorTypes: 1,
          lastActivity: 1,
          firstActivity: 1,
          sectionCount: { $size: "$sections" },
          behaviorTypeCount: { $size: "$behaviorTypes" }
        }
      },
      {
        $sort: { totalActions: -1 }
      },
      {
        $limit: 20
      }
    ]);

    // Get daily behavior trends
    const dailyBehaviorTrends = await UserBehavior.aggregate([
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
            section: "$section"
          },
          uniqueUsers: { $addToSet: "$userId" },
          totalActions: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          date: { $first: "$_id.date" },
          sections: {
            $push: {
              section: "$_id.section",
              uniqueUsers: { $size: "$uniqueUsers" },
              totalActions: "$totalActions"
            }
          },
          totalUniqueUsers: { $addToSet: { $arrayElemAt: ["$uniqueUsers", 0] } },
          totalActions: { $sum: "$totalActions" }
        }
      },
      {
        $project: {
          date: 1,
          sections: 1,
          totalUniqueUsers: { $size: "$totalUniqueUsers" },
          totalActions: 1
        }
      },
      {
        $sort: { date: -1 }
      }
    ]);

    // Get purchase and gacha statistics
    const purchaseStats = await UserBehavior.aggregate([
      {
        $match: {
          visitDate: {
            $gte: startDate,
            $lt: endDate
          },
          behaviorType: { $in: ['purchase', 'gacha_spend'] }
        }
      },
      {
        $group: {
          _id: "$behaviorType",
          totalSpent: { $sum: "$details.coinsSpent" },
          totalTransactions: { $sum: 1 },
          uniqueUsers: { $addToSet: "$userId" },
          avgSpentPerUser: { $avg: "$details.coinsSpent" }
        }
      },
      {
        $project: {
          behaviorType: "$_id",
          totalSpent: 1,
          totalTransactions: 1,
          uniqueUsers: { $size: "$uniqueUsers" },
          avgSpentPerUser: 1
        }
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
        sectionStats,
        behaviorTypeStats,
        topUsers,
        dailyBehaviorTrends,
        purchaseStats
      }
    });

  } catch (error) {
    console.error('Error fetching behavior stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch behavior stats' },
      { status: 500 }
    );
  }
}
