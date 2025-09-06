'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import BehaviorAnalytics from './BehaviorAnalytics';

interface DailyStats {
  date: string;
  uniqueUsers: number;
  totalVisits: number;
  totalSessions: number;
  users: Array<{
    userId: string;
    username: string;
    globalName?: string;
    avatar?: string;
    firstVisit: string;
    lastVisit: string;
    totalVisits: number;
    sessionCount: number;
  }>;
}

interface OverallStats {
  totalUniqueUsers: number;
  totalVisits: number;
  totalSessions: number;
  avgVisitsPerUser: number;
}

interface HourlyStats {
  hour: number;
  uniqueUsers: number;
  totalVisits: number;
}

interface TopPage {
  page: string;
  visits: number;
  uniqueUsers: number;
}

interface AnalyticsData {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  dailyStats: DailyStats[];
  overallStats: OverallStats;
  hourlyStats: HourlyStats[];
  topPages: TopPage[];
}

export default function AnalyticsDashboard() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'today' | 'week' | 'custom'>('today');
  const [customDays, setCustomDays] = useState<number>(7);
  const [expandedDays, setExpandedDays] = useState(new Set<string>());
  const [activeView, setActiveView] = useState<'overview' | 'behavior'>('overview');

  const loadAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      let url = '/api/analytics/daily-stats?';
      
      if (viewMode === 'today') {
        url += `date=${selectedDate}`;
      } else if (viewMode === 'week') {
        url += 'days=7';
      } else {
        url += `days=${customDays}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to load analytics data');
      }

      const data = await response.json();
      
      if (data.success) {
        // Ensure all required fields have default values to prevent null errors
        const safeData = {
          ...data.data,
          overallStats: {
            totalUniqueUsers: data.data.overallStats?.totalUniqueUsers || 0,
            totalVisits: data.data.overallStats?.totalVisits || 0,
            totalSessions: data.data.overallStats?.totalSessions || 0,
            avgVisitsPerUser: data.data.overallStats?.avgVisitsPerUser || 0
          },
          dailyStats: data.data.dailyStats || [],
          hourlyStats: data.data.hourlyStats || [],
          topPages: data.data.topPages || [],
          period: data.data.period || { days: 1 }
        };
        setAnalyticsData(safeData);
      } else {
        throw new Error(data.error || 'Failed to load analytics data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
      console.error('Analytics load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDayExpansion = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  const expandAllDays = () => {
    if (analyticsData?.dailyStats) {
      const allDates = new Set(analyticsData.dailyStats.map(day => day.date));
      setExpandedDays(allDates);
    }
  };

  const collapseAllDays = () => {
    setExpandedDays(new Set());
  };

  const getDisplayName = (user: { username: string; globalName?: string }) => {
    return user.globalName || user.username;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  useEffect(() => {
    if ((session?.user as any)?.id) {
      loadAnalyticsData();
    }
  }, [session, viewMode, selectedDate, customDays]);

  if (!session) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
        <div className="text-red-200 text-center">Please log in to access this page</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        <span className="ml-4 text-white text-lg">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
        <div className="text-red-200 text-center">
          <div className="text-xl font-bold mb-2">Error Loading Analytics</div>
          <div>{error}</div>
          <button
            onClick={loadAnalyticsData}
            className="mt-4 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <div className="text-4xl">📊</div>
            <div>
              <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
              <p className="text-gray-300">Track daily active users and website activity</p>
            </div>
          </div>
          <button
            onClick={loadAnalyticsData}
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-4 py-2 rounded-lg transition-all duration-300"
          >
            🔄 Refresh
          </button>
        </div>

        {/* View Mode Controls */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveView('overview')}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                activeView === 'overview'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveView('behavior')}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                activeView === 'behavior'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🎯 Behavior Analytics
            </button>
          </div>
        </div>

        {/* Time Period Controls - Only show for overview */}
        {activeView === 'overview' && (
          <div className="flex flex-wrap gap-4 items-center mt-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('today')}
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  viewMode === 'today'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                📅 Today
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  viewMode === 'week'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                📊 Last 7 Days
              </button>
              <button
                onClick={() => setViewMode('custom')}
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  viewMode === 'custom'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                ⚙️ Custom
              </button>
            </div>

            {viewMode === 'today' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            )}

            {viewMode === 'custom' && (
              <div className="flex items-center space-x-2">
                <label className="text-gray-300">Days:</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={customDays}
                  onChange={(e) => setCustomDays(parseInt(e.target.value) || 7)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white w-20"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Render appropriate view */}
      {activeView === 'behavior' ? (
        <BehaviorAnalytics />
      ) : analyticsData && (
        <>
          {/* Overall Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 p-6">
              <div className="text-3xl font-bold text-blue-300 mb-2">
                {analyticsData.overallStats.totalUniqueUsers}
              </div>
              <div className="text-blue-200">Unique Users</div>
              <div className="text-blue-400 text-sm mt-1">
                {viewMode === 'today' ? 'Today' : `Last ${analyticsData.period.days} days`}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-green-500/20 p-6">
              <div className="text-3xl font-bold text-green-300 mb-2">
                {analyticsData.overallStats.totalVisits}
              </div>
              <div className="text-green-200">Total Visits</div>
              <div className="text-green-400 text-sm mt-1">
                {analyticsData.overallStats.totalSessions} sessions
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6">
              <div className="text-3xl font-bold text-purple-300 mb-2">
                {analyticsData.overallStats.totalSessions}
              </div>
              <div className="text-purple-200">Total Sessions</div>
              <div className="text-purple-400 text-sm mt-1">
                {analyticsData.overallStats.avgVisitsPerUser ? analyticsData.overallStats.avgVisitsPerUser.toFixed(1) : '0.0'} avg visits/user
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
              <div className="text-3xl font-bold text-orange-300 mb-2">
                {analyticsData.dailyStats.length > 0 ? analyticsData.dailyStats[0].uniqueUsers : 0}
              </div>
              <div className="text-orange-200">Today&apos;s Active Users</div>
              <div className="text-orange-400 text-sm mt-1">
                {analyticsData.dailyStats.length > 0 ? analyticsData.dailyStats[0].totalVisits : 0} visits
              </div>
            </div>
          </div>

          {/* Hourly Distribution (Today) */}
          {viewMode === 'today' && analyticsData.hourlyStats.length > 0 && (
            <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4">🕐 Hourly Activity Distribution</h3>
              <div className="grid grid-cols-12 gap-2">
                {Array.from({ length: 24 }, (_, hour) => {
                  const hourData = analyticsData.hourlyStats.find(h => h.hour === hour);
                  const maxUsers = Math.max(...analyticsData.hourlyStats.map(h => h.uniqueUsers));
                  const height = hourData ? (hourData.uniqueUsers / maxUsers) * 100 : 0;
                  
                  return (
                    <div key={hour} className="text-center">
                      <div className="text-xs text-gray-400 mb-1">{hour}:00</div>
                      <div className="bg-gray-700 rounded-t h-20 flex items-end justify-center">
                        <div
                          className="bg-orange-500 rounded-t w-full transition-all duration-500"
                          style={{ height: `${height}%` }}
                          title={`${hourData?.uniqueUsers || 0} users, ${hourData?.totalVisits || 0} visits`}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-300 mt-1">
                        {hourData?.uniqueUsers || 0}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Pages */}
          {analyticsData.topPages.length > 0 && (
            <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4">📄 Top Pages</h3>
              <div className="space-y-3">
                {analyticsData.topPages.map((page, index) => (
                  <div key={page.page} className="flex items-center justify-between bg-gray-800/30 rounded-lg p-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-orange-400 font-bold text-lg">#{index + 1}</div>
                      <div>
                        <div className="text-white font-medium">{page.page}</div>
                        <div className="text-gray-400 text-sm">{page.uniqueUsers} unique users</div>
                      </div>
                    </div>
                    <div className="text-orange-400 font-bold">{page.visits} visits</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Breakdown */}
          <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">📅 Daily Breakdown</h3>
              <div className="flex gap-2">
                <button
                  onClick={expandAllDays}
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-3 py-1 rounded text-sm transition-all duration-300"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAllDays}
                  className="bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-white px-3 py-1 rounded text-sm transition-all duration-300"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {analyticsData.dailyStats.length > 0 ? (
              <div className="space-y-4">
                {analyticsData.dailyStats.map((day) => {
                  const isExpanded = expandedDays.has(day.date);
                  
                  return (
                    <div
                      key={day.date}
                      className="bg-gray-800/30 rounded-lg border border-gray-600"
                    >
                      {/* Day Header */}
                      <div
                        className="p-4 cursor-pointer hover:bg-gray-700/30 transition-colors"
                        onClick={() => toggleDayExpansion(day.date)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="text-2xl">📅</div>
                            <div>
                              <div className="text-white font-semibold text-lg">
                                {formatDate(day.date)}
                              </div>
                              <div className="text-gray-300 text-sm">
                                {day.uniqueUsers} unique users • {day.totalVisits} visits • {day.totalSessions} sessions
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-orange-400 text-sm">
                              {isExpanded ? 'Click to collapse' : 'Click to expand'}
                            </span>
                            <svg
                              className={`w-5 h-5 text-orange-400 transition-transform duration-300 ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="border-t border-gray-600 bg-gray-800/20 p-4">
                          <div className="grid gap-4">
                            {day.users.map((user) => (
                              <div
                                key={user.userId}
                                className="bg-gray-700/30 rounded-lg p-4 flex items-center justify-between"
                              >
                                <div className="flex items-center space-x-4">
                                  <img
                                    src={`https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png`}
                                    alt={user.username}
                                    className="w-10 h-10 rounded-full"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                    }}
                                  />
                                  <div>
                                    <div className="text-white font-medium">
                                      {getDisplayName(user)}
                                    </div>
                                    <div className="text-gray-300 text-sm">
                                      @{user.username}
                                    </div>
                                    <div className="text-gray-400 text-xs">
                                      ID: {user.userId}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-orange-400 font-bold">
                                    {user.totalVisits} visits
                                  </div>
                                  <div className="text-gray-400 text-sm">
                                    {user.sessionCount} sessions
                                  </div>
                                  <div className="text-gray-500 text-xs">
                                    First: {formatTime(user.firstVisit)}
                                  </div>
                                  <div className="text-gray-500 text-xs">
                                    Last: {formatTime(user.lastVisit)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📊</div>
                <div className="text-gray-300 text-lg">No activity data found</div>
                <div className="text-gray-400 text-sm mt-2">
                  {viewMode === 'today' ? 'No visits recorded for the selected date' : 'No visits recorded for the selected period'}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
