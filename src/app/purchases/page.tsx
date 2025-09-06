'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Purchase {
  _id: string;
  itemName: string;
  price: number;
  purchaseDate: string;
  downloadCount: number;
  lastDownloadDate?: string;
  hasFile: boolean;
  fileName?: string;
  contentType?: string;
  textContent?: string;
  linkUrl?: string;
  fileUrl?: string;
}

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    totalPurchases: number;
    uniqueBuyers: number;
    uniqueItems: number;
    averageOrderValue: number;
  };
  topSellingItems: Array<{
    item: string;
    sales: number;
    revenue: number;
    uniqueBuyers: number;
    buyers: string[];
  }>;
  topSpenders: Array<{
    user: string;
    spending: number;
    purchases: number;
    uniqueItems: number;
    items: string[];
  }>;
  currencyBreakdown: Record<string, { count: number; revenue: number }>;
  dailySales: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
  contentTypeStats: Record<string, { count: number; revenue: number }>;
  timeRange: string;
  currency: string;
  generatedAt: string;
}

export default function PurchaseHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [timeRange, setTimeRange] = useState('all');
  const [currency, setCurrency] = useState('all');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    fetchPurchaseHistory();
  }, [session, status, router]);

  const fetchPurchaseHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/shop/purchase');
      if (response.ok) {
        const data = await response.json();
        console.log('Purchase history data:', data.purchases);
        setPurchases(data.purchases || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch purchase history');
      }
    } catch (error) {
      console.error('Error fetching purchase history:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await fetch(`/api/shop/analytics?timeRange=${timeRange}&currency=${currency}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      } else {
        const errorData = await response.json();
        console.error('Analytics error:', errorData.error);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleDownload = async (purchaseId: string) => {
    try {
      setDownloading(purchaseId);
      
      // First get the purchase details to get the itemId
      const purchaseResponse = await fetch('/api/shop/purchase');
      if (!purchaseResponse.ok) {
        alert('Failed to get purchase details');
        return;
      }
      
      const purchaseData = await purchaseResponse.json();
      const purchase = purchaseData.purchases.find((p: any) => p._id === purchaseId);
      
      if (!purchase) {
        alert('Purchase not found');
        return;
      }

      // Use the new direct download endpoint
      const response = await fetch(`/api/shop/download-file/${purchase.itemId}`, {
        method: 'GET',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Get filename from Content-Disposition header or use a default
        const contentDisposition = response.headers.get('content-disposition');
        let filename = 'download';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Refresh purchase history to update download count
        await fetchPurchaseHistory();
      } else {
        const errorData = await response.json();
        alert(`Download failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    } finally {
      setDownloading(null);
    }
  };

  const handleFixPurchases = async () => {
    try {
      const response = await fetch('/api/shop/fix-purchases', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        alert(`Successfully updated ${data.updatedPurchases} purchases with content!`);
        await fetchPurchaseHistory();
      } else {
        const errorData = await response.json();
        alert(`Failed to fix purchases: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error fixing purchases:', error);
      alert('Error fixing purchases');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-400 mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading your purchases...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-4">Error Loading Purchases</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={fetchPurchaseHistory}
              className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-lg transition-colors"
            >
              🔄 Retry
            </button>
            <button
              onClick={() => router.push('/shop')}
              className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg transition-colors"
            >
              🛒 Go to Shop
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-2">
            📦 Purchase History
          </h1>
          <p className="text-gray-300 text-lg mb-4">
            View your purchased items and download files
          </p>
          
          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 mb-4">
            <button
              onClick={handleFixPurchases}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              🔧 Fix Missing Content
            </button>
            <button
              onClick={fetchPurchaseHistory}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => {
                setShowAnalytics(!showAnalytics);
                if (!showAnalytics && !analytics) {
                  fetchAnalytics();
                }
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {showAnalytics ? '📊 Hide Analytics' : '📊 Show Analytics'}
            </button>
          </div>
          
          {/* Analytics Controls */}
          {showAnalytics && (
            <div className="flex justify-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => {
                  setTimeRange(e.target.value);
                  fetchAnalytics();
                }}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              >
                <option value="all">All Time</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="year">Last Year</option>
              </select>
              
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  fetchAnalytics();
                }}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              >
                <option value="all">All Currencies</option>
                <option value="hamstercoin">Hamster Coins</option>
                <option value="stardustcoin">Stardust Coins</option>
              </select>
            </div>
          )}
        </div>

        {/* Analytics Dashboard */}
        {showAnalytics && (
          <div className="max-w-7xl mx-auto mb-8">
            {analyticsLoading ? (
              <div className="bg-white/10 rounded-xl p-8 border border-white/20 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
                <div className="text-white">Loading analytics...</div>
              </div>
            ) : analytics ? (
              <div className="space-y-6">
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl p-4 border border-green-500/30">
                    <div className="text-green-400 text-2xl mb-2">💰</div>
                    <div className="text-white font-bold text-lg">${analytics.overview.totalRevenue.toFixed(2)}</div>
                    <div className="text-green-300 text-sm">Total Revenue</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-4 border border-blue-500/30">
                    <div className="text-blue-400 text-2xl mb-2">🛒</div>
                    <div className="text-white font-bold text-lg">{analytics.overview.totalPurchases}</div>
                    <div className="text-blue-300 text-sm">Total Purchases</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-4 border border-purple-500/30">
                    <div className="text-purple-400 text-2xl mb-2">👥</div>
                    <div className="text-white font-bold text-lg">{analytics.overview.uniqueBuyers}</div>
                    <div className="text-purple-300 text-sm">Unique Buyers</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl p-4 border border-orange-500/30">
                    <div className="text-orange-400 text-2xl mb-2">📦</div>
                    <div className="text-white font-bold text-lg">{analytics.overview.uniqueItems}</div>
                    <div className="text-orange-300 text-sm">Unique Items</div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-xl p-4 border border-yellow-500/30">
                    <div className="text-yellow-400 text-2xl mb-2">📊</div>
                    <div className="text-white font-bold text-lg">${analytics.overview.averageOrderValue.toFixed(2)}</div>
                    <div className="text-yellow-300 text-sm">Avg Order Value</div>
                  </div>
                </div>

                {/* Top Selling Items */}
                <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                  <h3 className="text-xl font-bold text-white mb-4">🏆 All Shop Items ({analytics.topSellingItems.length} items)</h3>
                  <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                    {analytics.topSellingItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          <div className="text-orange-400 font-bold">#{index + 1}</div>
                          <div>
                            <div className="text-white font-semibold">{item.item}</div>
                            <div className="text-gray-400 text-sm">
                              {item.uniqueBuyers} unique buyers • {item.buyers.slice(0, 3).join(', ')}
                              {item.buyers.length > 3 && ` +${item.buyers.length - 3} more`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-bold">${item.revenue.toFixed(2)}</div>
                          <div className="text-gray-400 text-sm">{item.sales} sales</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Spenders */}
                <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                  <h3 className="text-xl font-bold text-white mb-4">💎 Top Spenders</h3>
                  <div className="space-y-3">
                    {analytics.topSpenders.slice(0, 10).map((spender, index) => (
                      <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          <div className="text-purple-400 font-bold">#{index + 1}</div>
                          <div>
                            <div className="text-white font-semibold">{spender.user}</div>
                            <div className="text-gray-400 text-sm">
                              {spender.purchases} purchases • {spender.uniqueItems} unique items
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-bold">${spender.spending.toFixed(2)}</div>
                          <div className="text-gray-400 text-sm">total spent</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Currency Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                    <h3 className="text-xl font-bold text-white mb-4">💱 Currency Breakdown</h3>
                    <div className="space-y-3">
                      {Object.entries(analytics.currencyBreakdown).map(([currency, data]) => (
                        <div key={currency} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                          <div className="text-white font-semibold capitalize">{currency}</div>
                          <div className="text-right">
                            <div className="text-green-400 font-bold">${data.revenue.toFixed(2)}</div>
                            <div className="text-gray-400 text-sm">{data.count} purchases</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                    <h3 className="text-xl font-bold text-white mb-4">📋 Content Type Stats</h3>
                    <div className="space-y-3">
                      {Object.entries(analytics.contentTypeStats).map(([type, data]) => (
                        <div key={type} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                          <div className="text-white font-semibold capitalize">{type || 'none'}</div>
                          <div className="text-right">
                            <div className="text-green-400 font-bold">${data.revenue.toFixed(2)}</div>
                            <div className="text-gray-400 text-sm">{data.count} items</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Daily Sales Chart */}
                {analytics.dailySales.length > 0 && (
                  <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                    <h3 className="text-xl font-bold text-white mb-4">📈 Daily Sales Trend (Last 30 Days)</h3>
                    <div className="space-y-2">
                      {analytics.dailySales.slice(-7).map((day, index) => (
                        <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                          <div className="text-white font-semibold">
                            {new Date(day.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-blue-400">{day.count} sales</div>
                            <div className="text-green-400 font-bold">${day.revenue.toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Export Button */}
                <div className="text-center">
                  <button
                    onClick={() => {
                      const dataStr = JSON.stringify(analytics, null, 2);
                      const dataBlob = new Blob([dataStr], { type: 'application/json' });
                      const url = URL.createObjectURL(dataBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `purchase-analytics-${new Date().toISOString().split('T')[0]}.json`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    📥 Export Analytics Data
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white/10 rounded-xl p-8 border border-white/20 text-center">
                <div className="text-purple-400 text-6xl mb-4">📊</div>
                <h2 className="text-2xl font-bold text-white mb-2">Analytics Not Available</h2>
                <p className="text-gray-300 mb-4">
                  Analytics data could not be loaded. This feature is only available for administrators.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Purchase History */}
        <div className="max-w-6xl mx-auto">
          {purchases.length === 0 ? (
            <div className="bg-white/10 rounded-xl p-8 border border-white/20 text-center">
              <div className="text-6xl mb-4">📦</div>
                             <h2 className="text-2xl font-bold text-white mb-2">No Purchases Yet</h2>
               <p className="text-gray-300 mb-4">
                 You haven&apos;t purchased any items from the shop yet.
               </p>
              <button
                onClick={() => router.push('/shop')}
                className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-lg transition-colors"
              >
                🛒 Go to Shop
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {purchases.map((purchase) => (
                <div 
                  key={purchase._id} 
                  className="bg-white/10 rounded-xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/20"
                >
                  {/* Item Header */}
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">
                      {purchase.hasFile ? '📁' : '🛍️'}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                      {purchase.itemName}
                    </h3>
                    <div className="text-xl font-bold text-orange-400 mb-2">
                      ${purchase.price.toFixed(2)}
                    </div>
                    <p className="text-gray-300 text-sm mb-2">
                      Purchased: {new Date(purchase.purchaseDate).toLocaleDateString()}
                    </p>
                  </div>

                  {/* File Information */}
                  {purchase.hasFile && (
                    <div className="mb-4 p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
                      <div className="text-sm text-blue-300 mb-2">📁 File Information</div>
                      <div className="space-y-1 text-xs">
                        <p className="text-blue-400">
                          📥 Downloads: {purchase.downloadCount}
                        </p>
                        {purchase.lastDownloadDate && (
                          <p className="text-gray-400">
                            Last: {new Date(purchase.lastDownloadDate).toLocaleDateString()}
                          </p>
                        )}
                        {purchase.fileName && (
                          <p className="text-gray-300">
                            File: {purchase.fileName}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Content Display */}
                  {purchase.contentType === 'text' && purchase.textContent && (
                    <div className="mb-4 p-3 bg-green-500/20 rounded-lg border border-green-500/30">
                      <div className="text-sm text-green-300 mb-2">📝 Text Content</div>
                      <div className="text-white text-sm bg-gray-800/50 rounded p-2 border border-gray-600/30 max-h-20 overflow-y-auto">
                        {purchase.textContent}
                      </div>
                    </div>
                  )}

                  {purchase.contentType === 'link' && purchase.linkUrl && (
                    <div className="mb-4 p-3 bg-purple-500/20 rounded-lg border border-purple-500/30">
                      <div className="text-sm text-purple-300 mb-2">🔗 Link Content</div>
                      <a 
                        href={purchase.linkUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 text-sm break-all bg-gray-800/50 rounded p-2 border border-gray-600/30 block hover:bg-gray-700/50 transition-colors"
                      >
                        {purchase.linkUrl}
                      </a>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-2">
                    {purchase.hasFile ? (
                      <button
                        onClick={() => handleDownload(purchase._id)}
                        disabled={downloading === purchase._id}
                        className={`w-full px-4 py-2 rounded-lg transition-colors ${
                          downloading === purchase._id
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                      >
                        {downloading === purchase._id ? (
                          <>
                            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                            Downloading...
                          </>
                        ) : (
                          '📥 Download File'
                        )}
                      </button>
                    ) : (
                      <div className="text-center text-gray-400 text-sm py-2">
                        No file available
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {purchases.length > 0 && (
          <div className="mt-8 text-center">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-gray-300">
                Total Purchases: <span className="text-orange-400 font-bold">{purchases.length}</span>
              </p>
              <p className="text-gray-300">
                Total Spent: <span className="text-orange-400 font-bold">
                  ${purchases.reduce((total, p) => total + p.price, 0).toFixed(2)}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
