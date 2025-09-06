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
}

export default function PurchasesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real purchase history
  useEffect(() => {
    const fetchPurchaseHistory = async () => {
      try {
        const response = await fetch('/api/shop/purchase');
        if (response.ok) {
          const data = await response.json();
          setPurchases(data.purchases || []);
        } else {
          console.error('Failed to fetch purchase history');
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
    } else {
      setLoading(false);
    }
  }, [session]);

  // Redirect if not logged in
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">
            📦 Purchase History
          </h1>
          <p className="text-gray-300 text-lg">View your purchase history and receipts</p>
        </div>

        {/* Purchase History */}
        {purchases.length > 0 ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/10 rounded-xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Your Purchases</h2>
              <div className="space-y-4">
                {purchases.map(purchase => (
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
                          <div className={`px-2 py-1 rounded-full ${
                            purchase.status === 'completed'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {purchase.status === 'completed' ? '✅ Completed' : '⏳ Pending'}
                          </div>

                          {purchase.hasFile && (
                            <div className="flex items-center text-blue-400">
                              <span className="mr-1">📁</span>
                              <span>File Available</span>
                              {purchase.downloadCount !== undefined && (
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
                        <div className="text-2xl font-bold text-orange-400">${purchase.price}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-bold text-white mb-2">No Purchases Yet</h2>
            <p className="text-gray-400 mb-6">You haven't made any purchases yet.</p>
            <button
              onClick={() => router.push('/shop')}
              className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              🛒 Start Shopping
            </button>
          </div>
        )}

        {/* Back Button */}
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
