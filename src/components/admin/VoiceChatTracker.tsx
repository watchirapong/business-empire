'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

interface VoiceUser {
  userId: string;
  username: string;
  globalName: string;
  nickname: string;
  avatar: string;
  channelId: string;
  channelName: string;
  joinTime: string;
  timeInVoice: number;
  roles: string[];
  highestRole: string;
  isMuted: boolean;
  isDeafened: boolean;
  wasInVoiceToday: boolean; // New field for today's voice activity
}

interface VoiceChatData {
  currentUsers: VoiceUser[];
  totalUsers: number;
  channels: string[];
  roleStats: { [key: string]: number };
  lastUpdated: string;
}

export default function VoiceChatTracker() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voiceData, setVoiceData] = useState<VoiceChatData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'time' | 'channel'>('name');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  const loadVoiceData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/current-voice-users');
      
      if (!response.ok) {
        throw new Error('Failed to load voice chat data');
      }

      const data = await response.json();
      
      if (data.success) {
        setVoiceData(data.data);
      } else {
        throw new Error(data.error || 'Failed to load voice chat data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load voice chat data');
      console.error('Voice chat load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if ((session?.user as any)?.id) {
      loadVoiceData();
    }
  }, [session, loadVoiceData]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !voiceData) return;

    const interval = setInterval(() => {
      loadVoiceData();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadVoiceData, voiceData]);

  const getRoleName = (roleId: string): string => {
    const roleNames: { [key: string]: string } = {
      '849738417683693638': 'Everyone',
      '1397111512619028551': 'Role 2',
      '1376806398649700402': 'Role 3',
      '1408421183409356800': 'Role 4',
      '1410273271588585567': 'Role 5',
      '1170819248038346814': 'Role 6',
      '1170800265566367775': 'Role 7',
      '1392710209608351806': 'Role 8',
      '1413435124955217930': 'Role 9',
      '1170814048229670932': 'Role 10',
    };
    return roleNames[roleId] || `Role ${roleId.slice(-4)}`;
  };

  const getRoleColor = (roleId: string): string => {
    const roleColors: { [key: string]: string } = {
      '849738417683693638': 'text-gray-400',
      '1397111512619028551': 'text-blue-400',
      '1376806398649700402': 'text-green-400',
      '1408421183409356800': 'text-yellow-400',
      '1410273271588585567': 'text-purple-400',
      '1170819248038346814': 'text-pink-400',
      '1170800265566367775': 'text-red-400',
      '1392710209608351806': 'text-orange-400',
      '1413435124955217930': 'text-cyan-400',
      '1170814048229670932': 'text-indigo-400',
    };
    return roleColors[roleId] || 'text-gray-400';
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatJoinTime = (joinTime: string): string => {
    const date = new Date(joinTime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Filter and sort users
  const filteredAndSortedUsers = (voiceData?.currentUsers || [])
    .filter(user => {
      const matchesSearch = 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.globalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.nickname.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = filterRole === 'all' || user.highestRole === filterRole;
      const matchesChannel = filterChannel === 'all' || user.channelName === filterChannel;
      
      return matchesSearch && matchesRole && matchesChannel;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.nickname.localeCompare(b.nickname);
        case 'role':
          return a.highestRole.localeCompare(b.highestRole);
        case 'time':
          return b.timeInVoice - a.timeInVoice;
        case 'channel':
          return a.channelName.localeCompare(b.channelName);
        default:
          return 0;
      }
    });

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
        <span className="ml-4 text-white text-lg">Loading voice chat data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
        <div className="text-red-200 text-center">
          <div className="text-xl font-bold mb-2">Error Loading Voice Chat Data</div>
          <div>{error}</div>
          <button
            onClick={loadVoiceData}
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
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-2">
          🎤 Voice Chat Tracker
        </h2>
        <p className="text-gray-300 text-lg">
          Track users currently in voice channels
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6">
          <div className="text-blue-100 text-sm font-medium">Total Users</div>
          <div className="text-3xl font-bold text-white">{voiceData?.totalUsers || 0}</div>
        </div>
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6">
          <div className="text-green-100 text-sm font-medium">Active Channels</div>
          <div className="text-3xl font-bold text-white">{voiceData?.channels.length || 0}</div>
        </div>
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-6">
          <div className="text-emerald-100 text-sm font-medium">In VC Today</div>
          <div className="text-3xl font-bold text-white">
            {voiceData?.currentUsers?.filter(user => user.wasInVoiceToday).length || 0}
          </div>
        </div>
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6">
          <div className="text-red-100 text-sm font-medium">Not in VC Today</div>
          <div className="text-3xl font-bold text-white">
            {voiceData?.currentUsers?.filter(user => !user.wasInVoiceToday).length || 0}
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6">
          <div className="text-purple-100 text-sm font-medium">Last Updated</div>
          <div className="text-sm font-bold text-white">
            {voiceData?.lastUpdated ? new Date(voiceData.lastUpdated).toLocaleTimeString() : 'Never'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800/50 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Name</option>
              <option value="role">Role</option>
              <option value="time">Time in Voice</option>
              <option value="channel">Channel</option>
            </select>
          </div>

          {/* Filter by Role */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Role</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              {Object.entries(voiceData?.roleStats || {}).map(([roleId, count]) => (
                <option key={roleId} value={roleId}>
                  {getRoleName(roleId)} ({count})
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Channel */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Channel</label>
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Channels</option>
              {voiceData?.channels.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
          </div>

          {/* Auto Refresh Controls */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Auto Refresh</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  autoRefresh 
                    ? 'bg-green-600 hover:bg-green-500 text-white' 
                    : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                }`}
              >
                {autoRefresh ? 'ON' : 'OFF'}
              </button>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                disabled={!autoRefresh}
                className="px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1m</option>
                <option value={300}>5m</option>
              </select>
            </div>
          </div>
        </div>

        {/* Manual Refresh Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={loadVoiceData}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <span>🔄</span>
            Refresh Now
          </button>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-gray-800/50 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">
            Current Voice Users ({filteredAndSortedUsers.length})
          </h3>
        </div>

        {filteredAndSortedUsers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">🎤</div>
            <div className="text-gray-400">
              {voiceData?.totalUsers === 0 
                ? 'No users currently in voice channels' 
                : 'No users match your current filters'
              }
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedUsers.map((user) => (
              <div
                key={user.userId}
                className={`bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700/70 transition-colors border-l-4 ${
                  user.wasInVoiceToday ? 'border-green-500' : 'border-red-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative">
                      <Image
                        src={user.avatar || '/default-avatar.png'}
                        alt={user.nickname}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                      {/* Status indicators */}
                      <div className="absolute -bottom-1 -right-1 flex gap-1">
                        {user.isMuted && (
                          <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-xs">🔇</span>
                          </div>
                        )}
                        {user.isDeafened && (
                          <div className="w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                            <span className="text-xs">🔇</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{user.nickname}</span>
                        <span className={`text-sm font-medium ${getRoleColor(user.highestRole)}`}>
                          {getRoleName(user.highestRole)}
                        </span>
                        {/* Today's Voice Activity Indicator */}
                        <div className={`w-3 h-3 rounded-full ${
                          user.wasInVoiceToday ? 'bg-green-500' : 'bg-red-500'
                        }`} title={user.wasInVoiceToday ? 'Was in voice chat today' : 'Not in voice chat today'}></div>
                      </div>
                      <div className="text-sm text-gray-400">
                        @{user.username}
                        {user.globalName && user.globalName !== user.username && (
                          <span> • {user.globalName}</span>
                        )}
                        <span className={`ml-2 text-xs ${user.wasInVoiceToday ? 'text-green-400' : 'text-red-400'}`}>
                          {user.wasInVoiceToday ? '✓ Today' : '✗ Today'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Voice Info */}
                  <div className="text-right">
                    <div className="text-sm text-gray-300">
                      <div className="font-medium">#{user.channelName}</div>
                      <div className="text-gray-400">
                        {formatTime(user.timeInVoice)} • Joined {formatJoinTime(user.joinTime)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
