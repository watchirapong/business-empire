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
}

export default function PurchaseHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

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
      const response = await fetch('/api/shop/purchase');
      if (response.ok) {
        const data = await response.json();
        setPurchases(data.purchases);
      }
    } catch (error) {
      console.error('Error fetching purchase history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (purchaseId: string) => {
    try {
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
        fetchPurchaseHistory();
      } else {
        const errorData = await response.json();
        alert(`Download failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-2">📦 Purchase History</h1>
          <p className="text-gray-300 text-lg">View your purchased items and download files</p>
        </div>

        {/* Purchase History */}
        <div className="max-w-4xl mx-auto">
          {purchases.length === 0 ? (
            <div className="bg-white/10 rounded-xl p-8 border border-white/20 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h2 className="text-2xl font-bold text-white mb-2">No Purchases Yet</h2>
              <p className="text-gray-300 mb-4">You haven't purchased any items from the shop yet.</p>
              <button
                onClick={() => router.push('/shop')}
                className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-lg transition-colors"
              >
                🛒 Go to Shop
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {purchases.map((purchase) => (
                <div key={purchase._id} className="bg-white/10 rounded-xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300">
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">
                      {purchase.hasFile ? '📁' : '🛍️'}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{purchase.itemName}</h3>
                    <div className="text-2xl font-bold text-orange-400 mb-2">${purchase.price.toFixed(2)}</div>
                    <p className="text-gray-300 text-sm mb-2">
                      Purchased: {new Date(purchase.purchaseDate).toLocaleDateString()}
                    </p>
                    {purchase.hasFile && (
                      <div className="space-y-2">
                        <p className="text-blue-400 text-sm">
                          📥 Downloads: {purchase.downloadCount}
                        </p>
                        {purchase.lastDownloadDate && (
                          <p className="text-gray-400 text-xs">
                            Last: {new Date(purchase.lastDownloadDate).toLocaleDateString()}
                          </p>
                        )}
                        {purchase.fileName && (
                          <p className="text-gray-300 text-xs">
                            File: {purchase.fileName}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    {purchase.hasFile ? (
                      <button
                        onClick={() => handleDownload(purchase._id)}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        📥 Download File
                      </button>
                    ) : (
                      <div className="text-center text-gray-400 text-sm">
                        No file available
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
