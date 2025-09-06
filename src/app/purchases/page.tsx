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
}

export default function PurchasesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock purchase history data
  useEffect(() => {
    const mockPurchases: Purchase[] = [
      {
        id: '1',
        itemName: 'Premium Avatar Frame',
        price: 500,
        purchaseDate: new Date().toISOString(),
        status: 'completed'
      },
      {
        id: '2',
        itemName: 'VIP Badge',
        price: 1000,
        purchaseDate: new Date(Date.now() - 86400000).toISOString(),
        status: 'completed'
      }
    ];

    setPurchases(mockPurchases);
    setLoading(false);
  }, []);

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
                    className="flex items-center justify-between bg-white/5 rounded-lg p-4"
                  >
                    <div>
                      <h3 className="text-white font-semibold">{purchase.itemName}</h3>
                      <p className="text-gray-400 text-sm">
                        Purchased on {new Date(purchase.purchaseDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-400">${purchase.price}</div>
                      <div className={`text-sm px-2 py-1 rounded-full inline-block mt-2 ${
                        purchase.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {purchase.status}
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
