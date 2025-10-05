'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus, MoreVertical, Calendar, User, Flag, MessageSquare, Paperclip, Clock } from 'lucide-react';

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  assignedToId?: string;
  assignedTo?: {
    username: string;
    displayName: string;
    avatar?: string;
  };
  comments?: Array<{
    _id: string;
    content: string;
    author: string;
    createdAt: string;
  }>;
  attachments?: Array<{
    _id: string;
    name: string;
    url: string;
  }>;
  timeEntries?: Array<{
    _id: string;
    duration: number;
    description: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface KanbanBoardProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskCreate: (task: Partial<Task>) => Promise<void>;
  onTaskDelete: (taskId: string) => Promise<void>;
  selectedProject?: string;
  currentUser?: any;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  selectedProject,
  currentUser
}) => {
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    dueDate: '',
    assignee: ''
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);

  // Group tasks by status
  const groupedTasks = {
    not_started: tasks.filter(task => task.status === 'not_started'),
    in_progress: tasks.filter(task => task.status === 'in_progress'),
    completed: tasks.filter(task => task.status === 'completed')
  };

  const columns = [
    {
      id: 'not_started',
      title: 'To Do',
      color: 'bg-gray-100',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-200'
    },
    {
      id: 'in_progress',
      title: 'In Progress',
      color: 'bg-blue-100',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200'
    },
    {
      id: 'completed',
      title: 'Done',
      color: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-200'
    }
  ];

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as Task['status'];
    const taskId = draggableId;

    try {
      await onTaskUpdate(taskId, { status: newStatus });
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim() || !selectedProject || !currentUser) return;

    try {
      const taskData = {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        dueDate: newTask.dueDate || undefined,
        projectId: selectedProject,
        assignedToId: newTask.assignee || undefined,
        createdById: currentUser.id,
        status: 'not_started' as const
      };

      await onTaskCreate(taskData);
      setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', assignee: '' });
      setShowAddTask(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const getTotalTime = (timeEntries: any[]) => {
    if (!timeEntries || timeEntries.length === 0) return 0;
    return timeEntries.reduce((total, entry) => total + (entry.duration || 0), 0);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kanban Board</h2>
          <p className="text-gray-600">Drag and drop tasks to update their status</p>
        </div>
        <button
          onClick={() => setShowAddTask(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
            {columns.map((column) => (
              <div key={column.id} className="flex flex-col">
                {/* Column Header */}
                <div className={`${column.color} ${column.borderColor} border-2 rounded-t-lg p-4 mb-4`}>
                  <div className="flex justify-between items-center">
                    <h3 className={`font-semibold ${column.textColor}`}>
                      {column.title}
                    </h3>
                    <span className={`${column.textColor} text-sm bg-white bg-opacity-50 px-2 py-1 rounded-full`}>
                      {groupedTasks[column.id as keyof typeof groupedTasks].length}
                    </span>
                  </div>
                </div>

                {/* Tasks */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 min-h-[400px] p-2 rounded-b-lg border-2 border-t-0 ${
                        snapshot.isDraggingOver 
                          ? 'bg-blue-50 border-blue-300' 
                          : 'bg-gray-50 border-gray-200'
                      } transition-colors`}
                    >
                      {groupedTasks[column.id as keyof typeof groupedTasks].map((task, index) => (
                        <Draggable key={task._id} draggableId={task._id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3 cursor-move hover:shadow-md transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                              }`}
                              onClick={() => {
                                setSelectedTask(task);
                                setShowTaskDetail(true);
                              }}
                            >
                              {/* Task Header */}
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-gray-900 text-sm leading-tight">
                                  {task.title}
                                </h4>
                                <div className="flex items-center gap-1">
                                  <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                  </span>
                                  <button className="p-1 hover:bg-gray-100 rounded">
                                    <MoreVertical className="w-3 h-3 text-gray-400" />
                                  </button>
                                </div>
                              </div>

                              {/* Task Description */}
                              {task.description && (
                                <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                                  {task.description}
                                </p>
                              )}

                              {/* Task Meta */}
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center gap-3">
                                  {/* Due Date */}
                                  {task.dueDate && (
                                    <div className={`flex items-center gap-1 ${
                                      isOverdue(task.dueDate) ? 'text-red-600' : 'text-gray-500'
                                    }`}>
                                      <Calendar className="w-3 h-3" />
                                      {formatDate(task.dueDate)}
                                    </div>
                                  )}

                                  {/* Assignee */}
                                  {task.assignedTo && (
                                    <div className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      <span className="truncate max-w-[80px]">
                                        {task.assignedTo.displayName || task.assignedTo.username}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* Comments */}
                                  {task.comments && task.comments.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <MessageSquare className="w-3 h-3" />
                                      <span>{task.comments.length}</span>
                                    </div>
                                  )}

                                  {/* Attachments */}
                                  {task.attachments && task.attachments.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Paperclip className="w-3 h-3" />
                                      <span>{task.attachments.length}</span>
                                    </div>
                                  )}

                                  {/* Time Tracking */}
                                  {task.timeEntries && task.timeEntries.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      <span>{formatDuration(getTotalTime(task.timeEntries))}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Task</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  rows={3}
                  placeholder="Enter task description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddTask(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!newTask.title.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {showTaskDetail && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-gray-900">{selectedTask.title}</h3>
              <button
                onClick={() => setShowTaskDetail(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {selectedTask.description && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">Description</h4>
                <p className="text-gray-600">{selectedTask.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-1">Priority</h4>
                <span className={`px-2 py-1 text-sm rounded-full border ${getPriorityColor(selectedTask.priority)}`}>
                  {selectedTask.priority}
                </span>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-1">Status</h4>
                <span className="px-2 py-1 text-sm rounded-full bg-gray-100 text-gray-800">
                  {selectedTask.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {selectedTask.dueDate && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-1">Due Date</h4>
                <p className={`text-sm ${isOverdue(selectedTask.dueDate) ? 'text-red-600' : 'text-gray-600'}`}>
                  {new Date(selectedTask.dueDate).toLocaleDateString()}
                </p>
              </div>
            )}

            {selectedTask.assignedTo && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-1">Assigned To</h4>
                <p className="text-gray-600">
                  {selectedTask.assignedTo.displayName || selectedTask.assignedTo.username}
                </p>
              </div>
            )}

            {/* Comments Section */}
            {selectedTask.comments && selectedTask.comments.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">Comments</h4>
                <div className="space-y-2">
                  {selectedTask.comments.map((comment) => (
                    <div key={comment._id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm text-gray-700">{comment.author}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{comment.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments Section */}
            {selectedTask.attachments && selectedTask.attachments.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">Attachments</h4>
                <div className="space-y-2">
                  {selectedTask.attachments.map((attachment) => (
                    <div key={attachment._id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Paperclip className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{attachment.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Time Tracking Section */}
            {selectedTask.timeEntries && selectedTask.timeEntries.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">Time Tracking</h4>
                <div className="space-y-2">
                  {selectedTask.timeEntries.map((entry) => (
                    <div key={entry._id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">{entry.description}</span>
                      <span className="text-sm font-medium text-gray-700">
                        {formatDuration(entry.duration)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center font-medium">
                      <span className="text-gray-700">Total Time</span>
                      <span className="text-gray-900">
                        {formatDuration(getTotalTime(selectedTask.timeEntries))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowTaskDetail(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onTaskDelete(selectedTask._id);
                  setShowTaskDetail(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;