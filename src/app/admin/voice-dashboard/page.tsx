'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface VoiceActivityData {
  _id: string;
  userId: string;
  username: string;
  globalName?: string;
  avatar?: string;
  voiceJoinCount: number;
  totalVoiceTime: number;
  lastVoiceJoin?: string;
  lastVoiceLeave?: string;
  userType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roles?: string[];
  rank?: string;
  displayName?: string;
  // Daily data properties
  dailyJoinCount?: number;
  dailyVoiceTime?: number;
  channels?: string[];
  firstJoin?: string;
  lastJoin?: string;
  sessions?: any[];
}

interface TodayVoiceData extends VoiceActivityData {
  todayVoiceTime: number;
  todayJoinCount: number;
  todaySessions: VoiceSessionData[];
}

interface VoiceSessionData {
  _id: string;
  userId: string;
  username: string;
  globalName?: string;
  channelId: string;
  channelName: string;
  joinTime: string;
  leaveTime?: string;
  duration?: number;
  createdAt: string;
}

interface TodayVoiceData extends VoiceActivityData {
  todayVoiceTime: number;
  todayJoinCount: number;
  todaySessions: VoiceSessionData[];
}

interface VoiceStats {
  totalUsers: number;
  realUsers: number;
  suspiciousUsers: number;
  breakdown: Array<{
    _id: string;
    count: number;
    totalJoins: number;
    totalTime: number;
    avgJoins: number;
    avgTime: number;
  }>;
  topVoiceUsers: VoiceActivityData[];
  recentSessions: VoiceSessionData[];
}

interface TodayStats {
  totalUsersToday: number;
  totalTimeToday: number;
  totalSessionsToday: number;
  averageTimePerUser: number;
}

interface RoleStats {
  role: string;
  count: number;
  totalJoins: number;
  totalTime: number;
  avgJoins: number;
  avgTime: number;
}

interface DailyVoiceData extends VoiceActivityData {
  dailyJoinCount: number;
  dailyVoiceTime: number;
  sessions: VoiceSessionData[];
  channels: string[];
  firstJoin: string;
  lastJoin: string;
}

interface DailyStats {
  totalUsers: number;
  totalSessions: number;
  totalTime: number;
  realUsers: number;
  suspiciousUsers: number;
  averageTimePerUser: number;
  uniqueChannels: number;
}

interface ServerInfo {
  guildId: string;
  guildName: string;
  description: string;
  botConnected: boolean;
  botUserId: string | null;
  botUsername: string | null;
}

export default function VoiceDashboardPage() {
  const { data: session } = useSession();
  const [voiceStats, setVoiceStats] = useState<VoiceStats | null>(null);
  const [voiceActivities, setVoiceActivities] = useState<VoiceActivityData[]>([]);
  const [todayVoiceData, setTodayVoiceData] = useState<TodayVoiceData[]>([]);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [limit, setLimit] = useState(50);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [botStatus, setBotStatus] = useState<boolean | null>(null);
  const [botLoading, setBotLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'comprehensive' | 'custom-roles'>('all');
  const [sortBy, setSortBy] = useState<'totalTime' | 'todayTime' | 'joins' | 'todayJoins'>('totalTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Role-based data
  const [voiceActivitiesByRoles, setVoiceActivitiesByRoles] = useState<VoiceActivityData[]>([]);
  const [roleStats, setRoleStats] = useState<RoleStats[]>([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [customRoleId, setCustomRoleId] = useState('');
  const [customRoleName, setCustomRoleName] = useState('');
  const [showCustomRoleInput, setShowCustomRoleInput] = useState(false);
  const [customRoles, setCustomRoles] = useState<Array<{id: string, name: string, verified?: boolean, userCount?: number}>>([]);
  const [verifyingRole, setVerifyingRole] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  
  // Daily data
  const [dailyVoiceData, setDailyVoiceData] = useState<DailyVoiceData[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Comprehensive view mode
  const [viewMode, setViewMode] = useState<'today' | 'daily' | 'roles'>('today');

  // Check if user is admin
  const isAdmin = session?.user && ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917', '315548736388333568'].includes((session.user as any).id);

  // Helper function to get display name (globalName > username)
  const getDisplayName = (activity: VoiceActivityData) => {
    return activity.globalName || activity.username;
  };

  useEffect(() => {
    if (isAdmin) {
      loadVoiceStats();
      loadVoiceActivities();
      checkBotStatus();
      
      // Load data based on active tab and view mode
      if (activeTab === 'comprehensive') {
        if (viewMode === 'today') {
          loadTodayVoiceData();
        } else if (viewMode === 'daily') {
          loadDailyVoiceData();
        } else if (viewMode === 'roles') {
          loadVoiceActivitiesByRoles();
        }
      }
    }
  }, [isAdmin, filter, limit, roleFilter, selectedDate, activeTab, viewMode, customRoles]);

  // Reset sort when switching tabs
  useEffect(() => {
    if (activeTab === 'all') {
      setSortBy('totalTime');
    } else {
      setSortBy('todayTime');
    }
    setSortOrder('desc');
  }, [activeTab]);

  const loadVoiceStats = async () => {
    try {
      const response = await fetch('/api/admin/voice-activity');
      const data = await response.json();

      if (response.ok && data.success) {
        setVoiceStats(data.data.statistics);
        setServerInfo(data.data.serverInfo);
        console.log('API Response:', data);
        console.log('Server info loaded:', data.data.serverInfo);
        console.log('Server info state set to:', data.data.serverInfo);
      } else {
        console.error('API Error:', data);
        setError(data.error || 'Failed to load voice statistics');
      }
    } catch (error) {
      setError('Network error occurred');
      console.error('Error loading voice stats:', error);
    }
  };

  const loadVoiceActivities = async () => {
    try {
      const response = await fetch(`/api/admin/voice-activity?filter=${filter}&limit=${limit}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setVoiceActivities(data.data.voiceActivities);
      } else {
        setError(data.error || 'Failed to load voice activities');
      }
    } catch (error) {
      setError('Network error occurred');
      console.error('Error loading voice activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayVoiceData = async () => {
    try {
      const response = await fetch(`/api/admin/voice-activity-today?limit=${limit}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setTodayVoiceData(data.data.todayVoiceData);
        setTodayStats(data.data.todayStats);
      } else {
        console.error('Failed to load today voice data:', data.error);
      }
    } catch (error) {
      console.error('Error loading today voice data:', error);
    }
  };

  const loadVoiceActivitiesByRoles = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('filter', filter);
      if (roleFilter !== 'all') params.append('roleFilter', roleFilter);
      // Check if roleFilter is a custom role ID
      const isCustomRole = customRoles.some(role => role.id === roleFilter);
      if (isCustomRole) {
        params.append('customRoleId', roleFilter);
      }
      
      if (selectedDate && viewMode === 'roles') params.append('dateFilter', selectedDate);
      
      const response = await fetch(`/api/admin/voice-activity-enhanced-roles?${params}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setVoiceActivitiesByRoles(data.data.voiceActivities);
        setRoleStats(data.data.roleStats);
        
        // Update daily stats if available
        if (data.data.dailyData) {
          setDailyStats(data.data.dailyData);
        }
      } else {
        console.error('Failed to load voice activities by roles:', data.error);
      }
    } catch (error) {
      console.error('Error loading voice activities by roles:', error);
    }
  };

  const loadDailyVoiceData = async () => {
    try {
      const response = await fetch(`/api/admin/voice-activity-daily?date=${selectedDate}&filter=${filter}&limit=${limit}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setDailyVoiceData(data.data.dailyVoiceData);
        setDailyStats(data.data.dailyStats);
      } else {
        console.error('Failed to load daily voice data:', data.error);
      }
    } catch (error) {
      console.error('Error loading daily voice data:', error);
    }
  };

  const loadUserDetails = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/user-voice-activity?userId=${userId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setUserDetails(data.data);
        setSelectedUser(userId);
      } else {
        setError(data.error || 'Failed to load user details');
      }
    } catch (error) {
      setError('Network error occurred');
      console.error('Error loading user details:', error);
    }
  };

  const checkBotStatus = async () => {
    try {
      const response = await fetch('/api/admin/bot-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' })
      });
      const data = await response.json();
      if (data.success) {
        setBotStatus(data.isRunning);
      }
    } catch (error) {
      console.error('Error checking bot status:', error);
    }
  };

  const controlBot = async (action: 'start' | 'stop') => {
    setBotLoading(true);
    try {
      const response = await fetch('/api/admin/bot-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await response.json();
      if (data.success) {
        setBotStatus(data.isRunning);
        // Refresh data after bot status change
        setTimeout(() => {
          loadVoiceStats();
          loadVoiceActivities();
          loadTodayVoiceData();
        }, 2000);
      } else {
        setError(data.error || `Failed to ${action} bot`);
      }
    } catch (error) {
      setError(`Network error occurred while trying to ${action} bot`);
      console.error(`Error ${action}ing bot:`, error);
    } finally {
      setBotLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const verifyRole = async (roleId: string) => {
    setVerifyingRole(true);
    try {
      const response = await fetch(`/api/admin/verify-role?roleId=${roleId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setVerificationResult(data.data);
        return data.data;
      } else {
        console.error('Failed to verify role:', data.error);
        setVerificationResult(null);
        return null;
      }
    } catch (error) {
      console.error('Error verifying role:', error);
      setVerificationResult(null);
      return null;
    } finally {
      setVerifyingRole(false);
    }
  };

  // Sort function for voice activities
  const sortVoiceActivities = (activities: VoiceActivityData[]) => {
    return [...activities].sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case 'totalTime':
          aValue = a.totalVoiceTime;
          bValue = b.totalVoiceTime;
          break;
        case 'joins':
          aValue = a.voiceJoinCount;
          bValue = b.voiceJoinCount;
          break;
        default:
          aValue = a.totalVoiceTime;
          bValue = b.totalVoiceTime;
      }
      
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
  };

  // Sort function for daily voice data
  const sortDailyVoiceData = (activities: DailyVoiceData[]) => {
    return [...activities].sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case 'totalTime':
          aValue = a.totalVoiceTime;
          bValue = b.totalVoiceTime;
          break;
        case 'todayTime':
          aValue = a.dailyVoiceTime;
          bValue = b.dailyVoiceTime;
          break;
        case 'joins':
          aValue = a.voiceJoinCount;
          bValue = b.voiceJoinCount;
          break;
        case 'todayJoins':
          aValue = a.dailyJoinCount;
          bValue = b.dailyJoinCount;
          break;
        default:
          aValue = a.dailyVoiceTime;
          bValue = b.dailyVoiceTime;
      }
      
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
  };

  // Sort function for today's voice data
  const sortTodayVoiceData = (activities: TodayVoiceData[]) => {
    return [...activities].sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case 'totalTime':
          aValue = a.totalVoiceTime;
          bValue = b.totalVoiceTime;
          break;
        case 'todayTime':
          aValue = a.todayVoiceTime;
          bValue = b.todayVoiceTime;
          break;
        case 'joins':
          aValue = a.voiceJoinCount;
          bValue = b.voiceJoinCount;
          break;
        case 'todayJoins':
          aValue = a.todayJoinCount;
          bValue = b.todayJoinCount;
          break;
        default:
          aValue = a.totalVoiceTime;
          bValue = b.totalVoiceTime;
      }
      
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-white mb-4">กำลังโหลด...</h1>
            <p className="text-blue-200">กรุณารอสักครู่</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-4">🚫 Access Denied</h1>
            <p className="text-blue-200">You don&apos;t have permission to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">🎤 Voice Activity Dashboard</h1>
          <p className="text-blue-200 text-lg">Monitor voice chat activity across all users</p>
          
          {serverInfo && (
            <div className={`mt-4 bg-gradient-to-r rounded-xl p-4 border inline-block ${
              serverInfo.botConnected 
                ? 'from-green-500/20 to-blue-500/20 border-green-500/30' 
                : 'from-orange-500/20 to-red-500/20 border-orange-500/30'
            }`}>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-2xl">{serverInfo.botConnected ? '🟢' : '🟠'}</span>
                <span className="text-white font-bold text-lg">{serverInfo.guildName}</span>
                <span className="text-gray-400 text-sm">({serverInfo.guildId})</span>
              </div>
              <div className="text-center mt-2">
                <p className={`text-sm font-medium ${
                  serverInfo.botConnected ? 'text-green-200' : 'text-orange-200'
                }`}>
                  {serverInfo.description}
                </p>
                <div className="flex items-center justify-center space-x-4 mt-2 text-xs">
                  <span className={`px-2 py-1 rounded ${
                    serverInfo.botConnected 
                      ? 'bg-green-500/20 text-green-300' 
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    Bot: {serverInfo.botConnected ? 'Connected' : 'Disconnected'}
                  </span>
                  {serverInfo.botUsername && (
                    <span className="text-blue-300">
                      @{serverInfo.botUsername}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {!serverInfo && (
            <div className="mt-4 bg-gradient-to-r from-red-500/20 to-red-600/20 rounded-xl p-4 border border-red-500/30 inline-block">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-red-400 text-2xl">⚠️</span>
                <span className="text-white font-bold text-lg">Server Info Unavailable</span>
              </div>
              <p className="text-red-200 text-sm mt-1 font-medium">Unable to fetch Discord server information</p>
              <p className="text-red-300 text-xs mt-2">Check console logs for debugging info</p>
            </div>
          )}
          
          {/* Debug info - remove this after fixing */}
          <div className="mt-2 text-center">
            <small className="text-gray-400">
              Debug: serverInfo = {serverInfo ? 'loaded' : 'null'} | 
              loading = {loading ? 'true' : 'false'} | 
              error = {error ? 'present' : 'none'}
            </small>
          </div>
        </div>

        {loading && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-blue-200">Loading voice activity data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-6">
            <h3 className="text-red-400 font-semibold mb-2">❌ Error</h3>
            <p className="text-red-300">{error}</p>
            <button
              onClick={() => {
                setError(null);
                loadVoiceStats();
                loadVoiceActivities();
                loadTodayVoiceData();
                loadVoiceActivitiesByRoles();
                loadDailyVoiceData();
              }}
              className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Server Validation Section */}
            {serverInfo && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <span className="mr-2">🔍</span>
                    Server Verification
                  </h2>
                  <button
                    onClick={() => {
                      loadVoiceStats();
                      loadVoiceActivities();
                      loadTodayVoiceData();
                      loadVoiceActivitiesByRoles();
                      loadDailyVoiceData();
                    }}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors flex items-center"
                  >
                    <span className="mr-1">🔄</span>
                    Refresh
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-blue-300 font-semibold mb-2">Target Server</div>
                    <div className="text-white">{serverInfo.guildName}</div>
                    <div className="text-gray-400 text-xs">ID: {serverInfo.guildId}</div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-blue-300 font-semibold mb-2">Bot Status</div>
                    <div className={`flex items-center mb-2 ${serverInfo.botConnected ? 'text-green-300' : 'text-red-300'}`}>
                      <span className="mr-2">{serverInfo.botConnected ? '✅' : '❌'}</span>
                      {serverInfo.botConnected ? 'Active & Tracking' : 'Disconnected'}
                    </div>
                    {serverInfo.botUsername && (
                      <div className="text-gray-400 text-xs mb-2">Bot: @{serverInfo.botUsername}</div>
                    )}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => controlBot('start')}
                        disabled={botLoading || serverInfo.botConnected}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          serverInfo.botConnected 
                            ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                      >
                        {botLoading ? '⏳' : '▶️'} Start
                      </button>
                      <button
                        onClick={() => controlBot('stop')}
                        disabled={botLoading || !serverInfo.botConnected}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          !serverInfo.botConnected 
                            ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                      >
                        {botLoading ? '⏳' : '⏹️'} Stop
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-blue-300 font-semibold mb-2">Data Collection</div>
                    <div className="text-white">
                      {voiceStats ? (
                        <div className="flex items-center text-green-300">
                          <span className="mr-2">✅</span>
                          {voiceStats.totalUsers} users tracked
                        </div>
                      ) : (
                        <div className="flex items-center text-yellow-300">
                          <span className="mr-2">⚠️</span>
                          No data available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Statistics Overview */}
            {voiceStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                  <div className="text-3xl font-bold text-blue-300 mb-2">{voiceStats.totalUsers}</div>
                  <div className="text-blue-200">Total Users</div>
                </div>
                
                <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                  <div className="text-3xl font-bold text-green-300 mb-2">{voiceStats.realUsers}</div>
                  <div className="text-green-200">Real Users</div>
                </div>
                
                <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                  <div className="text-3xl font-bold text-yellow-300 mb-2">{voiceStats.suspiciousUsers}</div>
                  <div className="text-yellow-200">Suspicious Users</div>
                </div>
                
                <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                  <div className="text-3xl font-bold text-purple-300 mb-2">
                    {voiceStats.breakdown.reduce((sum, item) => sum + item.totalJoins, 0)}
                  </div>
                  <div className="text-purple-200">Total Joins</div>
                </div>
              </div>
            )}

            {/* Comprehensive Statistics */}
            {activeTab === 'comprehensive' && (
              <>
                {/* Today's Statistics */}
                {viewMode === 'today' && todayStats && (
                  <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-xl p-6 border border-green-500/20">
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                      <span className="mr-2">📅</span>
                      Today&apos;s Voice Activity
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-white/5 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-300 mb-1">{todayStats.totalUsersToday}</div>
                        <div className="text-green-200 text-sm">Users Today</div>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-300 mb-1">{formatDuration(todayStats.totalTimeToday)}</div>
                        <div className="text-blue-200 text-sm">Total Time Today</div>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-300 mb-1">{todayStats.totalSessionsToday}</div>
                        <div className="text-purple-200 text-sm">Sessions Today</div>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-300 mb-1">{formatDuration(todayStats.averageTimePerUser)}</div>
                        <div className="text-yellow-200 text-sm">Avg Time/User</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Role Statistics */}
                {viewMode === 'roles' && roleStats.length > 0 && (
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/20">
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                      <span className="mr-2">👑</span>
                      Voice Activity by Role
                      {customRoles.some(role => role.id === roleFilter) && (
                        <span className="ml-3 text-sm bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                          Custom Role: {customRoles.find(role => role.id === roleFilter)?.name}
                        </span>
                      )}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {roleStats.map((roleStat) => (
                        <div key={roleStat.role} className="bg-white/5 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold text-white">{roleStat.role}</h3>
                            <span className="text-purple-300 text-sm">{roleStat.count} users</span>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-300">Total Time:</span>
                              <span className="text-purple-300">{formatDuration(roleStat.totalTime)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">Total Joins:</span>
                              <span className="text-blue-300">{roleStat.totalJoins}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">Avg Time:</span>
                              <span className="text-green-300">{formatDuration(roleStat.avgTime)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-300">Avg Joins:</span>
                              <span className="text-yellow-300">{roleStat.avgJoins}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Daily Statistics */}
                {viewMode === 'daily' && dailyStats && (
                  <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl p-6 border border-orange-500/20">
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                      <span className="mr-2">📅</span>
                      Voice Activity for {new Date(selectedDate).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white/5 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-orange-300 mb-1">{dailyStats.totalUsers}</div>
                        <div className="text-orange-200 text-sm">Active Users</div>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-300 mb-1">{dailyStats.totalSessions}</div>
                        <div className="text-blue-200 text-sm">Total Sessions</div>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-300 mb-1">{formatDuration(dailyStats.totalTime)}</div>
                        <div className="text-green-200 text-sm">Total Time</div>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-300 mb-1">{dailyStats.uniqueChannels}</div>
                        <div className="text-purple-200 text-sm">Channels Used</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="bg-white/5 rounded-lg p-4 text-center">
                        <div className="text-lg font-bold text-green-300 mb-1">{dailyStats.realUsers}</div>
                        <div className="text-green-200 text-sm">Real Users</div>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4 text-center">
                        <div className="text-lg font-bold text-yellow-300 mb-1">{dailyStats.suspiciousUsers}</div>
                        <div className="text-yellow-200 text-sm">Suspicious Users</div>
                      </div>
                      
                      <div className="bg-white/5 rounded-lg p-4 text-center">
                        <div className="text-lg font-bold text-cyan-300 mb-1">{formatDuration(dailyStats.averageTimePerUser)}</div>
                        <div className="text-cyan-200 text-sm">Avg Time/User</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Tab Navigation */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      activeTab === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-blue-200 hover:bg-white/20'
                    }`}
                  >
                    📊 All Users Total Time
                  </button>
                  <button
                    onClick={() => setActiveTab('comprehensive')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      activeTab === 'comprehensive'
                        ? 'bg-gradient-to-r from-green-500 to-purple-500 text-white'
                        : 'bg-white/10 text-gray-200 hover:bg-white/20'
                    }`}
                  >
                    🎯 Comprehensive View
                  </button>
                  <button
                    onClick={() => setActiveTab('custom-roles')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      activeTab === 'custom-roles'
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                        : 'bg-white/10 text-gray-200 hover:bg-white/20'
                    }`}
                  >
                    ⚙️ Custom Roles
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-4 items-center">
                  {activeTab === 'all' && (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-cyan-300 mb-2">Filter</label>
                        <select
                          value={filter}
                          onChange={(e) => setFilter(e.target.value)}
                          className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="all">All Users</option>
                          <option value="real_user">Real Users</option>
                          <option value="suspicious_user">Suspicious Users</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  {activeTab === 'comprehensive' && (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-indigo-300 mb-2">View Mode</label>
                        <select
                          value={viewMode}
                          onChange={(e) => setViewMode(e.target.value as 'today' | 'daily' | 'roles')}
                          className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="today">📅 Today&apos;s Activity</option>
                          <option value="daily">📆 Daily View</option>
                          <option value="roles">👑 By Role</option>
                        </select>
                      </div>
                      
                      {viewMode === 'daily' && (
                        <div>
                          <label className="block text-sm font-bold text-orange-300 mb-2">Select Date</label>
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      )}
                      
                      {viewMode === 'roles' && (
                        <>
                          <div>
                            <label className="block text-sm font-bold text-purple-300 mb-2">Role Filter</label>
                            <select
                              value={roleFilter}
                              onChange={(e) => setRoleFilter(e.target.value)}
                              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="all">All Roles</option>
                              <option value="Ace">Ace</option>
                              <option value="Hero">Hero</option>
                              <option value="Enigma">Enigma</option>
                              <option value="Warrior">Warrior</option>
                              <option value="Trainee">Trainee</option>
                              <option value="None">No Role</option>
                              {customRoles.map((role) => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                              ))}
                            </select>
                          </div>
                          
                          
                          <div>
                            <label className="block text-sm font-bold text-orange-300 mb-2">Date Filter (Optional)</label>
                            <input
                              type="date"
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </>
                      )}
                      
                      <div>
                        <label className="block text-sm font-bold text-green-300 mb-2">User Filter</label>
                        <select
                          value={filter}
                          onChange={(e) => setFilter(e.target.value)}
                          className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-green-500"
                        >
                          <option value="all">All Users</option>
                          <option value="real_user">Real Users</option>
                          <option value="suspicious_user">Suspicious Users</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  <div>
                    <label className="block text-sm font-bold text-cyan-300 mb-2">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    >
                      {activeTab === 'all' ? (
                        <>
                          <option value="totalTime">Total Time</option>
                          <option value="joins">Total Joins</option>
                        </>
                      ) : (
                        <>
                          <option value="todayTime">Today&apos;s Time</option>
                          <option value="totalTime">Total Time</option>
                          <option value="todayJoins">Today&apos;s Joins</option>
                          <option value="joins">Total Joins</option>
                        </>
                      )}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-cyan-300 mb-2">Order</label>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                      className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="desc">Max to Min</option>
                      <option value="asc">Min to Max</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-cyan-300 mb-2">Limit</label>
                    <select
                      value={limit}
                      onChange={(e) => setLimit(Number(e.target.value))}
                      className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* All Users Tab */}
            {activeTab === 'all' && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h2 className="text-2xl font-bold text-white mb-4">📊 All Users Voice Activity</h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-3 px-4 text-blue-300 font-semibold">User</th>
                        <th className="py-3 px-4 text-blue-300 font-semibold">Joins</th>
                        <th className="py-3 px-4 text-blue-300 font-semibold">Total Time</th>
                        <th className="py-3 px-4 text-blue-300 font-semibold">Last Join</th>
                        <th className="py-3 px-4 text-blue-300 font-semibold">Type</th>
                        <th className="py-3 px-4 text-blue-300 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortVoiceActivities(voiceActivities).map((activity) => (
                        <tr key={activity._id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-4 text-white">
                            <div className="flex items-center">
                              {activity.avatar && (
                                <img
                                  src={`https://cdn.discordapp.com/avatars/${activity.userId}/${activity.avatar}.png`}
                                  alt={activity.username}
                                  className="w-8 h-8 rounded-full mr-3"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <div>
                                <div className="font-semibold">{activity.globalName || activity.username}</div>
                                <div className="text-sm text-blue-300">@{activity.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-blue-200">{activity.voiceJoinCount}</td>
                          <td className="py-3 px-4 text-green-300">{formatDuration(activity.totalVoiceTime)}</td>
                          <td className="py-3 px-4 text-blue-200">
                            {activity.lastVoiceJoin ? formatDate(activity.lastVoiceJoin) : 'Never'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              activity.userType === 'real_user' 
                                ? 'bg-green-500/20 text-green-300' 
                                : 'bg-yellow-500/20 text-yellow-300'
                            }`}>
                              {activity.userType === 'real_user' ? 'Real User' : 'Suspicious'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => loadUserDetails(activity.userId)}
                              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Comprehensive View Tab */}
            {activeTab === 'comprehensive' && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h2 className="text-2xl font-bold text-white mb-4">
                  {viewMode === 'today' && '📅 Today&apos;s Voice Activity'}
                  {viewMode === 'daily' && `📅 Daily Voice Activity - ${new Date(selectedDate).toLocaleDateString()}`}
                  {viewMode === 'roles' && '👑 Voice Activity by Role'}
                </h2>
                
                {/* Today's View */}
                {viewMode === 'today' && (
                  <>
                    {todayVoiceData.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-4">🎤</div>
                        <p className="text-blue-200 text-lg">No voice activity recorded today</p>
                        <p className="text-gray-400 text-sm">Users who join voice channels today will appear here</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-white/10">
                              <th className="py-3 px-4 text-green-300 font-semibold">User</th>
                              <th className="py-3 px-4 text-green-300 font-semibold">Role</th>
                              <th className="py-3 px-4 text-green-300 font-semibold">Today&apos;s Joins</th>
                              <th className="py-3 px-4 text-green-300 font-semibold">Today&apos;s Time</th>
                              <th className="py-3 px-4 text-green-300 font-semibold">Total Time</th>
                              <th className="py-3 px-4 text-green-300 font-semibold">Type</th>
                              <th className="py-3 px-4 text-green-300 font-semibold">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortTodayVoiceData(todayVoiceData).map((activity) => (
                              <tr key={activity._id} className="border-b border-white/5 hover:bg-white/5">
                                <td className="py-3 px-4 text-white">
                                  <div className="flex items-center">
                                    {activity.avatar && (
                                      <img
                                        src={`https://cdn.discordapp.com/avatars/${activity.userId}/${activity.avatar}.png`}
                                        alt={activity.username}
                                        className="w-8 h-8 rounded-full mr-3"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    )}
                                    <div>
                                      <div className="font-semibold">{activity.globalName || activity.username}</div>
                                      <div className="text-sm text-green-300">@{activity.username}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    activity.rank === 'Ace' ? 'bg-yellow-500/20 text-yellow-300' :
                                    activity.rank === 'Hero' ? 'bg-red-500/20 text-red-300' :
                                    activity.rank === 'Enigma' ? 'bg-purple-500/20 text-purple-300' :
                                    activity.rank === 'Warrior' ? 'bg-blue-500/20 text-blue-300' :
                                    activity.rank === 'Trainee' ? 'bg-green-500/20 text-green-300' :
                                    'bg-gray-500/20 text-gray-300'
                                  }`}>
                                    {activity.rank || 'None'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-green-200">{activity.todayJoinCount}</td>
                                <td className="py-3 px-4 text-green-300 font-semibold">{formatDuration(activity.todayVoiceTime)}</td>
                                <td className="py-3 px-4 text-blue-300">{formatDuration(activity.totalVoiceTime)}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    activity.userType === 'real_user' 
                                      ? 'bg-green-500/20 text-green-300' 
                                      : 'bg-yellow-500/20 text-yellow-300'
                                  }`}>
                                    {activity.userType === 'real_user' ? 'Real User' : 'Suspicious'}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <button
                                    onClick={() => loadUserDetails(activity.userId)}
                                    className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors"
                                  >
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}

                {/* Daily View */}
                {viewMode === 'daily' && (
                  <>
                    {dailyVoiceData.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-4">📅</div>
                        <p className="text-orange-200 text-lg">No voice activity found for {new Date(selectedDate).toLocaleDateString()}</p>
                        <p className="text-gray-400 text-sm">Try selecting a different date or check if there was any voice activity on that day</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-white/10">
                              <th className="py-3 px-4 text-orange-300 font-semibold">User</th>
                              <th className="py-3 px-4 text-orange-300 font-semibold">Role</th>
                              <th className="py-3 px-4 text-orange-300 font-semibold">Daily Joins</th>
                              <th className="py-3 px-4 text-orange-300 font-semibold">Daily Time</th>
                              <th className="py-3 px-4 text-orange-300 font-semibold">Channels</th>
                              <th className="py-3 px-4 text-orange-300 font-semibold">First Join</th>
                              <th className="py-3 px-4 text-orange-300 font-semibold">Last Join</th>
                              <th className="py-3 px-4 text-orange-300 font-semibold">Type</th>
                              <th className="py-3 px-4 text-orange-300 font-semibold">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortDailyVoiceData(dailyVoiceData).map((activity) => (
                              <tr key={activity._id} className="border-b border-white/5 hover:bg-white/5">
                                <td className="py-3 px-4 text-white">
                                  <div className="flex items-center">
                                    {activity.avatar && (
                                      <img
                                        src={`https://cdn.discordapp.com/avatars/${activity.userId}/${activity.avatar}.png`}
                                        alt={activity.username}
                                        className="w-8 h-8 rounded-full mr-3"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    )}
                                    <div>
                                      <div className="font-semibold">{activity.displayName || activity.globalName || activity.username}</div>
                                      <div className="text-sm text-orange-300">@{activity.username}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    activity.rank === 'Ace' ? 'bg-yellow-500/20 text-yellow-300' :
                                    activity.rank === 'Hero' ? 'bg-red-500/20 text-red-300' :
                                    activity.rank === 'Enigma' ? 'bg-purple-500/20 text-purple-300' :
                                    activity.rank === 'Warrior' ? 'bg-blue-500/20 text-blue-300' :
                                    activity.rank === 'Trainee' ? 'bg-green-500/20 text-green-300' :
                                    'bg-gray-500/20 text-gray-300'
                                  }`}>
                                    {activity.rank || 'None'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-orange-200">{activity.dailyJoinCount}</td>
                                <td className="py-3 px-4 text-green-300 font-semibold">{formatDuration(activity.dailyVoiceTime)}</td>
                                <td className="py-3 px-4 text-blue-300">
                                  <div className="flex flex-wrap gap-1">
                                    {activity.channels.slice(0, 2).map((channel, index) => (
                                      <span key={index} className="px-1 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                                        {channel}
                                      </span>
                                    ))}
                                    {activity.channels.length > 2 && (
                                      <span className="px-1 py-0.5 bg-gray-500/20 text-gray-300 rounded text-xs">
                                        +{activity.channels.length - 2}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-orange-200">
                                  {activity.firstJoin ? formatDate(activity.firstJoin) : 'N/A'}
                                </td>
                                <td className="py-3 px-4 text-orange-200">
                                  {activity.lastJoin ? formatDate(activity.lastJoin) : 'N/A'}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    activity.userType === 'real_user' 
                                      ? 'bg-green-500/20 text-green-300' 
                                      : 'bg-yellow-500/20 text-yellow-300'
                                  }`}>
                                    {activity.userType === 'real_user' ? 'Real User' : 'Suspicious'}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <button
                                    onClick={() => loadUserDetails(activity.userId)}
                                    className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm transition-colors"
                                  >
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}


                {/* Roles View */}
                {viewMode === 'roles' && (
                  <>
                    {voiceActivitiesByRoles.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-4">👑</div>
                        <p className="text-purple-200 text-lg">
                          {customRoles.some(role => role.id === roleFilter) ? 
                            `No users found with role: ${customRoles.find(role => role.id === roleFilter)?.name}` : 
                            'No voice activity found for the selected role'
                          }
                        </p>
                        <p className="text-gray-400 text-sm">
                          {customRoles.some(role => role.id === roleFilter) ? 
                            'Make sure the role ID is correct and users with this role have voice activity' :
                            'Try selecting a different role or user filter'
                          }
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-white/10">
                              <th className="py-3 px-4 text-purple-300 font-semibold">User</th>
                              <th className="py-3 px-4 text-purple-300 font-semibold">Role</th>
                              {selectedDate ? (
                                <>
                                  <th className="py-3 px-4 text-purple-300 font-semibold">Daily Joins</th>
                                  <th className="py-3 px-4 text-purple-300 font-semibold">Daily Time</th>
                                  <th className="py-3 px-4 text-purple-300 font-semibold">Channels</th>
                                </>
                              ) : (
                                <>
                                  <th className="py-3 px-4 text-purple-300 font-semibold">Total Joins</th>
                                  <th className="py-3 px-4 text-purple-300 font-semibold">Total Time</th>
                                  <th className="py-3 px-4 text-purple-300 font-semibold">Last Join</th>
                                </>
                              )}
                              <th className="py-3 px-4 text-purple-300 font-semibold">Type</th>
                              <th className="py-3 px-4 text-purple-300 font-semibold">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortVoiceActivities(voiceActivitiesByRoles).map((activity) => (
                              <tr key={activity._id} className="border-b border-white/5 hover:bg-white/5">
                                <td className="py-3 px-4 text-white">
                                  <div className="flex items-center">
                                    {activity.avatar && (
                                      <img
                                        src={`https://cdn.discordapp.com/avatars/${activity.userId}/${activity.avatar}.png`}
                                        alt={activity.username}
                                        className="w-8 h-8 rounded-full mr-3"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    )}
                                    <div>
                                      <div className="font-semibold">{activity.displayName || activity.globalName || activity.username}</div>
                                      <div className="text-sm text-purple-300">@{activity.username}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    activity.rank === 'Ace' ? 'bg-yellow-500/20 text-yellow-300' :
                                    activity.rank === 'Hero' ? 'bg-red-500/20 text-red-300' :
                                    activity.rank === 'Enigma' ? 'bg-purple-500/20 text-purple-300' :
                                    activity.rank === 'Warrior' ? 'bg-blue-500/20 text-blue-300' :
                                    activity.rank === 'Trainee' ? 'bg-green-500/20 text-green-300' :
                                    'bg-gray-500/20 text-gray-300'
                                  }`}>
                                    {customRoleId ? `Custom Role` : (activity.rank || 'None')}
                                  </span>
                                </td>
                                {selectedDate ? (
                                  <>
                                    <td className="py-3 px-4 text-purple-200">{activity.dailyJoinCount || 0}</td>
                                    <td className="py-3 px-4 text-green-300 font-semibold">{formatDuration(activity.dailyVoiceTime || 0)}</td>
                                    <td className="py-3 px-4 text-blue-300">
                                      <div className="flex flex-wrap gap-1">
                                        {(activity.channels || []).slice(0, 2).map((channel: string, index: number) => (
                                          <span key={index} className="px-1 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                                            {channel}
                                          </span>
                                        ))}
                                        {(activity.channels || []).length > 2 && (
                                          <span className="px-1 py-0.5 bg-gray-500/20 text-gray-300 rounded text-xs">
                                            +{(activity.channels || []).length - 2}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-3 px-4 text-purple-200">{activity.voiceJoinCount}</td>
                                    <td className="py-3 px-4 text-green-300">{formatDuration(activity.totalVoiceTime)}</td>
                                    <td className="py-3 px-4 text-purple-200">
                                      {activity.lastVoiceJoin ? formatDate(activity.lastVoiceJoin) : 'Never'}
                                    </td>
                                  </>
                                )}
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    activity.userType === 'real_user' 
                                      ? 'bg-green-500/20 text-green-300' 
                                      : 'bg-yellow-500/20 text-yellow-300'
                                  }`}>
                                    {activity.userType === 'real_user' ? 'Real User' : 'Suspicious'}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <button
                                    onClick={() => loadUserDetails(activity.userId)}
                                    className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm transition-colors"
                                  >
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Custom Roles Tab */}
            {activeTab === 'custom-roles' && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <span className="mr-2">⚙️</span>
                  Custom Role Management
                </h2>
                
                {/* Add Custom Role Section */}
                <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl p-6 border border-orange-500/20 mb-6">
                  <h3 className="text-xl font-bold text-white mb-4">Add Custom Role</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-orange-300 mb-2">Role ID</label>
                      <input
                        type="text"
                        value={customRoleId}
                        onChange={(e) => setCustomRoleId(e.target.value)}
                        placeholder="Enter Discord Role ID"
                        className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-orange-500 w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-orange-300 mb-2">Role Name</label>
                      <input
                        type="text"
                        value={customRoleName}
                        onChange={(e) => setCustomRoleName(e.target.value)}
                        placeholder="Enter custom role name"
                        className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-orange-500 w-full"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3 mt-4">
                    <button
                      onClick={async () => {
                        if (customRoleId && customRoleName) {
                          // Verify the role first
                          const verification = await verifyRole(customRoleId);
                          if (verification) {
                            setCustomRoles([...customRoles, { 
                              id: customRoleId, 
                              name: customRoleName,
                              verified: true,
                              userCount: verification.usersWithRole
                            }]);
                            setCustomRoleId('');
                            setCustomRoleName('');
                          }
                        }
                      }}
                      disabled={!customRoleId || !customRoleName || verifyingRole}
                      className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verifyingRole ? 'Verifying...' : 'Add & Verify Role'}
                    </button>
                    <button
                      onClick={() => {
                        if (customRoleId) {
                          verifyRole(customRoleId);
                        }
                      }}
                      disabled={!customRoleId || verifyingRole}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verifyingRole ? 'Verifying...' : 'Verify Only'}
                    </button>
                  </div>
                </div>

                {/* Verification Results */}
                {verificationResult && (
                  <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-xl p-6 border border-green-500/20 mb-6">
                    <h3 className="text-xl font-bold text-white mb-4">Role Verification Results</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white/5 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-300 mb-1">
                          {verificationResult.roleExists ? '✅' : '❌'}
                        </div>
                        <div className="text-green-200">Role Exists</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-300 mb-1">
                          {verificationResult.usersWithRole}
                        </div>
                        <div className="text-blue-200">Users with Role</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-300 mb-1">
                          {verificationResult.totalServerMembers}
                        </div>
                        <div className="text-purple-200">Total Server Members</div>
                      </div>
                    </div>
                    
                    {verificationResult.usersWithRole > 0 && (
                      <div className="mt-4">
                        <h4 className="text-lg font-semibold text-white mb-2">Users with this role:</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {verificationResult.usersWithRoleDetails.map((user: any, index: number) => (
                            <div key={index} className="flex items-center space-x-3 bg-white/5 rounded-lg p-3">
                              {user.avatar && (
                                <img 
                                  src={user.avatar} 
                                  alt={user.username}
                                  className="w-8 h-8 rounded-full"
                                />
                              )}
                              <div>
                                <div className="text-white font-semibold">{user.globalName}</div>
                                <div className="text-blue-200 text-sm">@{user.username}</div>
                              </div>
                            </div>
                          ))}
                          {verificationResult.hasMoreUsers && (
                            <div className="text-center text-blue-200 text-sm">
                              ... and {verificationResult.usersWithRole - 10} more users
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {verificationResult.usersWithRole === 0 && verificationResult.roleExists && (
                      <div className="mt-4 text-center">
                        <p className="text-orange-200">
                          ⚠️ Role exists in the server but no users currently have it assigned.
                        </p>
                      </div>
                    )}
                    
                    {!verificationResult.roleExists && (
                      <div className="mt-4 text-center">
                        <p className="text-red-200">
                          ❌ Role ID not found in any server member data. Please check if the role ID is correct.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Roles List */}
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/20 mb-6">
                  <h3 className="text-xl font-bold text-white mb-4">Custom Roles ({customRoles.length})</h3>
                  {customRoles.length === 0 ? (
                    <p className="text-blue-200 text-center py-4">No custom roles added yet</p>
                  ) : (
                    <div className="space-y-3">
                      {customRoles.map((role, index) => (
                        <div key={role.id} className="flex items-center justify-between bg-white/5 rounded-lg p-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              role.verified 
                                ? (role.userCount && role.userCount > 0 ? 'bg-green-500' : 'bg-orange-500')
                                : 'bg-gray-500'
                            }`}></div>
                            <div>
                              <div className="text-white font-semibold flex items-center space-x-2">
                                <span>{role.name}</span>
                                {role.verified && (
                                  <span className="text-xs">
                                    {role.userCount && role.userCount > 0 ? 
                                      `(${role.userCount} users)` : 
                                      '(0 users)'
                                    }
                                  </span>
                                )}
                              </div>
                              <div className="text-blue-200 text-sm">ID: {role.id}</div>
                              {role.verified && (
                                <div className="text-xs text-green-300">✅ Verified</div>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setRoleFilter(role.id);
                                setActiveTab('comprehensive');
                                setViewMode('roles');
                              }}
                              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                            >
                              Use in Filter
                            </button>
                            <button
                              onClick={async () => {
                                const verification = await verifyRole(role.id);
                                if (verification) {
                                  const updatedRoles = [...customRoles];
                                  updatedRoles[index] = {
                                    ...role,
                                    verified: true,
                                    userCount: verification.usersWithRole
                                  };
                                  setCustomRoles(updatedRoles);
                                }
                              }}
                              disabled={verifyingRole}
                              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors disabled:opacity-50"
                            >
                              {verifyingRole ? 'Verifying...' : 'Re-verify'}
                            </button>
                            <button
                              onClick={() => {
                                setCustomRoles(customRoles.filter((_, i) => i !== index));
                              }}
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <div className="flex items-start">
                    <div className="text-blue-300 text-xl mr-3">💡</div>
                    <div>
                      <h3 className="text-blue-300 font-semibold mb-2">How to find Discord Role ID:</h3>
                      <ol className="text-blue-200 text-sm space-y-1 list-decimal list-inside">
                        <li>Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)</li>
                        <li>Right-click on any role in your server</li>
                        <li>Click &quot;Copy ID&quot; to get the role ID</li>
                        <li>Paste the ID in the Role ID field above</li>
                      </ol>
                      <p className="text-blue-200 text-sm mt-2">
                        <strong>Note:</strong> Custom roles will appear in the Role Filter dropdown in the Comprehensive View tab.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Details Modal */}
            {selectedUser && userDetails && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-gray-900 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold text-white">User Voice Details</h3>
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                        setUserDetails(null);
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {/* User Info */}
                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-white mb-2">User Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-blue-200">
                        <div><span className="font-semibold">Username:</span> {userDetails.voiceActivity?.username}</div>
                        <div><span className="font-semibold">Display Name:</span> {userDetails.voiceActivity?.globalName || 'N/A'}</div>
                        <div><span className="font-semibold">Total Joins:</span> {userDetails.voiceActivity?.voiceJoinCount}</div>
                        <div><span className="font-semibold">Total Time:</span> {formatDuration(userDetails.voiceActivity?.totalVoiceTime || 0)}</div>
                      </div>
                    </div>

                    {/* Statistics */}
                    {userDetails.statistics && (
                      <div className="bg-white/5 rounded-lg p-4">
                        <h4 className="text-lg font-semibold text-white mb-2">Statistics</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-blue-200">
                          <div><span className="font-semibold">Sessions:</span> {userDetails.statistics.totalSessions}</div>
                          <div><span className="font-semibold">Duration:</span> {formatDuration(userDetails.statistics.totalDuration)}</div>
                          <div><span className="font-semibold">Avg Session:</span> {formatDuration(userDetails.statistics.avgSessionDuration)}</div>
                          <div><span className="font-semibold">Longest:</span> {formatDuration(userDetails.statistics.longestSession)}</div>
                          <div><span className="font-semibold">Top Channel:</span> {userDetails.statistics.mostActiveChannel}</div>
                        </div>
                      </div>
                    )}

                    {/* Recent Sessions */}
                    <div className="bg-white/5 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-white mb-2">Recent Sessions</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-white/10">
                              <th className="py-2 px-2 text-blue-300">Channel</th>
                              <th className="py-2 px-2 text-blue-300">Join Time</th>
                              <th className="py-2 px-2 text-blue-300">Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userDetails.voiceSessions?.slice(0, 10).map((session: VoiceSessionData) => (
                              <tr key={session._id} className="border-b border-white/5">
                                <td className="py-2 px-2 text-white">{session.channelName}</td>
                                <td className="py-2 px-2 text-blue-200">{formatDate(session.joinTime)}</td>
                                <td className="py-2 px-2 text-green-300">
                                  {session.duration ? formatDuration(session.duration) : 'In Progress'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
