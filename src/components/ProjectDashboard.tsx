'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Users, Clock, CheckCircle, AlertCircle, TrendingUp, BarChart3, Filter, Search, MoreHorizontal, Edit, Trash2, Archive, Star } from 'lucide-react';

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
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Project {
  _id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  members?: string[];
  isArchived?: boolean;
  isStarred?: boolean;
  ownerId?: string;
}

interface ProjectDashboardProps {
  projects: Project[];
  tasks: Task[];
  onProjectSelect: (projectId: string) => void;
  onProjectCreate: (project: Partial<Project>) => Promise<void>;
  onShowProjectForm: () => void;
  onProjectUpdate: (projectId: string, updates: Partial<Project>) => Promise<void>;
  onProjectDelete: (projectId: string) => Promise<void>;
  onTaskCreate: (task: Partial<Task>) => Promise<void>;
  currentUser?: any;
}

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  projects,
  tasks,
  onProjectSelect,
  onProjectCreate,
  onShowProjectForm,
  onProjectUpdate,
  onProjectDelete,
  onTaskCreate,
  currentUser
}) => {
  // Project creation is now handled by the main page
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated' | 'tasks'>('updated');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Colors array removed - project creation handled by main page

  // Filter and sort projects
  const filteredProjects = projects
    .filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilter = filterStatus === 'all' || 
                           (filterStatus === 'active' && !project.isArchived) ||
                           (filterStatus === 'archived' && project.isArchived);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'tasks':
          const aTasks = tasks.filter(task => task.projectId === a._id).length;
          const bTasks = tasks.filter(task => task.projectId === b._id).length;
          return bTasks - aTasks;
        default:
          return 0;
      }
    });

  const getProjectStats = (projectId: string) => {
    const projectTasks = tasks.filter(task => task.projectId === projectId);
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(task => task.status === 'completed').length;
    const inProgressTasks = projectTasks.filter(task => task.status === 'in_progress').length;
    const overdueTasks = projectTasks.filter(task => {
      if (!task.dueDate) return false;
      return new Date(task.dueDate) < new Date() && task.status !== 'completed';
    }).length;
    
    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    };
  };

  const getRecentTasks = (projectId: string, limit: number = 3) => {
    return tasks
      .filter(task => task.projectId === projectId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  };

  // Project creation is now handled by the main page

  const handleToggleStar = async (projectId: string, isStarred: boolean) => {
    try {
      await onProjectUpdate(projectId, { isStarred: !isStarred });
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const handleToggleArchive = async (projectId: string, isArchived: boolean) => {
    try {
      await onProjectUpdate(projectId, { isArchived: !isArchived });
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'in_progress': return <Clock className="w-3 h-3 text-blue-600" />;
      default: return <AlertCircle className="w-3 h-3 text-gray-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Dashboard</h2>
          <p className="text-gray-600">Manage and track all your projects</p>
        </div>
        <button
          onClick={onShowProjectForm}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="all">All Projects</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="updated">Last Updated</option>
            <option value="created">Date Created</option>
            <option value="name">Name</option>
            <option value="tasks">Task Count</option>
          </select>
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'} transition-colors`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'} transition-colors`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Projects Grid/List */}
      {filteredProjects.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery ? 'Try adjusting your search terms' : 'Get started by creating your first project'}
            </p>
            {!searchQuery && (
              <button
                onClick={onShowProjectForm}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Create Project
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={`flex-1 ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}`}>
          {filteredProjects.map((project) => {
            const stats = getProjectStats(project._id);
            const recentTasks = getRecentTasks(project._id);

            return (
              <div
                key={project._id}
                className={`bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer ${
                  viewMode === 'list' ? 'p-4' : 'p-6'
                }`}
                onClick={() => onProjectSelect(project._id)}
              >
                {/* Project Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: project.color }}
                    ></div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{project.name}</h3>
                      {project.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStar(project._id, project.isStarred || false);
                      }}
                      className={`p-1 rounded hover:bg-gray-100 transition-colors ${
                        project.isStarred ? 'text-yellow-500' : 'text-gray-400'
                      }`}
                    >
                      <Star className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Show project options menu
                      }}
                      className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Project Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{stats.totalTasks}</div>
                    <div className="text-xs text-gray-600">Total Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.completedTasks}</div>
                    <div className="text-xs text-gray-600">Completed</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Progress</span>
                    <span className="text-sm font-medium text-gray-900">
                      {stats.completionRate.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${stats.completionRate}%` }}
                    ></div>
                  </div>
                </div>

                {/* Recent Tasks */}
                {recentTasks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Recent Tasks</h4>
                    {recentTasks.map((task) => (
                      <div key={task._id} className="flex items-center gap-2 text-sm">
                        {getStatusIcon(task.status)}
                        <span className="text-gray-600 truncate flex-1">{task.title}</span>
                        <span className={`px-1.5 py-0.5 text-xs rounded-full border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Project Footer */}
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(project.updatedAt)}
                    </div>
                    {project.members && project.members.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {project.members.length}
                      </div>
                    )}
                  </div>
                  {stats.overdueTasks > 0 && (
                    <div className="flex items-center gap-1 text-red-600 text-xs">
                      <AlertCircle className="w-3 h-3" />
                      {stats.overdueTasks} overdue
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project creation is now handled by the main page */}
    </div>
  );
};

export default ProjectDashboard;
