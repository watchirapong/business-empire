import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../../config/database';
import TimeEntry from '../../../../../models/TimeEntry';
import ProjectTask from '../../../../../models/Task';

// GET /api/analytics/time-analysis - Get time analysis analytics
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const projectId = searchParams.get('projectId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: any = {};
    
    if (userId) {
      query.userId = userId;
    }
    
    if (projectId) {
      query.projectId = projectId;
    }
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get time entries with task information
    const timeEntries = await TimeEntry.find(query)
      .populate('taskId', 'title projectId priority')
      .sort({ createdAt: -1 });

    // Group by date
    const dailyTimeData = timeEntries.reduce((acc, entry) => {
      const date = entry.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, totalTime: 0, entries: 0 };
      }
      acc[date].totalTime += entry.duration || 0;
      acc[date].entries += 1;
      return acc;
    }, {} as any);

    // Group by project
    const projectTimeData = timeEntries.reduce((acc, entry) => {
      const projectId = (entry.taskId as any)?.projectId || 'unknown';
      if (!acc[projectId]) {
        acc[projectId] = { projectId, totalTime: 0, entries: 0 };
      }
      acc[projectId].totalTime += entry.duration || 0;
      acc[projectId].entries += 1;
      return acc;
    }, {} as any);

    // Group by priority
    const priorityTimeData = timeEntries.reduce((acc, entry) => {
      const priority = (entry.taskId as any)?.priority || 'unknown';
      if (!acc[priority]) {
        acc[priority] = { priority, totalTime: 0, entries: 0 };
      }
      acc[priority].totalTime += entry.duration || 0;
      acc[priority].entries += 1;
      return acc;
    }, {} as any);

    // Calculate summary statistics
    const totalTime = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    const totalEntries = timeEntries.length;
    const averageTimePerEntry = totalEntries > 0 ? totalTime / totalEntries : 0;

    // Get most productive days
    const mostProductiveDays = Object.values(dailyTimeData)
      .sort((a: any, b: any) => b.totalTime - a.totalTime)
      .slice(0, 7);

    // Get most time-consuming projects
    const mostTimeConsumingProjects = Object.values(projectTimeData)
      .sort((a: any, b: any) => b.totalTime - a.totalTime)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      summary: {
        totalTime,
        totalEntries,
        averageTimePerEntry,
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null
        }
      },
      dailyTimeData: Object.values(dailyTimeData),
      projectTimeData: Object.values(projectTimeData),
      priorityTimeData: Object.values(priorityTimeData),
      mostProductiveDays,
      mostTimeConsumingProjects,
      recentEntries: timeEntries.slice(0, 20)
    });

  } catch (error) {
    console.error('Error fetching time analysis:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
