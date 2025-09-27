'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// VoiceChannel interface removed - system now tracks all channels automatically

interface Class {
  id: string;
  name: string;
  description: string;
  roleId: string;
  roleName: string;
  voiceChannelId: string; // Legacy field for backward compatibility
  voiceChannelName: string; // Legacy field for backward compatibility
  managerId: string;
  managerName: string;
  studentCount: number;
  schedule: {
    days: string[];
    startTime: string;
    endTime: string;
    timezone: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  todayAttendance: {
    present: number;
    absent: number;
    late: number;
    currentlyInVC: number;
    totalStudentsWithRole: number;
    attendanceRate: number;
  };
}

interface ClassManagementDashboardProps {
  onBackToAdmin?: () => void;
}

export default function ClassManagementDashboard({ onBackToAdmin }: ClassManagementDashboardProps) {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showStudentManagement, setShowStudentManagement] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Load classes on component mount
  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/classes');
      const data = await response.json();

      if (response.ok && data.success) {
        setClasses(data.classes);
      } else {
        setError(data.error || 'Failed to load classes');
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      setError('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = () => {
    setShowCreateForm(true);
  };

  const handleViewAttendance = (classData: Class) => {
    setSelectedClass(classData);
    setShowAttendance(true);
  };

  const handleViewStudents = (classData: Class) => {
    setSelectedClass(classData);
    setShowAttendance(true);
  };

  const handleManageStudents = async (classData: Class) => {
    setSelectedClass(classData);
    setStudentsLoading(true);
    setShowStudentManagement(true);
    
    try {
      const response = await fetch(`/api/admin/classes/students?roleId=${classData.roleId}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setStudents(data.students || []);
      } else {
        setError(`Failed to load students: ${data.error}`);
      }
    } catch (error) {
      setError('Failed to load students');
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleSendReminder = async (classId: string) => {
    try {
      const response = await fetch('/api/admin/classes/send-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId,
          testMode: true
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert('Test reminder sent successfully!');
      } else {
        alert(`Failed to send reminder: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Failed to send reminder');
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getCurrentTime = () => {
    return new Date().toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading classes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">🎓 Class Management Dashboard</h1>
            <p className="text-blue-200">Manage your Discord classes and track attendance</p>
            <p className="text-sm text-gray-400 mt-1">Thailand Time: {getCurrentTime()}</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={loadClasses}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center space-x-2"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
            {onBackToAdmin && (
              <button
                onClick={onBackToAdmin}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Back to Admin
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm rounded-2xl border border-blue-500/20 p-6">
            <div className="text-3xl font-bold text-white">{classes.length}</div>
            <div className="text-blue-200">Total Classes</div>
          </div>
          <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm rounded-2xl border border-green-500/20 p-6">
            <div className="text-3xl font-bold text-white">
              {classes.reduce((sum, c) => sum + c.todayAttendance.present, 0)}
            </div>
            <div className="text-green-200">Students Present Today</div>
          </div>
          <div className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
            <div className="text-3xl font-bold text-white">
              {classes.reduce((sum, c) => sum + c.todayAttendance.absent, 0)}
            </div>
            <div className="text-orange-200">Students Absent Today</div>
          </div>
          <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6">
            <div className="text-3xl font-bold text-white">
              {Math.round(classes.reduce((sum, c) => sum + c.todayAttendance.attendanceRate, 0) / classes.length) || 0}%
            </div>
            <div className="text-purple-200">Average Attendance Rate</div>
          </div>
        </div>

        {/* Create Class Button */}
        <div className="mb-6">
          <button
            onClick={handleCreateClass}
            className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
          >
            <span>➕</span>
            <span>Create New Class</span>
          </button>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((classData) => (
            <div key={classData.id} className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{classData.name}</h3>
                  <p className="text-gray-400 text-sm">{classData.description}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-semibold ${
                  classData.isActive 
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  {classData.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>

              {/* Class Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-300">
                  <span className="w-20 text-gray-400">Manager:</span>
                  <span>{classData.managerName}</span>
                </div>
                <div className="flex items-center text-sm text-gray-300">
                  <span className="w-20 text-gray-400">Students:</span>
                  <span>{classData.studentCount}</span>
                </div>
                <div className="flex items-center text-sm text-gray-300">
                  <span className="w-20 text-gray-400">VC:</span>
                  <span className="text-green-400">All Channels (Auto-tracked)</span>
                </div>
                {classData.schedule.days.length > 0 && (
                  <div className="flex items-center text-sm text-gray-300">
                    <span className="w-20 text-gray-400">Schedule:</span>
                    <span>{classData.schedule.days.join(', ')} {formatTime(classData.schedule.startTime)}-{formatTime(classData.schedule.endTime)}</span>
                  </div>
                )}
              </div>

              {/* Today's Attendance */}
              <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                <div className="text-sm font-semibold text-white mb-2">Today&apos;s Attendance</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-green-300">{classData.todayAttendance.present} Present</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-red-300">{classData.todayAttendance.absent} Absent</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-blue-300">{classData.todayAttendance.currentlyInVC} In VC</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-purple-300">{classData.todayAttendance.attendanceRate}% Rate</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleViewStudents(classData)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm font-semibold transition-colors"
                >
                  👥 View Students
                </button>
                <button
                  onClick={() => handleManageStudents(classData)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded text-sm font-semibold transition-colors"
                >
                  ⚙️ Manage Students
                </button>
                <button
                  onClick={() => handleSendReminder(classData.id)}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-3 rounded text-sm font-semibold transition-colors"
                >
                  📨 Send Reminder
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {classes.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎓</div>
            <h3 className="text-2xl font-bold text-white mb-2">No Classes Created Yet</h3>
            <p className="text-gray-400 mb-6">Create your first class to start tracking attendance</p>
            <button
              onClick={handleCreateClass}
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Create Your First Class
            </button>
          </div>
        )}
      </div>

      {/* Create Class Modal */}
      {showCreateForm && (
        <CreateClassModal
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            loadClasses();
          }}
        />
      )}

      {/* Attendance Modal */}
      {showAttendance && selectedClass && (
        <AttendanceModal
          classData={selectedClass}
          onClose={() => {
            setShowAttendance(false);
            setSelectedClass(null);
          }}
        />
      )}

      {/* Student Management Modal */}
      {showStudentManagement && selectedClass && (
        <StudentManagementModal
          classData={selectedClass}
          students={students}
          loading={studentsLoading}
          onClose={() => {
            setShowStudentManagement(false);
            setSelectedClass(null);
            setStudents([]);
          }}
          onRefresh={() => {
            if (selectedClass) {
              handleManageStudents(selectedClass);
            }
          }}
        />
      )}
    </div>
  );
}

// Create Class Modal Component
function CreateClassModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    roleId: '',
    voiceChannelId: '', // Legacy field for backward compatibility
    voiceChannelName: '', // Legacy field for backward compatibility
    managerId: '',
    managerName: '',
    schedule: {
      days: [] as string[],
      startTime: '10:00',
      endTime: '12:00'
    },
    reminderSettings: {
      enabled: false,
      time: '17:00', // Default reminder time
      type: 'end_of_class' as 'end_of_class' | 'daily_report' | 'weekly_summary' | 'attendance_alert',
      days: [] as string[] // Days to send reminders
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Voice channel validation removed - system now tracks all channels automatically

    // Validate reminder settings if enabled
    if (formData.reminderSettings.enabled) {
      if (formData.reminderSettings.days.length === 0) {
        setError('Please select at least one day for reminders');
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Failed to create class');
      }
    } catch (error) {
      console.error('Error creating class:', error);
      setError('Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  const handleDayChange = (day: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        days: checked 
          ? [...prev.schedule.days, day]
          : prev.schedule.days.filter(d => d !== day)
      }
    }));
  };

  // Voice channel functions removed - system now tracks all channels automatically

  const handleReminderDayChange = (day: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      reminderSettings: {
        ...prev.reminderSettings,
        days: checked 
          ? [...prev.reminderSettings.days, day]
          : prev.reminderSettings.days.filter(d => d !== day)
      }
    }));
  };

  const updateReminderSetting = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      reminderSettings: {
        ...prev.reminderSettings,
        [field]: value
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-orange-500/20 p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Create New Class</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <label className="block text-white font-semibold mb-2">Class Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-white/10 border border-orange-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
              placeholder="e.g., Math 101, English Advanced"
              required
            />
          </div>

          <div>
            <label className="block text-white font-semibold mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-white/10 border border-orange-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
              placeholder="Optional description for this class"
              rows={3}
            />
          </div>

          {/* Discord Setup */}
          <div>
            <label className="block text-white font-semibold mb-2">Discord Role ID *</label>
            <input
              type="text"
              value={formData.roleId}
              onChange={(e) => setFormData(prev => ({ ...prev, roleId: e.target.value }))}
              className="w-full bg-white/10 border border-orange-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
              placeholder="123456789012345678"
              required
            />
          </div>

          {/* Voice Channels - Removed: System now tracks ALL voice channels automatically */}

          {/* Class Manager */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-semibold mb-2">Manager Discord ID *</label>
              <input
                type="text"
                value={formData.managerId}
                onChange={(e) => setFormData(prev => ({ ...prev, managerId: e.target.value }))}
                className="w-full bg-white/10 border border-orange-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                placeholder="555666777888999"
                required
              />
            </div>
            <div>
              <label className="block text-white font-semibold mb-2">Manager Name</label>
              <input
                type="text"
                value={formData.managerName}
                onChange={(e) => setFormData(prev => ({ ...prev, managerName: e.target.value }))}
                className="w-full bg-white/10 border border-orange-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                placeholder="e.g., John Smith"
              />
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-white font-semibold mb-2">Class Days</label>
            <div className="grid grid-cols-7 gap-2">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                <label key={day} className="flex items-center space-x-2 text-white">
                  <input
                    type="checkbox"
                    checked={formData.schedule.days.includes(day)}
                    onChange={(e) => handleDayChange(day, e.target.checked)}
                    className="w-4 h-4 text-orange-500"
                  />
                  <span className="text-sm capitalize">{day.slice(0, 3)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-semibold mb-2">Start Time</label>
              <input
                type="time"
                value={formData.schedule.startTime}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  schedule: { ...prev.schedule, startTime: e.target.value }
                }))}
                className="w-full bg-white/10 border border-orange-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="block text-white font-semibold mb-2">End Time</label>
              <input
                type="time"
                value={formData.schedule.endTime}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  schedule: { ...prev.schedule, endTime: e.target.value }
                }))}
                className="w-full bg-white/10 border border-orange-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-400"
              />
            </div>
          </div>

          {/* Reminder Settings */}
          <div className="bg-gray-800/30 rounded-lg p-4 border border-orange-500/20">
            <div className="flex items-center space-x-3 mb-4">
              <input
                type="checkbox"
                id="reminderEnabled"
                checked={formData.reminderSettings.enabled}
                onChange={(e) => updateReminderSetting('enabled', e.target.checked)}
                className="w-4 h-4 text-orange-500"
              />
              <label htmlFor="reminderEnabled" className="text-white font-semibold">
                📨 Enable Reminders
              </label>
            </div>

            {formData.reminderSettings.enabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Reminder Time</label>
                    <input
                      type="time"
                      value={formData.reminderSettings.time}
                      onChange={(e) => updateReminderSetting('time', e.target.value)}
                      className="w-full bg-white/10 border border-orange-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-400"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Reminder Type</label>
                    <select
                      value={formData.reminderSettings.type}
                      onChange={(e) => updateReminderSetting('type', e.target.value)}
                      className="w-full bg-white/10 border border-orange-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-400"
                    >
                      <option value="end_of_class">End of Class</option>
                      <option value="daily_report">Daily Report</option>
                      <option value="weekly_summary">Weekly Summary</option>
                      <option value="attendance_alert">Attendance Alert</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-2">Reminder Days</label>
                  <div className="grid grid-cols-7 gap-2">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                      <label key={day} className="flex items-center space-x-2 text-white">
                        <input
                          type="checkbox"
                          checked={formData.reminderSettings.days.includes(day)}
                          onChange={(e) => handleReminderDayChange(day, e.target.checked)}
                          className="w-4 h-4 text-orange-500"
                        />
                        <span className="text-sm capitalize">{day.slice(0, 3)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="text-sm text-gray-400 bg-gray-700/30 rounded p-3">
                  <p><strong>Reminder Types:</strong></p>
                  <p>• <strong>End of Class:</strong> Sent when class ends</p>
                  <p>• <strong>Daily Report:</strong> Sent at specified time each day</p>
                  <p>• <strong>Weekly Summary:</strong> Sent weekly with attendance summary</p>
                  <p>• <strong>Attendance Alert:</strong> Sent for attendance notifications</p>
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Class'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Attendance Modal Component
function AttendanceModal({ classData, onClose }: { classData: Class; onClose: () => void }) {
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendance();
  }, [classData.id]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/classes/attendance?classId=${classData.id}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setAttendance(data.attendance);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-orange-500/20 p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">👥 {classData.name} - Student Attendance</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="text-white text-xl">Loading attendance...</div>
          </div>
        ) : attendance ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-white">{attendance.summary.total}</div>
                  <div className="text-gray-400">Total Students</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">{attendance.summary.present}</div>
                  <div className="text-gray-400">Present</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">{attendance.summary.absent}</div>
                  <div className="text-gray-400">Absent</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400">{attendance.summary.currentlyInVC}</div>
                  <div className="text-gray-400">In VC Now</div>
                </div>
              </div>
            </div>

            {/* Present Students */}
            {attendance.students.filter((s: any) => s.status === 'present').length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">✅ Present Students</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {attendance.students.filter((s: any) => s.status === 'present').map((student: any) => (
                    <div key={student.userId} className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-white">{student.nickname || student.globalName || student.username}</div>
                          {student.firstJoinToday && (
                            <div className="text-sm text-green-300">Joined: {student.firstJoinToday}</div>
                          )}
                          {student.totalTime > 0 && (
                            <div className="text-sm text-green-300">Time in VC: {student.totalTime} minutes</div>
                          )}
                        </div>
                        <div className="text-sm text-green-300">
                          {student.isCurrentlyInVC ? '🟢 In VC' : '✅ Attended'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Absent Students */}
            {attendance.students.filter((s: any) => s.status === 'absent').length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">❌ Absent Students</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {attendance.students.filter((s: any) => s.status === 'absent').map((student: any) => (
                    <div key={student.userId} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <div className="font-semibold text-white">{student.nickname || student.globalName || student.username}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-white text-xl">No attendance data available</div>
          </div>
        )}

        <div className="flex justify-end pt-6">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-6 rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Student Management Modal Component
function StudentManagementModal({ 
  classData, 
  students, 
  loading, 
  onClose, 
  onRefresh 
}: { 
  classData: Class; 
  students: any[]; 
  loading: boolean; 
  onClose: () => void; 
  onRefresh: () => void; 
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Student Management</h2>
              <p className="text-gray-400 mt-1">
                {classData.name} - {classData.roleName || 'Role-based Students'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-400">Loading students...</p>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-400">{students.length}</div>
                      <div className="text-gray-400">Total Students</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-400">{classData.todayAttendance.present}</div>
                      <div className="text-gray-400">Present Today</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-400">{classData.todayAttendance.currentlyInVC}</div>
                      <div className="text-gray-400">In Voice Channel</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-400">{classData.todayAttendance.attendanceRate}%</div>
                      <div className="text-gray-400">Attendance Rate</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Students with Role</h3>
                <button
                  onClick={onRefresh}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-colors"
                >
                  🔄 Refresh
                </button>
              </div>

              {students.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">👥</div>
                  <p className="text-gray-400">No students found with this role</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {students.map((student) => (
                    <div
                      key={student.userId}
                      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:bg-gray-800/70 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {student.globalName?.charAt(0) || student.username?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="text-white font-semibold">
                              {student.nick || student.globalName || student.username}
                            </div>
                            <div className="text-gray-400 text-sm">
                              @{student.username}
                              {student.discriminator && student.discriminator !== '0' && `#${student.discriminator}`}
                            </div>
                            {student.nick && (
                              <div className="text-blue-400 text-sm">
                                Nickname: {student.nick}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-400 text-sm">
                            Joined: {new Date(student.joinedAt).toLocaleDateString()}
                          </div>
                          <div className="text-green-400 text-sm font-semibold">
                            {student.roles.length} roles
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-700">
          <div className="flex justify-between">
            <div className="text-sm text-gray-400">
              Students are automatically managed based on their Discord roles
            </div>
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-6 rounded-lg font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
