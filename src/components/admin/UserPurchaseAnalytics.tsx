'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface UserPurchaseDetail {
  userId: string;
  username: string;
  globalName?: string;
  totalPurchases: number;
  totalSpent: number;
  items: Array<{
    itemId: string;
    itemName: string;
    price: number;
    purchaseDate: string;
    currency: string;
  }>;
}

interface UserPurchaseAnalyticsProps {
  userPurchases: UserPurchaseDetail[];
}

export default function UserPurchaseAnalytics({ userPurchases }: UserPurchaseAnalyticsProps) {
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'totalSpent' | 'totalPurchases' | 'username'>('totalSpent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedUsers, setExpandedUsers] = useState(new Set<string>());
  const [selectedUser, setSelectedUser] = useState<UserPurchaseDetail | null>(null);

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDisplayName = (user: { username: string; globalName?: string }) => {
    return user.globalName || user.username;
  };

  const getCurrencyIcon = (currency: string) => {
    return currency === 'hamstercoin' ? '🪙' : '✨';
  };

  const getCurrencyName = (currency: string) => {
    return currency === 'hamstercoin' ? 'HamsterCoin' : 'StardustCoin';
  };

  // Filter and sort users
  const filteredUsers = userPurchases
    .filter(user =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.globalName && user.globalName.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'totalSpent':
          aValue = a.totalSpent;
          bValue = b.totalSpent;
          break;
        case 'totalPurchases':
          aValue = a.totalPurchases;
          bValue = b.totalPurchases;
          break;
        case 'username':
          aValue = getDisplayName(a).toLowerCase();
          bValue = getDisplayName(b).toLowerCase();
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const exportUserData = (format: 'csv') => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `user-purchase-analytics-${timestamp}`;

    let csvContent = 'User ID,Username,Global Name,Total Purchases,Total Spent,Items Purchased\n';

    filteredUsers.forEach(user => {
      const itemsList = user.items.map(item => `${item.itemName} (${formatCurrency(item.price)})`).join('; ');
      csvContent += `"${user.userId}","${user.username}","${user.globalName || ''}",${user.totalPurchases},${user.totalSpent},"${itemsList}"\n`;
    });

    const dataUri = 'data:text/csv;charset=utf-8,'+ encodeURIComponent(csvContent);
    const exportFileDefaultName = `${filename}.csv`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getUserSpendingInsights = (user: UserPurchaseDetail) => {
    const itemsByCurrency = user.items.reduce((acc, item) => {
      if (!acc[item.currency]) {
        acc[item.currency] = { count: 0, total: 0 };
      }
      acc[item.currency].count += 1;
      acc[item.currency].total += item.price;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    const mostExpensiveItem = user.items.reduce((max, item) =>
      item.price > max.price ? item : max, user.items[0]);

    const recentPurchases = user.items
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
      .slice(0, 3);

    return {
      itemsByCurrency,
      mostExpensiveItem,
      recentPurchases,
      avgOrderValue: user.totalSpent / user.totalPurchases
    };
  };

  if (!session) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
        <div className="text-red-200 text-center">Please log in to access this page</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <div className="text-4xl">👤</div>
            <div>
              <h2 className="text-2xl font-bold text-white">User Purchase Analytics</h2>
              <p className="text-gray-300">Detailed insights into individual user purchasing behavior</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center">
          <button
            onClick={() => exportUserData('csv')}
            className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white px-4 py-2 rounded-lg transition-all duration-300"
          >
            📊 Export User Data CSV
          </button>
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="🔍 Search users by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-gray-300 text-sm">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="totalSpent">Total Spent</option>
              <option value="totalPurchases">Purchase Count</option>
              <option value="username">Username</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-gray-300 text-sm">Order:</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>

        <div className="mt-4 text-gray-400 text-sm">
          Showing {filteredUsers.length} of {userPurchases.length} users
        </div>
      </div>

      {/* User List */}
      {filteredUsers.length > 0 ? (
        <div className="space-y-4">
          {filteredUsers.map((user, index) => {
            const insights = getUserSpendingInsights(user);

            return (
              <div key={user.userId} className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-purple-500/20">
                {/* User Header */}
                <div
                  className="p-6 cursor-pointer hover:bg-gray-800/30 transition-colors"
                  onClick={() => toggleUserExpansion(user.userId)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl">#{index + 1}</div>
                      <div>
                        <div className="text-white font-bold text-xl">{getDisplayName(user)}</div>
                        <div className="text-gray-400 text-sm">@{user.username}</div>
                        <div className="text-gray-500 text-xs">ID: {user.userId.slice(-8)}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <div className="text-purple-400 font-bold text-2xl">{formatCurrency(user.totalSpent)}</div>
                        <div className="text-gray-400 text-sm">Total Spent</div>
                      </div>

                      <div className="text-right">
                        <div className="text-blue-400 font-bold text-2xl">{user.totalPurchases}</div>
                        <div className="text-gray-400 text-sm">Purchases</div>
                      </div>

                      <div className="text-right">
                        <div className="text-green-400 font-bold text-2xl">{formatCurrency(insights.avgOrderValue)}</div>
                        <div className="text-gray-400 text-sm">Avg Order</div>
                      </div>

                      <svg
                        className={`w-6 h-6 text-purple-400 transition-transform duration-300 ${
                          expandedUsers.has(user.userId) ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Quick Stats Bar */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800/30 rounded-lg p-3">
                      <div className="text-gray-300 text-sm mb-1">Currency Usage</div>
                      <div className="space-y-1">
                        {Object.entries(insights.itemsByCurrency).map(([currency, stats]) => (
                          <div key={currency} className="flex items-center justify-between text-sm">
                            <span className="flex items-center space-x-1">
                              <span>{getCurrencyIcon(currency)}</span>
                              <span className="text-gray-400">{getCurrencyName(currency)}</span>
                            </span>
                            <span className="text-white">{stats.count} items ({formatCurrency(stats.total)})</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-800/30 rounded-lg p-3">
                      <div className="text-gray-300 text-sm mb-1">Most Expensive Purchase</div>
                      <div className="flex items-center justify-between">
                        <span className="text-white text-sm truncate flex-1 mr-2">{insights.mostExpensiveItem.itemName}</span>
                        <span className="text-orange-400 font-bold">{formatCurrency(insights.mostExpensiveItem.price)}</span>
                      </div>
                    </div>

                    <div className="bg-gray-800/30 rounded-lg p-3">
                      <div className="text-gray-300 text-sm mb-1">Recent Activity</div>
                      <div className="text-gray-400 text-sm">
                        Last purchase: {insights.recentPurchases.length > 0
                          ? formatDate(insights.recentPurchases[0].purchaseDate)
                          : 'Never'
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedUsers.has(user.userId) && (
                  <div className="border-t border-purple-500/20 bg-gray-800/20 p-6">
                    <h4 className="text-lg font-bold text-white mb-4">📋 Purchase History</h4>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {user.items
                        .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
                        .map((item, itemIndex) => (
                        <div key={itemIndex} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">
                                {item.currency === 'hamstercoin' ? '🪙' : '✨'}
                              </span>
                              <div>
                                <div className="text-white font-semibold">{item.itemName}</div>
                                <div className="text-gray-400 text-sm">{formatDate(item.purchaseDate)}</div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-orange-400 font-bold text-lg">{formatCurrency(item.price)}</div>
                              <div className="text-gray-400 text-sm">{getCurrencyName(item.currency)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {user.items.length === 0 && (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-4">🛒</div>
                        <div className="text-gray-300">No purchases found for this user</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-12">
          <div className="text-center">
            <div className="text-6xl mb-4">🔍</div>
            <div className="text-gray-300 text-xl mb-2">No users found</div>
            <div className="text-gray-400">
              {searchTerm
                ? `No users match "${searchTerm}"`
                : 'No purchase data available'
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
