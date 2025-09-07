'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Purchase {
  id: string;
  itemName: string;
  price: number;
  purchaseDate: string;
  status: 'completed' | 'pending';
  downloadCount?: number;
  hasFile?: boolean;
  fileName?: string;
  contentType?: string;
  textContent?: string;
  linkUrl?: string;
  youtubeUrl?: string;
  fileUrl?: string;
}

export default function PurchasesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPurchaseHistory = async () => {
      try {
        const response = await fetch('/api/shop/purchase');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.purchases) {
            console.log('Purchase history data:', data.purchases);
            setPurchases(data.purchases);
          } else {
            console.error('Invalid response format:', data);
            setPurchases([]);
          }
        } else {
          console.error('Failed to fetch purchase history:', response.status);
          setPurchases([]);
        }
      } catch (error) {
        console.error('Error fetching purchase history:', error);
        setPurchases([]);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchPurchaseHistory();
    } else if (status !== 'loading') {
      setLoading(false);
    }
  }, [session, status]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
  }, [session, status, router]);

  // Filter purchases based on search term
  const filteredPurchases = purchases.filter(purchase =>
    purchase.itemName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8 pb-32">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">
            📦 Purchase History
          </h1>
          <p className="text-gray-300 text-lg">View your purchase history and receipts</p>
        </div>

        {/* Search Bar */}
        {purchases.length > 0 && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Search purchases by item name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              {searchTerm && (
                <div className="mt-2 text-sm text-gray-400">
                  Found {filteredPurchases.length} of {purchases.length} purchases
                </div>
              )}
            </div>
          </div>
        )}

        {purchases.length > 0 ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/10 rounded-xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">
                {searchTerm ? `Search Results (${filteredPurchases.length})` : 'Your Purchases'}
              </h2>
              <div className="space-y-4">
                {filteredPurchases.map(purchase => (
                  <div
                    key={purchase.id}
                    className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-lg mb-1">{purchase.itemName}</h3>
                        <p className="text-gray-400 text-sm mb-2">
                          Purchased on {new Date(purchase.purchaseDate).toLocaleDateString()} at {new Date(purchase.purchaseDate).toLocaleTimeString()}
                        </p>
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                            ✅ Completed
                          </div>

                          {purchase.hasFile && (
                            <div className="flex items-center text-blue-400">
                              <span className="mr-1">📁</span>
                              <span>File Available</span>
                              {purchase.downloadCount && purchase.downloadCount > 0 && (
                                <span className="ml-1 text-xs text-gray-400">
                                  ({purchase.downloadCount} downloads)
                                </span>
                              )}
                            </div>
                          )}

                          {purchase.fileName && (
                            <div className="text-gray-300 text-xs">
                              {purchase.fileName}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-orange-400">
                          {purchase.price} coins
                        </div>
                      </div>
                    </div>

                    {/* Debug Info */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="mt-2 p-2 bg-gray-800 rounded text-xs text-gray-400">
                        <div>Content Type: {purchase.contentType || 'none'}</div>
                        <div>Has File: {purchase.hasFile ? 'Yes' : 'No'}</div>
                        <div>Text Content: {purchase.textContent ? 'Yes' : 'No'}</div>
                        <div>Link URL: {purchase.linkUrl ? 'Yes' : 'No'}</div>
                        <div>YouTube URL: {purchase.youtubeUrl ? 'Yes' : 'No'}</div>
                      </div>
                    )}

                    {/* Content Section */}
                    {(purchase.contentType && purchase.contentType !== 'none') ||
                     purchase.textContent ||
                     purchase.linkUrl ||
                     purchase.youtubeUrl ||
                     purchase.hasFile ? (
                      <div className="mt-4 pt-4 border-t border-white/20">
                        <h4 className="text-white font-semibold mb-3">📦 Purchased Content:</h4>

                        {(purchase.contentType === 'text' || (!purchase.contentType && purchase.textContent)) && purchase.textContent && (
                          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg p-4 mb-3 border border-green-500/30">
                            <div className="flex items-center mb-2">
                              <span className="text-green-400 mr-2">📝</span>
                              <span className="text-green-300 font-semibold text-sm">Text Content</span>
                            </div>
                            <div className="bg-gray-900/70 rounded p-3 border border-gray-600/50">
                              <div className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                                {purchase.textContent}
                              </div>
                            </div>
                          </div>
                        )}

                        {(purchase.contentType === 'link' || (!purchase.contentType && purchase.linkUrl)) && purchase.linkUrl && (
                          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg p-4 mb-3 border border-blue-500/30">
                            <div className="flex items-center mb-2">
                              <span className="text-blue-400 mr-2">🔗</span>
                              <span className="text-blue-300 font-semibold text-sm">External Link</span>
                            </div>
                            <div className="bg-gray-900/70 rounded p-3 border border-gray-600/50">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 mr-4">
                                  <p className="text-blue-400 text-sm break-all">
                                    {purchase.linkUrl}
                                  </p>
                                </div>
                                <a
                                  href={purchase.linkUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-semibold transition-colors"
                                >
                                  🌐 Open
                                </a>
                              </div>
                            </div>
                          </div>
                        )}

                        {(purchase.contentType === 'youtube' || (!purchase.contentType && purchase.youtubeUrl)) && purchase.youtubeUrl && (
                          <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-lg p-4 mb-3 border border-red-500/30">
                            <div className="flex items-center mb-2">
                              <span className="text-red-400 mr-2">🎥</span>
                              <span className="text-red-300 font-semibold text-sm">YouTube Video</span>
                            </div>
                            <div className="bg-gray-900/70 rounded p-3 border border-gray-600/50">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 mr-4">
                                  <p className="text-red-400 text-sm break-all">
                                    {purchase.youtubeUrl}
                                  </p>
                                </div>
                                <a
                                  href={purchase.youtubeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs font-semibold transition-colors"
                                >
                                  ▶️ Watch
                                </a>
                              </div>
                            </div>
                          </div>
                        )}

                        {(purchase.contentType === 'file' || (!purchase.contentType && purchase.hasFile)) && purchase.hasFile && purchase.fileUrl && (
                          <div className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-lg p-4 mb-3 border border-purple-500/30">
                            <div className="flex items-center mb-2">
                              <span className="text-purple-400 mr-2">📁</span>
                              <span className="text-purple-300 font-semibold text-sm">Downloadable File</span>
                            </div>
                            <div className="bg-gray-900/70 rounded p-3 border border-gray-600/50">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 mr-4">
                                  <p className="text-purple-400 text-sm">
                                    {purchase.fileName || 'Download file'}
                                  </p>
                                  {purchase.downloadCount && purchase.downloadCount > 0 && (
                                    <p className="text-gray-400 text-xs mt-1">
                                      Downloaded {purchase.downloadCount} time{purchase.downloadCount !== 1 ? 's' : ''}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(`/api/shop/download?purchaseId=${purchase.id}`);
                                      if (response.ok) {
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;

                                        // Get filename from response or use default
                                        const contentDisposition = response.headers.get('content-disposition');
                                        let filename = purchase.fileName || 'download';
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

                                        alert('✅ Download completed successfully!');
                                      } else {
                                        alert('❌ Download failed. Please try again.');
                                      }
                                    } catch (error) {
                                      console.error('Download error:', error);
                                      alert('❌ Download failed. Please try again.');
                                    }
                                  }}
                                  className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs font-semibold transition-colors"
                                >
                                  📥 Download
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : searchTerm && filteredPurchases.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-white mb-2">No Results Found</h2>
            <p className="text-gray-400 mb-6">No purchases match your search term &quot;{searchTerm}&quot;.</p>
            <button
              onClick={() => setSearchTerm('')}
              className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors mr-4"
            >
              Clear Search
            </button>
            <button
              onClick={() => router.push('/shop')}
              className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              🛒 Continue Shopping
            </button>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-bold text-white mb-2">No Purchases Yet</h2>
            <p className="text-gray-400 mb-6">You haven&apos;t made any purchases yet.</p>
            <button
              onClick={() => router.push('/shop')}
              className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              🛒 Start Shopping
            </button>
          </div>
        )}

        <div className="text-center mt-8">
          <button
            onClick={() => router.back()}
            className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
