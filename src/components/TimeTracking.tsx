'use client';

import { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock, Timer, BarChart3 } from 'lucide-react';

interface TimeEntry {
  _id: string;
  taskId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in minutes
  description?: string;
  createdAt: string;
}

interface Task {
  _id: string;
  title: string;
  projectId?: any;
}

interface TimeTrackingProps {
  task: Task | null;
  currentUserId: string;
  onTimeEntryAdded?: (entry: TimeEntry) => void;
}

export default function TimeTracking({ task, currentUserId, onTimeEntryAdded }: TimeTrackingProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning) {
      interval = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  useEffect(() => {
    if (task) {
      fetchTimeEntries();
    }
  }, [task]);

  const fetchTimeEntries = async () => {
    if (!task) return;
    
    try {
      const response = await fetch(`/api/tasks/${task._id}/time-entries`);
      if (response.ok) {
        const entries = await response.json();
        setTimeEntries(entries);
      }
    } catch (error) {
      console.error('Error fetching time entries:', error);
    }
  };

  const startTimer = () => {
    setIsRunning(true);
    setCurrentTime(0);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const stopTimer = async () => {
    if (!task || currentTime === 0) return;
    
    setIsRunning(false);
    setLoading(true);

    try {
      const response = await fetch(`/api/tasks/${task._id}/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          duration: Math.floor(currentTime / 60), // Convert to minutes
          description: description || undefined
        })
      });

      if (response.ok) {
        const newEntry = await response.json();
        setTimeEntries([...timeEntries, newEntry]);
        setCurrentTime(0);
        setDescription('');
        if (onTimeEntryAdded) {
          onTimeEntryAdded(newEntry);
        }
      }
    } catch (error) {
      console.error('Error saving time entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const totalTime = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);

  if (!task) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <Timer className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Select a task to track time</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Time Tracking</h2>
            <p className="text-gray-600 mt-1">{task.title}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatTime(currentTime)}
            </div>
            <div className="text-sm text-gray-500">Current Session</div>
          </div>
        </div>
      </div>

      {/* Timer Controls */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-center space-x-4">
          {!isRunning ? (
            <button
              onClick={startTimer}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Play className="w-5 h-5" />
              <span>Start</span>
            </button>
          ) : (
            <button
              onClick={pauseTimer}
              className="flex items-center space-x-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              <Pause className="w-5 h-5" />
              <span>Pause</span>
            </button>
          )}
          
          <button
            onClick={stopTimer}
            disabled={currentTime === 0 || loading}
            className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Square className="w-5 h-5" />
            <span>{loading ? 'Saving...' : 'Stop'}</span>
          </button>
        </div>

        {/* Description Input */}
        <div className="mt-4">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description for this time entry..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Time Entries */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Time Entries</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Total: {formatDuration(totalTime)}</span>
          </div>
        </div>

        {timeEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Timer className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No time entries yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {timeEntries.map((entry) => (
              <div key={entry._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {formatDuration(entry.duration || 0)}
                    </div>
                    {entry.description && (
                      <div className="text-sm text-gray-600">{entry.description}</div>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="p-6 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{timeEntries.length}</div>
            <div className="text-sm text-gray-600">Sessions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{formatDuration(totalTime)}</div>
            <div className="text-sm text-gray-600">Total Time</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {timeEntries.length > 0 ? formatDuration(Math.floor(totalTime / timeEntries.length)) : '0m'}
            </div>
            <div className="text-sm text-gray-600">Avg Session</div>
          </div>
        </div>
      </div>
    </div>
  );
}
