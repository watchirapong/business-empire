'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, Clock, Users, CheckCircle, AlertCircle, Calendar, Filter, Download } from 'lucide-react';

interface Task {
  _id: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  projectId?: string;
  assignedToId?: string;
  assignedTo?: {
    username: string;
    displayName: string;
  };
  timeEntries?: Array<{
    duration: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  _id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
}

interface AnalyticsDashboardProps {
  tasks: Task[];
  projects: Project[];
  selectedProjectId?: string;
}

interface AnalyticsData {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  overdueTasks: number;
  totalTimeSpent: number;
  averageCompletionTime: number;
  tasksByPriority: {
    high: number;
    medium: number;
    low: number;
  };
  tasksByProject: Array<{
    projectId: string;
    projectName: string;
    projectColor: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  }>;
  tasksByAssignee: Array<{
    assigneeId: string;
    assigneeName: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  }>;
  weeklyProgress: Array<{
    week: string;
    completed: number;
    created: number;
  }>;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  tasks,
  projects,
  selectedProjectId
}) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'tasks' | 'time' | 'team'>('tasks');

  useEffect(() => {
    calculateAnalytics();
  }, [tasks, projects, selectedProjectId, timeRange]);

  const calculateAnalytics = () => {
    setLoading(true);

    // Filter tasks based on selected project
    const filteredTasks = selectedProjectId 
      ? tasks.filter(task => task.projectId === selectedProjectId)
      : tasks;

    // Filter tasks based on time range
    const now = new Date();
    const timeRangeDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    const cutoffDate = new Date(now.getTime() - timeRangeDays[timeRange] * 24 * 60 * 60 * 1000);
    const timeFilteredTasks = filteredTasks.filter(task => 
      new Date(task.createdAt) >= cutoffDate
    );

    // Calculate basic metrics
    const totalTasks = timeFilteredTasks.length;
    const completedTasks = timeFilteredTasks.filter(task => task.status === 'completed').length;
    const inProgressTasks = timeFilteredTasks.filter(task => task.status === 'in_progress').length;
    const notStartedTasks = timeFilteredTasks.filter(task => task.status === 'not_started').length;
    
    // Calculate overdue tasks
    const overdueTasks = timeFilteredTasks.filter(task => {
      if (!task.dueDate) return false;
      return new Date(task.dueDate) < now && task.status !== 'completed';
    }).length;

    // Calculate time metrics
    const totalTimeSpent = timeFilteredTasks.reduce((total, task) => {
      if (task.timeEntries) {
        return total + task.timeEntries.reduce((taskTotal, entry) => taskTotal + entry.duration, 0);
      }
      return total;
    }, 0);

    // Calculate average completion time (simplified)
    const completedTasksWithTime = timeFilteredTasks.filter(task => 
      task.status === 'completed' && task.timeEntries && task.timeEntries.length > 0
    );
    const averageCompletionTime = completedTasksWithTime.length > 0
      ? completedTasksWithTime.reduce((total, task) => {
          const taskTime = task.timeEntries?.reduce((sum, entry) => sum + entry.duration, 0) || 0;
          return total + taskTime;
        }, 0) / completedTasksWithTime.length
      : 0;

    // Calculate tasks by priority
    const tasksByPriority = {
      high: timeFilteredTasks.filter(task => task.priority === 'high').length,
      medium: timeFilteredTasks.filter(task => task.priority === 'medium').length,
      low: timeFilteredTasks.filter(task => task.priority === 'low').length,
    };

    // Calculate tasks by project
    const projectMap = new Map();
    timeFilteredTasks.forEach(task => {
      const projectId = task.projectId || 'unassigned';
      if (!projectMap.has(projectId)) {
        const project = projects.find(p => p._id === projectId);
        projectMap.set(projectId, {
          projectId,
          projectName: project?.name || 'Unassigned',
          projectColor: project?.color || '#6b7280',
          totalTasks: 0,
          completedTasks: 0,
        });
      }
      const projectData = projectMap.get(projectId);
      projectData.totalTasks++;
      if (task.status === 'completed') {
        projectData.completedTasks++;
      }
    });

    const tasksByProject = Array.from(projectMap.values()).map(project => ({
      ...project,
      completionRate: project.totalTasks > 0 ? (project.completedTasks / project.totalTasks) * 100 : 0
    }));

    // Calculate tasks by assignee
    const assigneeMap = new Map();
    timeFilteredTasks.forEach(task => {
      const assigneeId = task.assignedToId || 'unassigned';
      const assigneeName = task.assignedTo?.displayName || task.assignedTo?.username || 'Unassigned';
      
      if (!assigneeMap.has(assigneeId)) {
        assigneeMap.set(assigneeId, {
          assigneeId,
          assigneeName,
          totalTasks: 0,
          completedTasks: 0,
        });
      }
      const assigneeData = assigneeMap.get(assigneeId);
      assigneeData.totalTasks++;
      if (task.status === 'completed') {
        assigneeData.completedTasks++;
      }
    });

    const tasksByAssignee = Array.from(assigneeMap.values()).map(assignee => ({
      ...assignee,
      completionRate: assignee.totalTasks > 0 ? (assignee.completedTasks / assignee.totalTasks) * 100 : 0
    }));

    // Calculate weekly progress (simplified)
    const weeklyProgress = [];
    for (let i = 6; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const weekTasks = timeFilteredTasks.filter(task => {
        const taskDate = new Date(task.createdAt);
        return taskDate >= weekStart && taskDate < weekEnd;
      });
      
      const weekCompleted = weekTasks.filter(task => task.status === 'completed').length;
      
      weeklyProgress.push({
        week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed: weekCompleted,
        created: weekTasks.length
      });
    }

    setAnalyticsData({
      totalTasks,
      completedTasks,
      inProgressTasks,
      notStartedTasks,
      overdueTasks,
      totalTimeSpent,
      averageCompletionTime,
      tasksByPriority,
      tasksByProject,
      tasksByAssignee,
      weeklyProgress
    });

    setLoading(false);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getCompletionRate = () => {
    if (!analyticsData || analyticsData.totalTasks === 0) return 0;
    return (analyticsData.completedTasks / analyticsData.totalTasks) * 100;
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">No data available</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Track your project progress and team performance</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.totalTasks}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{analyticsData.completedTasks}</p>
              <p className="text-sm text-gray-500">
                {getCompletionRate().toFixed(1)}% completion rate
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{analyticsData.inProgressTasks}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{analyticsData.overdueTasks}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Time Tracking Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Tracking</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Time Spent</span>
              <span className="font-semibold text-gray-900">
                {formatDuration(analyticsData.totalTimeSpent)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Average per Task</span>
              <span className="font-semibold text-gray-900">
                {formatDuration(analyticsData.averageCompletionTime)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Priority Distribution</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">High Priority</span>
              </div>
              <span className="font-semibold text-gray-900">{analyticsData.tasksByPriority.high}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-600">Medium Priority</span>
              </div>
              <span className="font-semibold text-gray-900">{analyticsData.tasksByPriority.medium}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Low Priority</span>
              </div>
              <span className="font-semibold text-gray-900">{analyticsData.tasksByPriority.low}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Project Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Performance</h3>
          <div className="space-y-4">
            {analyticsData.tasksByProject.map((project) => (
              <div key={project.projectId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: project.projectColor }}
                  ></div>
                  <div>
                    <p className="font-medium text-gray-900">{project.projectName}</p>
                    <p className="text-sm text-gray-600">
                      {project.completedTasks}/{project.totalTasks} tasks
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${getProgressColor(project.completionRate)}`}>
                    {project.completionRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Performance</h3>
          <div className="space-y-4">
            {analyticsData.tasksByAssignee.slice(0, 5).map((assignee) => (
              <div key={assignee.assigneeId} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{assignee.assigneeName}</p>
                  <p className="text-sm text-gray-600">
                    {assignee.completedTasks}/{assignee.totalTasks} tasks
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${getProgressColor(assignee.completionRate)}`}>
                    {assignee.completionRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Progress Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Progress</h3>
        <div className="flex items-end gap-4 h-32">
          {analyticsData.weeklyProgress.map((week, index) => {
            const maxValue = Math.max(...analyticsData.weeklyProgress.map(w => Math.max(w.completed, w.created)));
            const completedHeight = (week.completed / maxValue) * 100;
            const createdHeight = (week.created / maxValue) * 100;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full h-24 flex items-end gap-1 mb-2">
                  <div 
                    className="flex-1 bg-green-500 rounded-t"
                    style={{ height: `${completedHeight}%` }}
                    title={`Completed: ${week.completed}`}
                  ></div>
                  <div 
                    className="flex-1 bg-blue-500 rounded-t"
                    style={{ height: `${createdHeight}%` }}
                    title={`Created: ${week.created}`}
                  ></div>
                </div>
                <span className="text-xs text-gray-600">{week.week}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600">Created</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;