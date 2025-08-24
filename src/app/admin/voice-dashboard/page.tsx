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
  const [activeTab, setActiveTab] = useState<'all' | 'today'>('all');
  const [sortBy, setSortBy] = useState<'totalTime' | 'todayTime' | 'joins' | 'todayJoins'>('totalTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Check if user is admin
  const isAdmin = session?.user && ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917'].includes((session.user as any).id);

  // Helper function to get display name (globalName > username)
  const getDisplayName = (activity: VoiceActivityData) => {
    return activity.globalName || activity.username;
  };

  useEffect(() => {
    if (isAdmin) {
      loadVoiceStats();
      loadVoiceActivities();
      loadTodayVoiceData();
      checkBotStatus();
    }
  }, [isAdmin, filter, limit]);

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

            {/* Today's Statistics */}
            {todayStats && (
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
                    onClick={() => setActiveTab('today')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                      activeTab === 'today'
                        ? 'bg-green-500 text-white'
                        : 'bg-white/10 text-green-200 hover:bg-white/20'
                    }`}
                  >
                    📅 Today&apos;s Voice Activity
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

            {/* Today's Activity Tab */}
            {activeTab === 'today' && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h2 className="text-2xl font-bold text-white mb-4">📅 Today&apos;s Voice Activity</h2>
                
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
