'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface StardustCoinAccount {
  _id: string;
  userId: string;
  username: string;
  globalName: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastUpdated: string;
  createdAt: string;
}

interface User {
  _id: string;
  discordId: string;
  username: string;
  globalName?: string;
  email?: string;
  avatar?: string;
  currentNickname?: string;
  source: string;
  hasVoiceActivity?: boolean;
  voiceJoinCount?: number;
  totalVoiceTime?: number;
  createdAt: string;
}

interface UserWithStardustCoin extends User {
  stardustCoinAccount?: StardustCoinAccount;
  stardustCoinBalance?: number;
}

export default function StardustCoinManager() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [message, setMessage] = useState('');
  
  // User and StardustCoin data
  const [allUsers, setAllUsers] = useState<UserWithStardustCoin[]>([]);
  const [stardustCoinAccounts, setStardustCoinAccounts] = useState<StardustCoinAccount[]>([]);
  
  // Search and management states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserWithStardustCoin[]>([]);
  const [expandedUsers, setExpandedUsers] = useState(new Set<string>());
  const [selectedUser, setSelectedUser] = useState<UserWithStardustCoin | null>(null);
  
  // Form states
  const [targetUserId, setTargetUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState<'add' | 'remove' | 'set'>('add');
  const [reason, setReason] = useState('');

  const loadAllUsers = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      // Fetch all users
      const usersResponse = await fetch('/api/admin/search-users');
      if (!usersResponse.ok) {
        throw new Error('Failed to load users');
      }
      const usersData = await usersResponse.json();
      const users = usersData.users || [];

      // Fetch all StardustCoin accounts
      const stardustResponse = await fetch('/api/admin/stardustcoin?limit=1000');
      const stardustData = await stardustResponse.json();
      const stardustAccounts = stardustData.success ? stardustData.data.accounts : [];

      // Create a map of StardustCoin accounts by userId
      const stardustMap = new Map();
      stardustAccounts.forEach((account: StardustCoinAccount) => {
        stardustMap.set(account.userId, account);
      });

      // Combine users with their StardustCoin data
      const usersWithStardustCoin: UserWithStardustCoin[] = users.map((user: User) => {
        const stardustAccount = stardustMap.get(user.discordId);
        return {
          ...user,
          stardustCoinAccount: stardustAccount,
          stardustCoinBalance: stardustAccount?.balance || 0
        };
      });

      setAllUsers(usersWithStardustCoin);
      setSearchResults(usersWithStardustCoin);
      setStardustCoinAccounts(stardustAccounts);
      setError(null);

      if (usersWithStardustCoin.length === 0) {
        setMessage('No users found in the system.');
      }
    } catch (err) {
      setError('Error loading users. Please try again.');
      console.error('Load users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = () => {
    if (!searchTerm.trim()) {
      setSearchResults(allUsers);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    
    // Sort results by relevance: exact matches first, then partial matches
    const filtered = allUsers.filter(user => 
      user.username.toLowerCase().includes(searchLower) ||
      (user.globalName && user.globalName.toLowerCase().includes(searchLower)) ||
      user.discordId.includes(searchTerm) ||
      (user.currentNickname && user.currentNickname.toLowerCase().includes(searchLower))
    ).sort((a, b) => {
      // Prioritize exact matches
      const aNickname = a.currentNickname?.toLowerCase() || '';
      const bNickname = b.currentNickname?.toLowerCase() || '';
      const aUsername = a.username.toLowerCase();
      const bUsername = b.username.toLowerCase();
      const aGlobalName = a.globalName?.toLowerCase() || '';
      const bGlobalName = b.globalName?.toLowerCase() || '';
      
      // Exact nickname matches first
      if (aNickname === searchLower && bNickname !== searchLower) return -1;
      if (bNickname === searchLower && aNickname !== searchLower) return 1;
      
      // Exact username matches second
      if (aUsername === searchLower && bUsername !== searchLower) return -1;
      if (bUsername === searchLower && aUsername !== searchLower) return 1;
      
      // Exact global name matches third
      if (aGlobalName === searchLower && bGlobalName !== searchLower) return -1;
      if (bGlobalName === searchLower && aGlobalName !== searchLower) return 1;
      
      // Then partial matches starting with the search term
      if (aNickname.startsWith(searchLower) && !bNickname.startsWith(searchLower)) return -1;
      if (bNickname.startsWith(searchLower) && !aNickname.startsWith(searchLower)) return 1;
      
      if (aUsername.startsWith(searchLower) && !bUsername.startsWith(searchLower)) return -1;
      if (bUsername.startsWith(searchLower) && !aUsername.startsWith(searchLower)) return 1;
      
      if (aGlobalName.startsWith(searchLower) && !bGlobalName.startsWith(searchLower)) return -1;
      if (bGlobalName.startsWith(searchLower) && !aGlobalName.startsWith(searchLower)) return 1;
      
      return 0;
    });
    
    setSearchResults(filtered);
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
    const allIds = new Set(searchResults.map(user => user._id));
    setExpandedUsers(allIds);
  };

  const collapseAllUsers = () => {
    setExpandedUsers(new Set());
  };

  const selectUser = (user: UserWithStardustCoin) => {
    setSelectedUser(user);
    setTargetUserId(user.discordId);
  };

  const getDisplayName = (user: UserWithStardustCoin) => {
    return user.globalName || user.username;
  };

  const createStardustCoinAccountsForAllUsers = async () => {
    setBulkCreating(true);
    setMessage('');
    
    try {
      // Find users without StardustCoin accounts
      const usersWithoutAccounts = allUsers.filter(user => !user.stardustCoinAccount);
      
      if (usersWithoutAccounts.length === 0) {
        setMessage('All users already have StardustCoin accounts!');
        setTimeout(() => setMessage(''), 3000);
        return;
      }

      setMessage(`Creating StardustCoin accounts for ${usersWithoutAccounts.length} users...`);
      
      // Create accounts for all users without them
      const promises = usersWithoutAccounts.map(async (user) => {
        try {
          const response = await fetch('/api/admin/stardustcoin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              targetUserId: user.discordId,
              amount: 0, // Start with 0 balance
              action: 'add', // This will create the account if it doesn't exist
              reason: 'Bulk account creation'
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to create account for ${user.username}: ${errorData.error}`);
          }
          
          return { success: true, user: user.username };
        } catch (error) {
          console.error(`Error creating account for ${user.username}:`, error);
          return { success: false, user: user.username, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });

      const results = await Promise.all(promises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success);
      
      if (failed.length > 0) {
        setMessage(`✅ Created ${successful} accounts successfully. ❌ Failed to create ${failed.length} accounts. Check console for details.`);
      } else {
        setMessage(`✅ Successfully created StardustCoin accounts for all ${successful} users!`);
      }
      
      // Refresh the data
      await loadAllUsers();
      
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      setMessage('❌ Error during bulk account creation. Please try again.');
      console.error('Bulk account creation error:', error);
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setBulkCreating(false);
    }
  };

  const handleStardustCoinAction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!targetUserId || !amount) {
      setMessage('Please fill in all required fields');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setMessage('Amount must be a positive number');
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/stardustcoin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId,
          amount: amountNum,
          action,
          reason: reason || 'Admin action'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage(data.message);
        setTargetUserId('');
        setAmount('');
        setReason('');
        setSelectedUser(null);
        await loadAllUsers(); // Refresh data
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || 'Failed to perform StardustCoin action');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      setMessage('Network error occurred');
      console.error('Error performing StardustCoin action:', err);
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if ((session?.user as any)?.id) {
      loadAllUsers();
    }
  }, [(session?.user as any)?.id]);

  if (!session) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
        <div className="text-red-200 text-center">Please log in to access this page</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.includes('Error') || message.includes('Failed') ? 'bg-red-500/20 border border-red-500/30' : 'bg-green-500/20 border border-green-500/30'
        }`}>
          <p className="text-white">{message}</p>
        </div>
      )}

      {/* Search Section */}
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6 mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">✨ Search Users & StardustCoin</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="🔍 Search by nickname, username, global name, or user ID... (leave empty to show all)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
            className="flex-1 bg-gray-800/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
          />
          <button
            onClick={searchUsers}
            disabled={loading}
            className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white px-6 py-2 rounded-lg transition-all duration-300 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
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

      {/* Statistics */}
      {allUsers.length > 0 && (
        <div className="space-y-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-300 mb-1">
                {allUsers.length}
              </div>
              <div className="text-blue-200">Total Users</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-300 mb-1">
                {stardustCoinAccounts.length}
              </div>
              <div className="text-purple-200">StardustCoin Accounts</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-pink-300 mb-1">
                {stardustCoinAccounts.reduce((sum, account) => sum + account.balance, 0).toLocaleString()}
              </div>
              <div className="text-pink-200">Total StardustCoin</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-300 mb-1">
                {stardustCoinAccounts.length > 0 ? Math.round(stardustCoinAccounts.reduce((sum, account) => sum + account.balance, 0) / stardustCoinAccounts.length) : 0}
              </div>
              <div className="text-green-200">Average Balance</div>
            </div>
          </div>
          
          {/* Bulk Account Creation */}
          <div className="bg-gradient-to-br from-green-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-green-500/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">🚀 Bulk Account Creation</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 mb-2">
                  Create StardustCoin accounts for all users who don&apos;t have one yet.
                </p>
                <p className="text-gray-400 text-sm">
                  Users without accounts: {allUsers.filter(user => !user.stardustCoinAccount).length}
                </p>
              </div>
              <button
                onClick={createStardustCoinAccountsForAllUsers}
                disabled={bulkCreating || allUsers.filter(user => !user.stardustCoinAccount).length === 0}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                  bulkCreating || allUsers.filter(user => !user.stardustCoinAccount).length === 0
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white'
                }`}
              >
                {bulkCreating ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </div>
                ) : (
                  '✨ Create All Accounts'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Actions */}
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6 mb-8">
        <h3 className="text-xl font-bold text-white mb-4">⚡ Admin Actions</h3>
        
        <form onSubmit={handleStardustCoinAction} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-orange-300 mb-2">User ID</label>
              <input
                type="text"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Enter Discord User ID"
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-orange-500 w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-orange-300 mb-2">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min="0"
                step="0.01"
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-orange-500 w-full"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-orange-300 mb-2">Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as 'add' | 'remove' | 'set')}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-orange-500 w-full"
              >
                <option value="add">Add StardustCoin</option>
                <option value="remove">Remove StardustCoin</option>
                <option value="set">Set Balance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-orange-300 mb-2">Reason (Optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for this action"
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-orange-500 w-full"
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={actionLoading}
            className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50"
          >
            {actionLoading ? 'Processing...' : 'Execute Action'}
          </button>
        </form>
      </div>

      {/* Users List */}
      {searchResults.length > 0 && (
        <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">
              👥 Users & StardustCoin ({searchResults.length} found)
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
          <div className="grid gap-4 max-h-[800px] overflow-y-auto">
            {searchResults.map((user) => {
              const isExpanded = expandedUsers.has(user._id);
              const isSelected = selectedUser?._id === user._id;
              const hasStardustCoin = user.stardustCoinAccount;
              
              return (
                <div
                  key={user._id}
                  className={`rounded-lg border transition-all duration-300 ${
                    isSelected
                      ? 'bg-purple-500/20 border-purple-400'
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
                          <div className="text-white font-semibold">{getDisplayName(user)}</div>
                          <div className="text-gray-300 text-sm">
                            @{user.username} • {user.discordId}
                          </div>
                          {user.currentNickname && (
                            <div className="text-orange-400 text-sm font-medium">
                              🏷️ Nickname: {user.currentNickname}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-gray-400 text-xs">
                              Joined: {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                            
                            {/* StardustCoin Status */}
                            {hasStardustCoin ? (
                              <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-1 rounded-full text-xs font-medium">
                                ✨ {user.stardustCoinBalance?.toLocaleString() || 0} StardustCoin
                              </span>
                            ) : (
                              <span className="bg-gray-500/20 text-gray-400 border border-gray-500/30 px-2 py-1 rounded-full text-xs font-medium">
                                No StardustCoin Account
                              </span>
                            )}
                            
                            {/* Source indicator */}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.source === 'voice_activity' 
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}>
                              {user.source === 'voice_activity' ? '🎤 Voice Only' : '👤 Full User'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-purple-400 text-sm">
                          {isExpanded ? 'Click to collapse' : 'Click to expand'}
                        </span>
                        <svg
                          className={`w-5 h-5 text-purple-400 transition-transform duration-300 ${
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
                          <h4 className="text-lg font-semibold text-white mb-3">👤 User Details</h4>
                          <div className="space-y-2 text-gray-300">
                            <div><span className="font-medium">Display Name:</span> <span className="text-white font-semibold">{getDisplayName(user)}</span></div>
                            <div><span className="font-medium">Username:</span> @{user.username}</div>
                            {user.globalName && (
                              <div><span className="font-medium">Global Name:</span> {user.globalName}</div>
                            )}
                            {user.currentNickname && (
                              <div><span className="font-medium text-orange-400">Server Nickname:</span> <span className="text-orange-400 font-semibold">{user.currentNickname}</span></div>
                            )}
                            <div><span className="font-medium">Email:</span> {user.email || 'No email'}</div>
                            <div><span className="font-medium">Discord ID:</span> <span className="text-gray-400 text-xs">{user.discordId}</span></div>
                            <div><span className="font-medium">Joined:</span> {new Date(user.createdAt).toLocaleString()}</div>
                          </div>
                        </div>

                        {/* StardustCoin Details & Actions */}
                        <div className="bg-gray-800/30 rounded-lg p-4">
                          <h4 className="text-lg font-semibold text-white mb-3">✨ StardustCoin Management</h4>
                          {hasStardustCoin ? (
                            <div className="space-y-3">
                              <div className="space-y-2 text-gray-300">
                                <div><span className="font-medium">Current Balance:</span> <span className="text-purple-400 font-bold">{user.stardustCoinBalance?.toLocaleString() || 0}</span></div>
                                <div><span className="font-medium">Total Earned:</span> <span className="text-green-400">{user.stardustCoinAccount?.totalEarned.toLocaleString() || 0}</span></div>
                                <div><span className="font-medium">Total Spent:</span> <span className="text-red-400">{user.stardustCoinAccount?.totalSpent.toLocaleString() || 0}</span></div>
                                <div><span className="font-medium">Last Updated:</span> {user.stardustCoinAccount?.lastUpdated ? new Date(user.stardustCoinAccount.lastUpdated).toLocaleString() : 'Never'}</div>
                              </div>
                              <button
                                onClick={() => selectUser(user)}
                                className={`w-full py-2 px-4 rounded-lg transition-all duration-300 ${
                                  isSelected
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                                }`}
                              >
                                {isSelected ? '✓ Selected' : 'Select for Management'}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="text-gray-400 text-center py-4">
                                This user doesn&apos;t have a StardustCoin account yet.
                              </div>
                              <button
                                onClick={() => selectUser(user)}
                                className="w-full bg-green-600 hover:bg-green-500 text-white py-2 px-4 rounded-lg transition-all duration-300"
                              >
                                Create StardustCoin Account
                              </button>
                            </div>
                          )}
                          
                          <div className="mt-4 space-y-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(user.discordId);
                                setMessage('User ID copied to clipboard!');
                                setTimeout(() => setMessage(''), 2000);
                              }}
                              className="w-full bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded-lg transition-all duration-300 text-sm"
                            >
                              Copy User ID
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(user.username);
                                setMessage('Username copied to clipboard!');
                                setTimeout(() => setMessage(''), 2000);
                              }}
                              className="w-full bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded-lg transition-all duration-300 text-sm"
                            >
                              Copy Username
                            </button>
                            {user.currentNickname && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(user.currentNickname!);
                                  setMessage('Nickname copied to clipboard!');
                                  setTimeout(() => setMessage(''), 2000);
                                }}
                                className="w-full bg-orange-600 hover:bg-orange-500 text-white py-2 px-4 rounded-lg transition-all duration-300 text-sm"
                              >
                                🏷️ Copy Nickname
                              </button>
                            )}
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

      {/* No Results */}
      {searchResults.length === 0 && !loading && (
        <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6 text-center">
          <div className="text-4xl mb-4">👥</div>
          <div className="text-purple-200 text-lg">No users found</div>
          <div className="text-gray-400 text-sm mt-2">Try adjusting your search terms</div>
        </div>
      )}
    </div>
  );
}
