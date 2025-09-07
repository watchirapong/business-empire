'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface ShopAnalyticsData {
  overview: {
    totalRevenue: number;
    totalPurchases: number;
    uniqueBuyers: number;
    uniqueItems: number;
    averageOrderValue: number;
  };
  topSellingItems: Array<{
    id: string;
    item: string;
    sales: number;
    revenue: number;
    uniqueBuyers: number;
    buyers: string[];
  }>;
  allItems: Array<{
    id: string;
    item: string;
    sales: number;
    revenue: number;
    uniqueBuyers: number;
    buyers: string[];
    buyerDetails: Array<{
      userId: string;
      username: string;
      purchaseCount: number;
      totalSpent: number;
    }>;
  }>;
  topSpenders: Array<{
    userId: string;
    user: string;
    spending: number;
    purchases: number;
    uniqueItems: number;
    items: string[];
  }>;
  currencyBreakdown: {
    hamstercoin: { count: number; revenue: number };
    stardustcoin: { count: number; revenue: number };
  };
  dailySales: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
  contentTypeStats: {
    none: { count: number; revenue: number };
    text: { count: number; revenue: number };
    link: { count: number; revenue: number };
    file: { count: number; revenue: number };
    youtube: { count: number; revenue: number };
  };
  userPurchases: Array<{
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
  }>;
  timeRange: string;
  currency: string;
  generatedAt: string;
}

export default function ShopAnalytics() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<ShopAnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<string>('all');
  const [currency, setCurrency] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [contentType, setContentType] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [expandedUsers, setExpandedUsers] = useState(new Set<string>());
  const [activeView, setActiveView] = useState<'overview' | 'items' | 'users' | 'trends'>('overview');

  const exportAnalytics = async (format: 'csv' | 'json') => {
    if (!analyticsData) return;

    try {
      const params = new URLSearchParams();
      if (timeRange !== 'all') params.append('timeRange', timeRange);
      if (currency !== 'all') params.append('currency', currency);
      if (category !== 'all') params.append('category', category);
      if (contentType !== 'all') params.append('contentType', contentType);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      params.append('export', format);

      const response = await fetch(`/api/shop/analytics?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to export analytics');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const linkElement = document.createElement('a');
      linkElement.href = url;

      // Get filename from response headers or generate one
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `shop-analytics-${new Date().toISOString().split('T')[0]}.${format}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      linkElement.download = filename;
      document.body.appendChild(linkElement);
      linkElement.click();
      document.body.removeChild(linkElement);

      // Clean up
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export failed:', error);
      alert(`Failed to export ${format.toUpperCase()}. Please try again.`);
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (timeRange !== 'all') params.append('timeRange', timeRange);
      if (currency !== 'all') params.append('currency', currency);
      if (category !== 'all') params.append('category', category);
      if (contentType !== 'all') params.append('contentType', contentType);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);

      const response = await fetch(`/api/shop/analytics?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to load analytics data');
      }

      const data = await response.json();

      if (data.success) {
        setAnalyticsData(data.analytics);
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

  useEffect(() => {
    if (session?.user) {
      loadAnalytics();
    }
  }, [session, timeRange, currency, category, contentType, minPrice, maxPrice]);

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
      day: 'numeric'
    });
  };

  const getDisplayName = (user: { username: string; globalName?: string }) => {
    return user.globalName || user.username;
  };

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
        <span className="ml-4 text-white text-lg">Loading shop analytics...</span>
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
            onClick={loadAnalytics}
            className="mt-4 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6">
        <div className="text-gray-300 text-center">No analytics data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <div className="text-4xl">🛒</div>
            <div>
              <h2 className="text-2xl font-bold text-white">Shop Analytics</h2>
              <p className="text-gray-300">Detailed insights into shop performance and user behavior</p>
            </div>
          </div>
          <button
            onClick={loadAnalytics}
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-4 py-2 rounded-lg transition-all duration-300"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => exportAnalytics('csv')}
            className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white px-4 py-2 rounded-lg transition-all duration-300"
          >
            📊 Export CSV
          </button>
          <button
            onClick={() => exportAnalytics('json')}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-4 py-2 rounded-lg transition-all duration-300"
          >
            📋 Export JSON
          </button>
        </div>

        {/* View Mode Controls */}
        <div className="flex flex-wrap gap-4 items-center mb-4">
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
              onClick={() => setActiveView('items')}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                activeView === 'items'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🛍️ Items
            </button>
            <button
              onClick={() => setActiveView('users')}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                activeView === 'users'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              👥 Users
            </button>
            <button
              onClick={() => setActiveView('trends')}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                activeView === 'trends'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              📈 Trends
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <label className="text-gray-300 text-sm">Time Range:</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="all">All Time</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-gray-300 text-sm">Currency:</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="all">All Currencies</option>
              <option value="hamstercoin">🪙 HamsterCoin</option>
              <option value="stardustcoin">✨ StardustCoin</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-gray-300 text-sm">Category:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="all">All Categories</option>
              <option value="cosmetic">Cosmetic</option>
              <option value="gaming">Gaming</option>
              <option value="weapons">Weapons</option>
              <option value="armor">Armor</option>
              <option value="consumables">Consumables</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-gray-300 text-sm">Content Type:</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="all">All Types</option>
              <option value="none">Digital Item</option>
              <option value="text">Text Content</option>
              <option value="link">External Link</option>
              <option value="file">Downloadable File</option>
              <option value="youtube">YouTube Video</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <label className="text-gray-300 text-sm">Price Range:</label>
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white w-20"
            />
            <span className="text-gray-400">-</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white w-20"
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        <div className="mt-4">
          <button
            onClick={() => {
              setTimeRange('all');
              setCurrency('all');
              setCategory('all');
              setContentType('all');
              setMinPrice('');
              setMaxPrice('');
            }}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Overview View */}
      {activeView === 'overview' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-green-500/20 p-6">
              <div className="text-3xl font-bold text-green-300 mb-2">
                {formatCurrency(analyticsData.overview.totalRevenue)}
              </div>
              <div className="text-green-200">Total Revenue</div>
              <div className="text-green-400 text-sm mt-1">
                {analyticsData.overview.totalPurchases} purchases
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 p-6">
              <div className="text-3xl font-bold text-blue-300 mb-2">
                {analyticsData.overview.totalPurchases}
              </div>
              <div className="text-blue-200">Total Purchases</div>
              <div className="text-blue-400 text-sm mt-1">
                {analyticsData.overview.uniqueBuyers} unique buyers
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6">
              <div className="text-3xl font-bold text-purple-300 mb-2">
                {analyticsData.overview.uniqueBuyers}
              </div>
              <div className="text-purple-200">Unique Buyers</div>
              <div className="text-purple-400 text-sm mt-1">
                {analyticsData.overview.uniqueItems} items sold
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
              <div className="text-3xl font-bold text-orange-300 mb-2">
                {formatCurrency(analyticsData.overview.averageOrderValue)}
              </div>
              <div className="text-orange-200">Avg Order Value</div>
              <div className="text-orange-400 text-sm mt-1">
                Per purchase
              </div>
            </div>
          </div>

          {/* Currency Breakdown */}
          <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">💰 Currency Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-lg p-4 border border-yellow-500/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🪙</span>
                    <span className="text-yellow-300 font-bold">HamsterCoin</span>
                  </div>
                  <div className="text-yellow-400 font-bold">
                    {analyticsData.currencyBreakdown.hamstercoin.count}
                  </div>
                </div>
                <div className="text-yellow-200">
                  Revenue: {formatCurrency(analyticsData.currencyBreakdown.hamstercoin.revenue)}
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg p-4 border border-purple-500/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">✨</span>
                    <span className="text-purple-300 font-bold">StardustCoin</span>
                  </div>
                  <div className="text-purple-400 font-bold">
                    {analyticsData.currencyBreakdown.stardustcoin.count}
                  </div>
                </div>
                <div className="text-purple-200">
                  Revenue: {formatCurrency(analyticsData.currencyBreakdown.stardustcoin.revenue)}
                </div>
              </div>
            </div>
          </div>

          {/* Content Type Stats */}
          <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">📦 Content Type Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(analyticsData.contentTypeStats).map(([type, stats]) => (
                <div key={type} className="bg-gray-800/30 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-2">
                    {type === 'none' && '🎁'}
                    {type === 'text' && '📝'}
                    {type === 'link' && '🔗'}
                    {type === 'file' && '📁'}
                    {type === 'youtube' && '🎬'}
                  </div>
                  <div className="text-orange-400 font-bold text-lg">{stats.count}</div>
                  <div className="text-gray-300 text-sm capitalize">{type}</div>
                  <div className="text-gray-400 text-xs">{formatCurrency(stats.revenue)}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Items View */}
      {activeView === 'items' && (
        <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
          <h3 className="text-xl font-bold text-white mb-6">🏆 Top Selling Items</h3>

          {analyticsData.topSellingItems.length > 0 ? (
            <div className="space-y-4">
              {analyticsData.topSellingItems.map((item, index) => (
                <div key={item.id} className="bg-gray-800/30 rounded-lg border border-gray-600 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">#{index + 1}</div>
                      <div>
                        <div className="text-white font-bold text-lg">{item.item}</div>
                        <div className="text-gray-400 text-sm">
                          {item.uniqueBuyers} unique buyers • {item.sales} total sales
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-orange-400 font-bold text-xl">{formatCurrency(item.revenue)}</div>
                      <div className="text-gray-400 text-sm">Revenue</div>
                    </div>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-3">
                    <div className="text-gray-300 text-sm mb-2">Recent Buyers:</div>
                    <div className="flex flex-wrap gap-2">
                      {item.buyers.slice(0, 5).map((buyerId) => (
                        <span key={buyerId} className="bg-blue-600/20 text-blue-300 px-2 py-1 rounded text-xs">
                          {buyerId.slice(-8)}
                        </span>
                      ))}
                      {item.buyers.length > 5 && (
                        <span className="text-gray-400 text-xs">+{item.buyers.length - 5} more</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📦</div>
              <div className="text-gray-300 text-lg">No item sales data found</div>
              <div className="text-gray-400 text-sm mt-2">Items will appear here once purchases are made</div>
            </div>
          )}
        </div>
      )}

      {/* Users View */}
      {activeView === 'users' && (
        <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
          <h3 className="text-xl font-bold text-white mb-6">💎 Top Spenders</h3>

          {analyticsData.topSpenders.length > 0 ? (
            <div className="space-y-4">
              {analyticsData.topSpenders.map((user, index) => (
                <div key={user.userId} className="bg-gray-800/30 rounded-lg border border-gray-600">
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-700/30 transition-colors"
                    onClick={() => toggleUserExpansion(user.userId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl">#{index + 1}</div>
                        <div>
                          <div className="text-white font-bold text-lg">{user.user}</div>
                          <div className="text-gray-400 text-sm">
                            {user.purchases} purchases • {user.uniqueItems} unique items
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-green-400 font-bold text-xl">{formatCurrency(user.spending)}</div>
                          <div className="text-gray-400 text-sm">Total Spent</div>
                        </div>
                        <svg
                          className={`w-5 h-5 text-orange-400 transition-transform duration-300 ${
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
                  </div>

                  {expandedUsers.has(user.userId) && (
                    <div className="border-t border-gray-600 bg-gray-800/20 p-4">
                      <div className="text-gray-300 text-sm mb-3">Items Purchased:</div>
                      <div className="flex flex-wrap gap-2">
                        {user.items.map((itemName) => (
                          <span key={itemName} className="bg-orange-600/20 text-orange-300 px-3 py-1 rounded text-sm">
                            {itemName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">👥</div>
              <div className="text-gray-300 text-lg">No user purchase data found</div>
              <div className="text-gray-400 text-sm mt-2">Users will appear here once purchases are made</div>
            </div>
          )}
        </div>
      )}

      {/* Trends View */}
      {activeView === 'trends' && (
        <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
          <h3 className="text-xl font-bold text-white mb-6">📈 Daily Sales Trends</h3>

          {analyticsData.dailySales.length > 0 ? (
            <div className="space-y-4">
              {analyticsData.dailySales.map((day) => (
                <div key={day.date} className="flex items-center justify-between bg-gray-800/30 rounded-lg p-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">📅</div>
                    <div>
                      <div className="text-white font-semibold">{formatDate(day.date)}</div>
                      <div className="text-gray-400 text-sm">{day.count} purchases</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-orange-400 font-bold text-lg">{formatCurrency(day.revenue)}</div>
                    <div className="text-gray-400 text-sm">Revenue</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📈</div>
              <div className="text-gray-300 text-lg">No sales trend data found</div>
              <div className="text-gray-400 text-sm mt-2">Trends will appear here once purchases are made</div>
            </div>
          )}
        </div>
      )}

      {/* Footer with generation timestamp */}
      <div className="text-center text-gray-500 text-sm">
        Analytics generated on {new Date(analyticsData.generatedAt).toLocaleString()}
      </div>
    </div>
  );
}
