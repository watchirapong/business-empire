'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface SectionStats {
  section: string;
  totalUniqueUsers: number;
  totalActions: number;
  dailyStats: Array<{
    date: string;
    uniqueUsers: number;
    totalActions: number;
  }>;
}

interface BehaviorTypeStats {
  behaviorType: string;
  uniqueUsers: number;
  totalActions: number;
  avgActionsPerUser: number;
}

interface TopUser {
  userId: string;
  username: string;
  globalName?: string;
  avatar?: string;
  totalActions: number;
  sections: string[];
  behaviorTypes: string[];
  lastActivity: string;
  firstActivity: string;
  sectionCount: number;
  behaviorTypeCount: number;
}

interface DailyBehaviorTrend {
  date: string;
  sections: Array<{
    section: string;
    uniqueUsers: number;
    totalActions: number;
  }>;
  totalUniqueUsers: number;
  totalActions: number;
}

interface PurchaseStats {
  behaviorType: string;
  totalSpent: number;
  totalTransactions: number;
  uniqueUsers: number;
  avgSpentPerUser: number;
}

interface BehaviorData {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  sectionStats: SectionStats[];
  behaviorTypeStats: BehaviorTypeStats[];
  topUsers: TopUser[];
  dailyBehaviorTrends: DailyBehaviorTrend[];
  purchaseStats: PurchaseStats[];
}

export default function BehaviorAnalytics() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [behaviorData, setBehaviorData] = useState<BehaviorData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'today' | 'week' | 'custom'>('week');
  const [customDays, setCustomDays] = useState<number>(7);
  const [expandedSections, setExpandedSections] = useState(new Set<string>());

  const loadBehaviorData = async () => {
    setLoading(true);
    setError(null);

    try {
      let url = '/api/analytics/behavior-stats?';
      
      if (viewMode === 'today') {
        url += `date=${selectedDate}`;
      } else if (viewMode === 'week') {
        url += 'days=7';
      } else {
        url += `days=${customDays}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to load behavior data');
      }

      const data = await response.json();
      
      if (data.success) {
        // Ensure all required fields have default values to prevent null errors
        const safeData = {
          ...data.data,
          sectionStats: (data.data.sectionStats || []).map((section: any) => ({
            ...section,
            totalUniqueUsers: section.totalUniqueUsers || 0,
            totalActions: section.totalActions || 0
          })),
          behaviorTypes: (data.data.behaviorTypes || []).map((behavior: any) => ({
            ...behavior,
            totalActions: behavior.totalActions || 0,
            avgActionsPerUser: behavior.avgActionsPerUser || 0
          })),
          topUsers: data.data.topUsers || [],
          purchaseAnalytics: (data.data.purchaseAnalytics || []).map((purchase: any) => ({
            ...purchase,
            uniqueUsers: purchase.uniqueUsers || 0,
            avgSpentPerUser: purchase.avgSpentPerUser || 0
          })),
          dailyTrends: data.data.dailyTrends || []
        };
        setBehaviorData(safeData);
      } else {
        throw new Error(data.error || 'Failed to load behavior data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load behavior data');
      console.error('Behavior analytics load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSectionExpansion = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const expandAllSections = () => {
    if (behaviorData?.sectionStats) {
      const allSections = new Set(behaviorData.sectionStats.map(stat => stat.section));
      setExpandedSections(allSections);
    }
  };

  const collapseAllSections = () => {
    setExpandedSections(new Set());
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

  const getSectionIcon = (section: string) => {
    const icons: { [key: string]: string } = {
      shop: '🛒',
      gacha: '🎰',
      university: '🎓',
      hamsterboard: '📋',
      profile: '👤',
      admin: '👑',
      home: '🏠'
    };
    return icons[section] || '📄';
  };

  const getSectionName = (section: string) => {
    const names: { [key: string]: string } = {
      shop: 'Shop',
      gacha: 'Gacha',
      university: 'University',
      hamsterboard: 'Hamster Board',
      profile: 'Profile',
      admin: 'Admin',
      home: 'Home'
    };
    return names[section] || section;
  };

  const getBehaviorTypeName = (behaviorType: string) => {
    const names: { [key: string]: string } = {
      shop_visit: 'Shop Visit',
      gacha_play: 'Gacha Play',
      university_visit: 'University Visit',
      hamsterboard_visit: 'Hamster Board Visit',
      profile_visit: 'Profile Visit',
      admin_visit: 'Admin Visit',
      purchase: 'Purchase',
      gacha_win: 'Gacha Win',
      gacha_spend: 'Gacha Spend'
    };
    return names[behaviorType] || behaviorType;
  };

  useEffect(() => {
    if ((session?.user as any)?.id) {
      loadBehaviorData();
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
        <span className="ml-4 text-white text-lg">Loading behavior analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
        <div className="text-red-200 text-center">
          <div className="text-xl font-bold mb-2">Error Loading Behavior Analytics</div>
          <div>{error}</div>
          <button
            onClick={loadBehaviorData}
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
            <div className="text-4xl">🎯</div>
            <div>
              <h2 className="text-2xl font-bold text-white">Behavior Analytics</h2>
              <p className="text-gray-300">Track user interactions with different sections</p>
            </div>
          </div>
          <button
            onClick={loadBehaviorData}
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-4 py-2 rounded-lg transition-all duration-300"
          >
            🔄 Refresh
          </button>
        </div>

        {/* View Mode Controls */}
        <div className="flex flex-wrap gap-4 items-center">
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
      </div>

      {behaviorData && (
        <>
          {/* Section Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {behaviorData.sectionStats.map((section) => (
              <div key={section.section} className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">{getSectionIcon(section.section)}</div>
                    <div>
                      <div className="text-white font-bold text-lg">{getSectionName(section.section)}</div>
                      <div className="text-gray-400 text-sm">Section Activity</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Unique Users:</span>
                    <span className="text-orange-400 font-bold">{section.totalUniqueUsers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total Actions:</span>
                    <span className="text-green-400 font-bold">{section.totalActions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Avg Actions/User:</span>
                    <span className="text-blue-400 font-bold">
                      {section.totalUniqueUsers > 0 && section.totalActions ? (section.totalActions / section.totalUniqueUsers).toFixed(1) : '0'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Behavior Type Statistics */}
          <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">🎯 Behavior Type Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {behaviorData.behaviorTypeStats.map((behavior) => (
                <div key={behavior.behaviorType} className="bg-gray-800/30 rounded-lg p-4">
                  <div className="text-white font-semibold mb-2">{getBehaviorTypeName(behavior.behaviorType)}</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Users:</span>
                      <span className="text-orange-400">{behavior.uniqueUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Actions:</span>
                      <span className="text-green-400">{behavior.totalActions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg/User:</span>
                      <span className="text-blue-400">{behavior.avgActionsPerUser ? behavior.avgActionsPerUser.toFixed(1) : '0.0'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Active Users */}
          <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">🏆 Top Active Users</h3>
            <div className="space-y-3">
              {behaviorData.topUsers.slice(0, 10).map((user, index) => (
                <div key={user.userId} className="bg-gray-800/30 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-orange-400 font-bold text-lg">#{index + 1}</div>
                    <img
                      src={`https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png`}
                      alt={user.username}
                      className="w-10 h-10 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                      }}
                    />
                    <div>
                      <div className="text-white font-medium">{getDisplayName(user)}</div>
                      <div className="text-gray-400 text-sm">@{user.username}</div>
                      <div className="text-gray-500 text-xs">
                        {user.sectionCount} sections • {user.behaviorTypeCount} behavior types
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-orange-400 font-bold">{user.totalActions} actions</div>
                    <div className="text-gray-400 text-sm">
                      Last: {formatTime(user.lastActivity)}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user.sections.slice(0, 3).map((section) => (
                        <span key={section} className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                          {getSectionIcon(section)} {getSectionName(section)}
                        </span>
                      ))}
                      {user.sections.length > 3 && (
                        <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                          +{user.sections.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Purchase Statistics */}
          {behaviorData.purchaseStats.length > 0 && (
            <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4">💰 Purchase & Spending Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {behaviorData.purchaseStats.map((purchase) => (
                  <div key={purchase.behaviorType} className="bg-gray-800/30 rounded-lg p-4">
                    <div className="text-white font-semibold mb-3">{getBehaviorTypeName(purchase.behaviorType)}</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Spent:</span>
                        <span className="text-orange-400 font-bold">{purchase.totalSpent.toLocaleString()} 🪙</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Transactions:</span>
                        <span className="text-green-400">{purchase.totalTransactions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Unique Users:</span>
                        <span className="text-blue-400">{purchase.uniqueUsers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avg per User:</span>
                        <span className="text-purple-400">{purchase.avgSpentPerUser ? purchase.avgSpentPerUser.toFixed(0) : '0'} 🪙</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Behavior Trends */}
          <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">📈 Daily Behavior Trends</h3>
              <div className="flex gap-2">
                <button
                  onClick={expandAllSections}
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-3 py-1 rounded text-sm transition-all duration-300"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAllSections}
                  className="bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-white px-3 py-1 rounded text-sm transition-all duration-300"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {behaviorData.dailyBehaviorTrends.length > 0 ? (
              <div className="space-y-4">
                {behaviorData.dailyBehaviorTrends.map((day) => (
                  <div key={day.date} className="bg-gray-800/30 rounded-lg border border-gray-600">
                    {/* Day Header */}
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">📅</div>
                          <div>
                            <div className="text-white font-semibold text-lg">
                              {formatDate(day.date)}
                            </div>
                            <div className="text-gray-300 text-sm">
                              {day.totalUniqueUsers} unique users • {day.totalActions} total actions
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section Breakdown */}
                    <div className="border-t border-gray-600 bg-gray-800/20 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {day.sections.map((section) => (
                          <div key={section.section} className="bg-gray-700/30 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="text-lg">{getSectionIcon(section.section)}</div>
                              <div className="text-white font-medium">{getSectionName(section.section)}</div>
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Users:</span>
                                <span className="text-orange-400">{section.uniqueUsers}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Actions:</span>
                                <span className="text-green-400">{section.totalActions}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📊</div>
                <div className="text-gray-300 text-lg">No behavior data found</div>
                <div className="text-gray-400 text-sm mt-2">
                  {viewMode === 'today' ? 'No activity recorded for the selected date' : 'No activity recorded for the selected period'}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
