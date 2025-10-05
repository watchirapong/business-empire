import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../config/database';
import Project from '../../../../../models/Project';
import ProjectTask from '../../../../../models/Task';
import TimeEntry from '../../../../../models/TimeEntry';

// GET /api/analytics/custom-reports - Get custom analytics reports
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'overview';
    const userId = searchParams.get('userId');
    const projectId = searchParams.get('projectId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const baseQuery: any = {};
    
    if (userId) {
      baseQuery.userId = userId;
    }
    
    if (projectId) {
      baseQuery.projectId = projectId;
    }
    
    if (startDate && endDate) {
      baseQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    let reportData: any = {};

    switch (reportType) {
      case 'overview':
        // Get overview statistics
        const [projectCount, taskCount, timeEntryCount] = await Promise.all([
          Project.countDocuments(),
          ProjectTask.countDocuments(),
          TimeEntry.countDocuments()
        ]);

        const completedTaskCount = await ProjectTask.countDocuments({ status: 'completed' });
        const totalTimeSpent = await TimeEntry.aggregate([
          { $group: { _id: null, total: { $sum: '$duration' } } }
        ]);

        reportData = {
          projectCount,
          taskCount,
          completedTaskCount,
          timeEntryCount,
          totalTimeSpent: totalTimeSpent[0]?.total || 0,
          completionRate: taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0
        };
        break;

      case 'productivity':
        // Get productivity metrics
        const productivityData = await ProjectTask.aggregate([
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              },
              tasksCreated: { $sum: 1 },
              tasksCompleted: {
                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
              }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        reportData = {
          productivityData,
          averageTasksPerMonth: productivityData.length > 0 
            ? Math.round(productivityData.reduce((sum, item) => sum + item.tasksCreated, 0) / productivityData.length)
            : 0
        };
        break;

      case 'deadlines':
        // Get deadline analysis
        const deadlineData = await ProjectTask.aggregate([
          {
            $match: {
              dueDate: { $exists: true, $ne: null }
            }
          },
          {
            $group: {
              _id: {
                $cond: [
                  { $lt: ['$dueDate', new Date()] },
                  'overdue',
                  {
                    $cond: [
                      { $lt: ['$dueDate', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)] },
                      'due_soon',
                      'on_track'
                    ]
                  }
                ]
              },
              count: { $sum: 1 }
            }
          }
        ]);

        reportData = {
          deadlineData,
          totalTasksWithDeadlines: deadlineData.reduce((sum, item) => sum + item.count, 0)
        };
        break;

      case 'team':
        // Get team performance data
        const teamData = await ProjectTask.aggregate([
          {
            $match: {
              assignedToId: { $exists: true, $ne: null }
            }
          },
          {
            $group: {
              _id: '$assignedToId',
              totalTasks: { $sum: 1 },
              completedTasks: {
                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
              },
              averageCompletionTime: {
                $avg: {
                  $cond: [
                    { $eq: ['$status', 'completed'] },
                    { $subtract: ['$updatedAt', '$createdAt'] },
                    null
                  ]
                }
              }
            }
          }
        ]);

        reportData = {
          teamData,
          totalTeamMembers: teamData.length,
          averageTeamCompletionRate: teamData.length > 0
            ? Math.round(teamData.reduce((sum, member) => {
                const rate = member.totalTasks > 0 ? (member.completedTasks / member.totalTasks) * 100 : 0;
                return sum + rate;
              }, 0) / teamData.length)
            : 0
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      reportType,
      reportData,
      generatedAt: new Date().toISOString(),
      parameters: {
        userId,
        projectId,
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error('Error generating custom report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
