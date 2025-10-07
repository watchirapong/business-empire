import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

// User Behavior Schema
const UserBehaviorSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  globalName: { type: String },
  avatar: { type: String },
  behaviorType: { type: String, required: true },
  section: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed },
  visitDate: { type: Date, required: true },
  visitTime: { type: Date, required: true },
  userAgent: { type: String },
  ipAddress: { type: String },
  referrer: { type: String },
  sessionId: { type: String },
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
          totalActions: { $sum: 1 }
        }
      },
      {
        $project: {
          behaviorType: "$_id",
          uniqueUsers: { $size: "$uniqueUsers" },
          totalActions: 1
        }
      },
      {
        $sort: { totalActions: -1 }
      }
    ]);

    // Get top active users
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
          behaviorTypes: { $addToSet: "$behaviorType" }
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

    // Get purchase analytics
    const purchaseAnalytics = await UserBehavior.aggregate([
      {
        $match: {
          behaviorType: 'purchase',
          visitDate: {
            $gte: startDate,
            $lt: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$visitDate" } }
          },
          totalPurchases: { $sum: 1 },
          uniqueBuyers: { $addToSet: "$userId" },
          totalSpent: {
            $sum: {
              $cond: {
                if: { $and: [{ $ne: ["$details.amount", null] }, { $ne: ["$details.amount", undefined] }] },
                then: "$details.amount",
                else: 0
              }
            }
          }
        }
      },
      {
        $project: {
          date: "$_id.date",
          totalPurchases: 1,
          uniqueBuyers: { $size: "$uniqueBuyers" },
          totalSpent: 1,
          avgSpentPerPurchase: {
            $cond: {
              if: { $gt: ["$totalPurchases", 0] },
              then: { $divide: ["$totalSpent", "$totalPurchases"] },
              else: 0
            }
          }
        }
      },
      {
        $sort: { date: 1 }
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
            behaviorType: "$behaviorType"
          },
          uniqueUsers: { $addToSet: "$userId" },
          totalActions: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          date: { $first: "$_id.date" },
          behaviors: {
            $push: {
              behaviorType: "$_id.behaviorType",
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
          behaviors: 1,
          totalUniqueUsers: { $size: "$totalUniqueUsers" },
          totalActions: 1
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    // Try to enhance user data with Discord nicknames
    try {
      let EnhancedUser;
      try {
        EnhancedUser = mongoose.model('EnhancedUser');
      } catch (error) {
        // Enhanced user model not available
      }

      if (EnhancedUser && topUsers.length > 0) {
        // Get enhanced user data for top users
        const userIds = topUsers.map(user => user.userId);
        const enhancedUsers = await EnhancedUser.find({ discordId: { $in: userIds } });
        
        // Create a map of enhanced user data
        const enhancedUserMap = new Map();
        enhancedUsers.forEach(user => {
          enhancedUserMap.set(user.discordId, {
            discordNickname: user.discordServerData?.nickname,
            displayName: user.discordServerData?.nickname || user.globalName || user.username
          });
        });

        // Enhance top users with Discord nicknames
        topUsers.forEach(user => {
          const enhancedData = enhancedUserMap.get(user.userId);
          if (enhancedData) {
            user.discordNickname = enhancedData.discordNickname;
            user.displayName = enhancedData.displayName;
          }
        });
      }
    } catch (error) {
      console.error('Error enhancing behavior analytics data:', error);
    }

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
        purchaseAnalytics,
        dailyBehaviorTrends,
        source: 'enhanced'
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