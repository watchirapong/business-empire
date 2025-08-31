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

export default function PurchaseHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

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

  const handleDownload = async (purchaseId: string) => {
    try {
      setDownloading(purchaseId);
      
      const response = await fetch('/api/shop/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purchaseId }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = ''; // Browser will use the filename from Content-Disposition
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
          <div className="flex justify-center space-x-4">
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
          </div>
        </div>

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
