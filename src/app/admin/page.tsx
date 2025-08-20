'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserData {
  _id: string;
  discordId: string;
  username: string;
  email: string;
  globalName?: string;
  avatar: string;
  createdAt: string;
}

interface CurrencyData {
  _id: string;
  userId: string;
  hamsterCoins: number;
  totalEarned: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

interface VoiceActivityData {
  _id: string;
  userId: string;
  username: string;
  globalName?: string;
  avatar: string;
  voiceJoinCount: number;
  totalVoiceTime: number;
  lastVoiceJoin: string;
  lastVoiceLeave: string;
  userType: 'real_user' | 'suspicious_user';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [searchResults, setSearchResults] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userCurrency, setUserCurrency] = useState<CurrencyData | null>(null);
  const [userVoiceActivity, setUserVoiceActivity] = useState<VoiceActivityData | null>(null);
  const [userVoiceSessions, setUserVoiceSessions] = useState<VoiceSessionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [expandedUsers, setExpandedUsers] = useState(new Set<string>());
  const [isCurrencyManagementExpanded, setIsCurrencyManagementExpanded] = useState(true);
  const [isVoiceActivityExpanded, setIsVoiceActivityExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'voice-activity'>('users');
  const [voiceActivities, setVoiceActivities] = useState<VoiceActivityData[]>([]);
  const [voiceStats, setVoiceStats] = useState<VoiceStats | null>(null);
  const [voiceFilter, setVoiceFilter] = useState<'all' | 'real_user' | 'suspicious_user'>('all');

  // Check if user is authorized (admin Discord IDs)
  const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018'];

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/');
      return;
    }

    if (!ADMIN_USER_IDS.includes((session.user as any)?.id)) {
      router.push('/');
      return;
    }

    // Load all users when component mounts
    loadAllUsers();
    loadVoiceActivity();
  }, [session, status, router]);

  const loadAllUsers = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/search-users');
      
      if (!response.ok) {
        throw new Error('Failed to load users');
      }
      
      const data = await response.json();
      setAllUsers(data.users || []);
      setSearchResults(data.users || []);
      
      if (data.users.length === 0) {
        setMessage('No users found in the system.');
      }
    } catch (error) {
      setMessage('Error loading users. Please try again.');
      console.error('Load users error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVoiceActivity = async () => {
    try {
      const response = await fetch(`/api/admin/voice-activity?filter=${voiceFilter}`);
      
      if (!response.ok) {
        throw new Error('Failed to load voice activity');
      }
      
      const data = await response.json();
      setVoiceActivities(data.data.voiceActivities || []);
      setVoiceStats(data.data.statistics);
    } catch (error) {
      console.error('Load voice activity error:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim()) {
      setSearchResults(allUsers);
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`/api/admin/search-users?q=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        throw new Error('Failed to search users');
      }
      
      const data = await response.json();
      setSearchResults(data.users || []);
      
      if (data.users.length === 0) {
        setMessage('No users found with that username.');
      }
    } catch (error) {
      setMessage('Error searching users. Please try again.');
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserCurrency = async (userId: string) => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`/api/admin/user-currency?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to get user currency');
      }
      
      const data = await response.json();
      setUserCurrency(data.currency);
      
      if (!data.currency) {
        setMessage('No currency data found for this user.');
      }
    } catch (error) {
      setMessage('Error getting user currency. Please try again.');
      console.error('Currency error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserVoiceActivity = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/user-voice-activity?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to get user voice activity');
      }
      
      const data = await response.json();
      setUserVoiceActivity(data.data.voiceActivity);
      setUserVoiceSessions(data.data.voiceSessions || []);
    } catch (error) {
      console.error('Get user voice activity error:', error);
    }
  };

  const updateUserCurrency = async (userId: string, newBalance: number) => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/update-currency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          hamsterCoins: newBalance
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update currency');
      }
      
      const data = await response.json();
      setUserCurrency(data.currency);
      setMessage('Currency updated successfully!');
      
      // Refresh the currency data
      await getUserCurrency(userId);
    } catch (error) {
      setMessage('Error updating currency. Please try again.');
      console.error('Update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectUser = async (user: UserData) => {
    setSelectedUser(user);
    await getUserCurrency(user.discordId);
    await getUserVoiceActivity(user.discordId);
    // Auto-expand sections when user is selected
    setIsCurrencyManagementExpanded(true);
    setIsVoiceActivityExpanded(true);
  };

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const expandAllUsers = () => {
    const allUserIds = searchResults.map(user => user._id);
    setExpandedUsers(new Set(allUserIds));
  };

  const collapseAllUsers = () => {
    setExpandedUsers(new Set());
  };

  const handleVoiceFilterChange = (filter: 'all' | 'real_user' | 'suspicious_user') => {
    setVoiceFilter(filter);
    loadVoiceActivity();
  };

  const deleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone and will delete all user data including currency and voice activity.`)) {
      return;
    }

    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`/api/admin/delete-user?userId=${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete user');
      }
      
      await response.json();
      setMessage(`User "${username}" deleted successfully!`);
      
      // Clear selected user if it was the deleted user
      if (selectedUser && selectedUser.discordId === userId) {
        setSelectedUser(null);
        setUserCurrency(null);
        setUserVoiceActivity(null);
        setUserVoiceSessions([]);
      }
      
      // Refresh the user list
      await loadAllUsers();
      
    } catch (error) {
      setMessage('Error deleting user. Please try again.');
      console.error('Delete user error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading or unauthorized
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!session || !ADMIN_USER_IDS.includes((session.user as any)?.id)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Unauthorized Access</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.1),transparent_50%)]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <div className="text-4xl">👑</div>
            <div className="text-white text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              HamsterCoin Admin Panel
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-6 py-2 rounded-lg transition-all duration-300"
          >
            Back to Home
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              activeTab === 'users'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            👥 User Management
          </button>
          <button
            onClick={() => setActiveTab('voice-activity')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              activeTab === 'voice-activity'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            🎤 Voice Activity
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.includes('Error') ? 'bg-red-500/20 border border-red-500/30' : 'bg-green-500/20 border border-green-500/30'
          }`}>
            <p className="text-white">{message}</p>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <>
            {/* Search Section */}
            <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6 mb-8">
              <h2 className="text-2xl font-bold text-white mb-4"> Search Users</h2>
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Search by username or global name... (leave empty to show all)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                  className="flex-1 bg-gray-800/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                />
                <button
                  onClick={searchUsers}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-6 py-2 rounded-lg transition-all duration-300 disabled:opacity-50"
                >
                  {isLoading ? 'Searching...' : 'Search'}
                </button>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSearchResults(allUsers);
                  }}
                  className="bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-white px-6 py-2 rounded-lg transition-all duration-300"
                >
                  Show All
                </button>
              </div>
            </div>

            {/* Users List */}
            {searchResults.length > 0 && (
              <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">
                    👥 Users ({searchResults.length} found)
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={expandAllUsers}
                      className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-4 py-2 rounded-lg transition-all duration-300 text-sm"
                    >
                      Expand All
                    </button>
                    <button
                      onClick={collapseAllUsers}
                      className="bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-white px-4 py-2 rounded-lg transition-all duration-300 text-sm"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>
                <div className="grid gap-4 max-h-96 overflow-y-auto">
                  {searchResults.map((user) => {
                    const isExpanded = expandedUsers.has(user._id);
                    const isSelected = selectedUser?._id === user._id;
                    
                    return (
                      <div
                        key={user._id}
                        className={`rounded-lg border transition-all duration-300 ${
                          isSelected
                            ? 'bg-orange-500/20 border-orange-400'
                            : 'bg-gray-800/30 border-gray-600 hover:bg-gray-700/30'
                        }`}
                      >
                        {/* User Header - Always Visible */}
                        <div 
                          className="p-4 cursor-pointer"
                          onClick={() => toggleUserExpansion(user._id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <img
                                src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`}
                                alt={user.username}
                                className="w-12 h-12 rounded-full"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                }}
                              />
                              <div className="flex-1">
                                <div className="text-white font-semibold">{user.username}</div>
                                <div className="text-gray-300 text-sm">
                                  {user.globalName && `(${user.globalName})`} • {user.email}
                                </div>
                                <div className="text-gray-400 text-xs">
                                  ID: {user.discordId} • Joined: {new Date(user.createdAt).toLocaleDateString()}
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
                            <div className="grid md:grid-cols-2 gap-6">
                              {/* User Details */}
                              <div className="bg-gray-800/30 rounded-lg p-4">
                                <h4 className="text-lg font-semibold text-white mb-3"> User Details</h4>
                                <div className="space-y-2 text-gray-300">
                                  <div><span className="font-medium">Username:</span> {user.username}</div>
                                  <div><span className="font-medium">Global Name:</span> {user.globalName || 'N/A'}</div>
                                  <div><span className="font-medium">Email:</span> {user.email}</div>
                                  <div><span className="font-medium">Discord ID:</span> {user.discordId}</div>
                                  <div><span className="font-medium">Joined:</span> {new Date(user.createdAt).toLocaleString()}</div>
                                </div>
                              </div>

                              {/* Quick Actions */}
                              <div className="bg-gray-800/30 rounded-lg p-4">
                                <h4 className="text-lg font-semibold text-white mb-3">⚡ Quick Actions</h4>
                                <div className="space-y-3">
                                  <button
                                    onClick={() => selectUser(user)}
                                    className={`w-full py-2 px-4 rounded-lg transition-all duration-300 ${
                                      isSelected
                                        ? 'bg-orange-600 text-white'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                                    }`}
                                  >
                                    {isSelected ? '✓ Selected' : 'Select for Management'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(user.discordId);
                                      setMessage('Discord ID copied to clipboard!');
                                      setTimeout(() => setMessage(''), 2000);
                                    }}
                                    className="w-full bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded-lg transition-all duration-300"
                                  >
                                    Copy Discord ID
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(user.email);
                                      setMessage('Email copied to clipboard!');
                                      setTimeout(() => setMessage(''), 2000);
                                    }}
                                    className="w-full bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded-lg transition-all duration-300"
                                  >
                                    Copy Email
                                  </button>
                                  <button
                                    onClick={() => deleteUser(user.discordId, user.username)}
                                    className="w-full bg-red-600 hover:bg-red-500 text-white py-2 px-4 rounded-lg transition-all duration-300"
                                  >
                                    🗑️ Delete User
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* User Management Sections */}
            {selectedUser && (
              <>
                {/* Currency Management */}
                {userCurrency && (
                  <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6 mb-8">
                    {/* Currency Management Header - Clickable */}
                    <div 
                      className="flex items-center justify-between cursor-pointer mb-4"
                      onClick={() => setIsCurrencyManagementExpanded(!isCurrencyManagementExpanded)}
                    >
                      <div className="flex items-center space-x-3">
                        <h3 className="text-xl font-bold text-white">🪙 Currency Management</h3>
                        <span className="text-orange-400 text-sm">
                          {isCurrencyManagementExpanded ? 'Click to collapse' : 'Click to expand'}
                        </span>
                      </div>
                      <svg
                        className={`w-6 h-6 text-orange-400 transition-transform duration-300 ${
                          isCurrencyManagementExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Currency Management Content - Collapsible */}
                    {isCurrencyManagementExpanded && (
                      <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* User Info */}
                          <div className="bg-gray-800/30 rounded-lg p-4">
                            <h4 className="text-lg font-semibold text-white mb-3">User Information</h4>
                            <div className="space-y-2 text-gray-300">
                              <div><span className="font-medium">Username:</span> {selectedUser.username}</div>
                              <div><span className="font-medium">Global Name:</span> {selectedUser.globalName || 'N/A'}</div>
                              <div><span className="font-medium">Email:</span> {selectedUser.email}</div>
                              <div><span className="font-medium">Discord ID:</span> {selectedUser.discordId}</div>
                            </div>
                          </div>

                          {/* Currency Info */}
                          <div className="bg-gray-800/30 rounded-lg p-4">
                            <h4 className="text-lg font-semibold text-white mb-3">Currency Information</h4>
                            <div className="space-y-2 text-gray-300">
                              <div><span className="font-medium">Current Balance:</span> {userCurrency.hamsterCoins.toLocaleString()} 🪙</div>
                              <div><span className="font-medium">Total Earned:</span> {userCurrency.totalEarned.toLocaleString()} 🪙</div>
                              <div><span className="font-medium">Total Spent:</span> {userCurrency.totalSpent.toLocaleString()} 🪙</div>
                              <div><span className="font-medium">Created:</span> {new Date(userCurrency.createdAt).toLocaleDateString()}</div>
                              <div><span className="font-medium">Updated:</span> {new Date(userCurrency.updatedAt).toLocaleDateString()}</div>
                            </div>
                          </div>
                        </div>

                        {/* Update Currency */}
                        <div className="bg-gray-800/30 rounded-lg p-4">
                          <h4 className="text-lg font-semibold text-white mb-3">Update Currency Balance</h4>
                          <div className="flex gap-4 items-end">
                            <div className="flex-1">
                              <label className="block text-gray-300 text-sm mb-2">New Balance (Hamster Coins)</label>
                              <input
                                type="number"
                                min="0"
                                value={userCurrency.hamsterCoins}
                                onChange={(e) => setUserCurrency({
                                  ...userCurrency,
                                  hamsterCoins: parseInt(e.target.value) || 0
                                })}
                                className="w-full bg-gray-700/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-400"
                              />
                            </div>
                            <button
                              onClick={() => updateUserCurrency(selectedUser.discordId, userCurrency.hamsterCoins)}
                              disabled={isLoading}
                              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white px-6 py-2 rounded-lg transition-all duration-300 disabled:opacity-50"
                            >
                              {isLoading ? 'Updating...' : 'Update Balance'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Voice Activity Management */}
                {userVoiceActivity && (
                  <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6 mb-8">
                    {/* Voice Activity Header - Clickable */}
                    <div 
                      className="flex items-center justify-between cursor-pointer mb-4"
                      onClick={() => setIsVoiceActivityExpanded(!isVoiceActivityExpanded)}
                    >
                      <div className="flex items-center space-x-3">
                        <h3 className="text-xl font-bold text-white">🎤 Voice Activity</h3>
                        <span className="text-orange-400 text-sm">
                          {isVoiceActivityExpanded ? 'Click to collapse' : 'Click to expand'}
                        </span>
                      </div>
                      <svg
                        className={`w-6 h-6 text-orange-400 transition-transform duration-300 ${
                          isVoiceActivityExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Voice Activity Content - Collapsible */}
                    {isVoiceActivityExpanded && (
                      <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Voice Stats */}
                          <div className="bg-gray-800/30 rounded-lg p-4">
                            <h4 className="text-lg font-semibold text-white mb-3">Voice Statistics</h4>
                            <div className="space-y-2 text-gray-300">
                              <div><span className="font-medium">User Type:</span> 
                                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                  userVoiceActivity.userType === 'real_user' 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-yellow-600 text-white'
                                }`}>
                                  {userVoiceActivity.userType === 'real_user' ? 'Real User' : 'Suspicious User'}
                                </span>
                              </div>
                              <div><span className="font-medium">Voice Join Count:</span> {userVoiceActivity.voiceJoinCount}</div>
                              <div><span className="font-medium">Total Voice Time:</span> {userVoiceActivity.totalVoiceTime} minutes</div>
                              <div><span className="font-medium">Last Voice Join:</span> {userVoiceActivity.lastVoiceJoin ? new Date(userVoiceActivity.lastVoiceJoin).toLocaleString() : 'Never'}</div>
                              <div><span className="font-medium">Last Voice Leave:</span> {userVoiceActivity.lastVoiceLeave ? new Date(userVoiceActivity.lastVoiceLeave).toLocaleString() : 'Never'}</div>
                            </div>
                          </div>

                          {/* Recent Voice Sessions */}
                          <div className="bg-gray-800/30 rounded-lg p-4">
                            <h4 className="text-lg font-semibold text-white mb-3">Recent Voice Sessions</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {userVoiceSessions.slice(0, 5).map((session) => (
                                <div key={session._id} className="bg-gray-700/30 rounded p-2 text-sm">
                                  <div className="text-gray-300">
                                    <div><span className="font-medium">Channel:</span> {session.channelName}</div>
                                    <div><span className="font-medium">Duration:</span> {session.duration || 0} minutes</div>
                                    <div><span className="font-medium">Joined:</span> {new Date(session.joinTime).toLocaleString()}</div>
                                  </div>
                                </div>
                              ))}
                              {userVoiceSessions.length === 0 && (
                                <div className="text-gray-400 text-sm">No voice sessions found</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Delete User Section */}
                <div className="bg-gradient-to-br from-red-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-red-500/20 p-6 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-xl font-bold text-white">⚠️ Danger Zone</h3>
                    </div>
                  </div>
                  
                  <div className="bg-red-800/20 rounded-lg p-4 border border-red-500/30">
                    <h4 className="text-lg font-semibold text-red-300 mb-3">Delete User Account</h4>
                    <div className="space-y-3">
                      <div className="text-red-200 text-sm">
                        <p><strong>Warning:</strong> This action will permanently delete:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>User account data</li>
                          <li>All currency and balance information</li>
                          <li>Voice activity records</li>
                          <li>Voice session history</li>
                        </ul>
                        <p className="mt-2"><strong>This action cannot be undone!</strong></p>
                      </div>
                      <button
                        onClick={() => deleteUser(selectedUser.discordId, selectedUser.username)}
                        disabled={isLoading}
                        className="w-full bg-red-600 hover:bg-red-500 text-white py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 font-semibold"
                      >
                        {isLoading ? 'Deleting...' : '🗑️ Delete User Permanently'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Voice Activity Tab */}
        {activeTab === 'voice-activity' && (
          <>
            {/* Voice Activity Statistics */}
            {voiceStats && (
              <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6 mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">📊 Voice Activity Statistics</h2>
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-white">{voiceStats.totalUsers}</div>
                    <div className="text-gray-300">Total Users</div>
                  </div>
                  <div className="bg-green-600/20 rounded-lg p-4 text-center border border-green-500/30">
                    <div className="text-3xl font-bold text-green-400">{voiceStats.realUsers}</div>
                    <div className="text-gray-300">Real Users</div>
                  </div>
                  <div className="bg-yellow-600/20 rounded-lg p-4 text-center border border-yellow-500/30">
                    <div className="text-3xl font-bold text-yellow-400">{voiceStats.suspiciousUsers}</div>
                    <div className="text-gray-300">Suspicious Users</div>
                  </div>
                  <div className="bg-blue-600/20 rounded-lg p-4 text-center border border-blue-500/30">
                    <div className="text-3xl font-bold text-blue-400">
                      {voiceStats.totalUsers > 0 ? Math.round((voiceStats.realUsers / voiceStats.totalUsers) * 100) : 0}%
                    </div>
                    <div className="text-gray-300">Real User Rate</div>
                  </div>
                </div>
              </div>
            )}

            {/* Voice Activity Filter */}
            <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6 mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">🎤 Voice Activity Filter</h2>
              <div className="flex gap-4">
                <button
                  onClick={() => handleVoiceFilterChange('all')}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                    voiceFilter === 'all'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  All Users ({voiceStats?.totalUsers || 0})
                </button>
                <button
                  onClick={() => handleVoiceFilterChange('real_user')}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                    voiceFilter === 'real_user'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  Real Users ({voiceStats?.realUsers || 0})
                </button>
                <button
                  onClick={() => handleVoiceFilterChange('suspicious_user')}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                    voiceFilter === 'suspicious_user'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  Suspicious Users ({voiceStats?.suspiciousUsers || 0})
                </button>
              </div>
            </div>

            {/* Voice Activity List */}
            {voiceActivities.length > 0 && (
              <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
                <h3 className="text-xl font-bold text-white mb-4">
                  🎤 Voice Activity ({voiceActivities.length} users)
                </h3>
                <div className="grid gap-4 max-h-96 overflow-y-auto">
                  {voiceActivities.map((activity) => (
                    <div
                      key={activity._id}
                      className={`p-4 rounded-lg border transition-all duration-300 ${
                        activity.userType === 'real_user'
                          ? 'bg-green-600/10 border-green-500/30'
                          : 'bg-yellow-600/10 border-yellow-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <img
                            src={`https://cdn.discordapp.com/avatars/${activity.userId}/${activity.avatar}.png`}
                            alt={activity.username}
                            className="w-12 h-12 rounded-full"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                            }}
                          />
                          <div>
                            <div className="text-white font-semibold">{activity.username}</div>
                            <div className="text-gray-300 text-sm">
                              {activity.globalName && `(${activity.globalName})`}
                            </div>
                            <div className="text-gray-400 text-xs">
                              ID: {activity.userId}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            activity.userType === 'real_user'
                              ? 'bg-green-600 text-white'
                              : 'bg-yellow-600 text-white'
                          }`}>
                            {activity.userType === 'real_user' ? 'Real User' : 'Suspicious User'}
                          </div>
                          <div className="text-gray-300 text-sm mt-2">
                            <div>Joins: {activity.voiceJoinCount}</div>
                            <div>Time: {activity.totalVoiceTime} min</div>
                            <div className="text-xs text-gray-400">
                              Last: {activity.lastVoiceJoin ? new Date(activity.lastVoiceJoin).toLocaleDateString() : 'Never'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
