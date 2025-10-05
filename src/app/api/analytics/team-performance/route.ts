import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../config/database';
import ProjectTask from '../../../../../models/Task';
import TimeEntry from '../../../../../models/TimeEntry';

// GET /api/analytics/team-performance - Get team performance analytics
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: any = {};
    
    if (projectId) {
      query.projectId = projectId;
    }
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get task completion statistics by user
    const taskStats = await ProjectTask.aggregate([
      {
        $match: {
          ...query,
          assignedToId: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$assignedToId',
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          inProgressTasks: {
            $sum: {
              $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0]
            }
          },
          overdueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$dueDate', null] },
                    { $lt: ['$dueDate', new Date()] },
                    { $ne: ['$status', 'completed'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get time tracking statistics by user
    const timeStats = await TimeEntry.aggregate([
      {
        $match: query
      },
      {
        $group: {
          _id: '$userId',
          totalTime: { $sum: '$duration' },
          totalEntries: { $sum: 1 },
          averageTimePerEntry: { $avg: '$duration' }
        }
      }
    ]);

    // Combine statistics
    const teamPerformance = taskStats.map(taskStat => {
      const timeStat = timeStats.find(t => t._id === taskStat._id);
      const completionRate = taskStat.totalTasks > 0 
        ? Math.round((taskStat.completedTasks / taskStat.totalTasks) * 100)
        : 0;

      return {
        userId: taskStat._id,
        totalTasks: taskStat.totalTasks,
        completedTasks: taskStat.completedTasks,
        inProgressTasks: taskStat.inProgressTasks,
        overdueTasks: taskStat.overdueTasks,
        completionRate,
        totalTimeSpent: timeStat?.totalTime || 0,
        totalTimeEntries: timeStat?.totalEntries || 0,
        averageTimePerEntry: timeStat?.averageTimePerEntry || 0
      };
    });

    // Calculate team averages
    const teamAverages = {
      averageCompletionRate: teamPerformance.length > 0
        ? Math.round(teamPerformance.reduce((sum, member) => sum + member.completionRate, 0) / teamPerformance.length)
        : 0,
      totalTeamTasks: teamPerformance.reduce((sum, member) => sum + member.totalTasks, 0),
      totalTeamCompletedTasks: teamPerformance.reduce((sum, member) => sum + member.completedTasks, 0),
      totalTeamTimeSpent: teamPerformance.reduce((sum, member) => sum + member.totalTimeSpent, 0)
    };

    return NextResponse.json({
      success: true,
      teamPerformance,
      teamAverages
    });

  } catch (error) {
    console.error('Error fetching team performance analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
