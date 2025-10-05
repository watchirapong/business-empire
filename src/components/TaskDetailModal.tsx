'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit, Trash2, MessageSquare, Paperclip, Clock, User, Calendar, Flag, Save, Plus, Upload } from 'lucide-react';

interface Task {
  _id: string;
  title: string;
  description?: string;
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
    size: number;
    uploadedAt: string;
  }>;
  timeEntries?: Array<{
    _id: string;
    duration: number;
    description: string;
    startTime: string;
    endTime?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  currentUser?: any;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  currentUser
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<Task>>({});
  const [newComment, setNewComment] = useState('');
  const [newTimeEntry, setNewTimeEntry] = useState({
    description: '',
    duration: 0
  });
  const [showTimeEntryForm, setShowTimeEntryForm] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    if (task) {
      setEditedTask(task);
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSave = async () => {
    try {
      await onUpdate(task._id, editedTask);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await onDelete(task._id);
        onClose();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`/api/tasks/${task._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          author: currentUser?.name || 'Anonymous'
        })
      });

      if (response.ok) {
        setNewComment('');
        // Refresh task data
        const updatedTask = await response.json();
        setEditedTask(updatedTask);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleAddTimeEntry = async () => {
    if (!newTimeEntry.description.trim() || newTimeEntry.duration <= 0) return;

    try {
      const response = await fetch(`/api/tasks/${task._id}/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newTimeEntry.description,
          duration: newTimeEntry.duration,
          startTime: new Date().toISOString()
        })
      });

      if (response.ok) {
        setNewTimeEntry({ description: '', duration: 0 });
        setShowTimeEntryForm(false);
        // Refresh task data
        const updatedTask = await response.json();
        setEditedTask(updatedTask);
      }
    } catch (error) {
      console.error('Error adding time entry:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/tasks/${task._id}/attachments`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        // Refresh task data
        const updatedTask = await response.json();
        setEditedTask(updatedTask);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploadingFile(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTotalTime = () => {
    if (!editedTask.timeEntries || editedTask.timeEntries.length === 0) return 0;
    return editedTask.timeEntries.reduce((total, entry) => total + (entry.duration || 0), 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editedTask.title || ''}
                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none w-full"
              />
            ) : (
              <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
            )}
            <div className="flex items-center gap-4 mt-2">
              <span className={`px-2 py-1 text-sm rounded-full border ${getPriorityColor(task.priority)}`}>
                {task.priority} priority
              </span>
              <span className={`px-2 py-1 text-sm rounded-full border ${getStatusColor(task.status)}`}>
                {task.status.replace('_', ' ')}
              </span>
              {task.dueDate && (
                <div className="flex items-center gap-1 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Due {formatDate(task.dueDate)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedTask(task);
                  }}
                  className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-red-600 hover:text-red-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
            {isEditing ? (
              <textarea
                value={editedTask.description || ''}
                onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                rows={4}
                placeholder="Enter task description"
              />
            ) : (
              <p className="text-gray-600">
                {task.description || 'No description provided'}
              </p>
            )}
          </div>

          {/* Task Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Status */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Status</h3>
              {isEditing ? (
                <select
                  value={editedTask.status || task.status}
                  onChange={(e) => setEditedTask({ ...editedTask, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              ) : (
                <span className={`px-3 py-1 text-sm rounded-full border ${getStatusColor(task.status)}`}>
                  {task.status.replace('_', ' ')}
                </span>
              )}
            </div>

            {/* Priority */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Priority</h3>
              {isEditing ? (
                <select
                  value={editedTask.priority || task.priority}
                  onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              ) : (
                <span className={`px-3 py-1 text-sm rounded-full border ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              )}
            </div>

            {/* Due Date */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Due Date</h3>
              {isEditing ? (
                <input
                  type="date"
                  value={editedTask.dueDate || task.dueDate || ''}
                  onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              ) : (
                <p className="text-gray-600">
                  {task.dueDate ? formatDate(task.dueDate) : 'No due date set'}
                </p>
              )}
            </div>
          </div>

          {/* Assignee */}
          {task.assignedTo && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Assigned To</h3>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  {task.assignedTo.displayName || task.assignedTo.username}
                </span>
              </div>
            </div>
          )}

          {/* Time Tracking */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Time Tracking</h3>
              <button
                onClick={() => setShowTimeEntryForm(!showTimeEntryForm)}
                className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Time
              </button>
            </div>

            {showTimeEntryForm && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={newTimeEntry.description}
                      onChange={(e) => setNewTimeEntry({ ...newTimeEntry, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="What did you work on?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={newTimeEntry.duration}
                      onChange={(e) => setNewTimeEntry({ ...newTimeEntry, duration: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      min="1"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => setShowTimeEntryForm(false)}
                    className="px-3 py-1 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddTimeEntry}
                    disabled={!newTimeEntry.description.trim() || newTimeEntry.duration <= 0}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Entry
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {editedTask.timeEntries && editedTask.timeEntries.length > 0 ? (
                <>
                  {editedTask.timeEntries.map((entry) => (
                    <div key={entry._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{entry.description}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(entry.startTime)}
                        </p>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {formatDuration(entry.duration)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center font-semibold">
                      <span className="text-gray-700">Total Time</span>
                      <span className="text-gray-900">{formatDuration(getTotalTime())}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center py-4">No time entries recorded</p>
              )}
            </div>
          </div>

          {/* Comments */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Comments</h3>
            
            <div className="space-y-4 mb-4">
              {editedTask.comments && editedTask.comments.length > 0 ? (
                editedTask.comments.map((comment) => (
                  <div key={comment._id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-gray-900">{comment.author}</span>
                      <span className="text-sm text-gray-500">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-gray-700">{comment.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No comments yet</p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Add a comment..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Attachments</h3>
              <label className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                Upload File
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingFile}
                />
              </label>
            </div>

            {uploadingFile && (
              <div className="text-center py-4">
                <p className="text-gray-600">Uploading file...</p>
              </div>
            )}

            <div className="space-y-2">
              {editedTask.attachments && editedTask.attachments.length > 0 ? (
                editedTask.attachments.map((attachment) => (
                  <div key={attachment._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Paperclip className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{attachment.name}</p>
                        <p className="text-sm text-gray-600">
                          {formatFileSize(attachment.size)} • {formatDate(attachment.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Download
                    </a>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No attachments</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;