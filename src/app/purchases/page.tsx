'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface PurchaseItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Purchase {
  id: string;
  userId: string;
  items: PurchaseItem[];
  totalAmount: number;
  purchaseDate: string;
  status: string;
}

export default function PurchaseHistoryPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    const userId = (session.user as any).id;
    const ADMIN_USER_IDS = ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917'];
    setIsAdmin(ADMIN_USER_IDS.includes(userId));
    fetchPurchaseHistory();
  }, [session, router]);

  const fetchPurchaseHistory = async () => {
    try {
      const response = await fetch('/api/shop/purchase-history');
      if (response.ok) {
        const data = await response.json();
        setPurchases(data.purchases);
      } else {
        console.error('Failed to fetch purchase history');
      }
    } catch (error) {
      console.error('Error fetching purchase history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading purchase history...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">
            🛒 Purchase History
          </h1>
          <p className="text-gray-300 text-lg">
            {isAdmin ? 'All User Purchases' : 'Your Purchase History'}
          </p>
        </div>

        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Purchase History */}
        {purchases.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-bold text-white mb-2">No Purchases Yet</h2>
            <p className="text-gray-400 mb-6">
              {isAdmin ? 'No purchases have been made by any users.' : 'You haven\'t made any purchases yet.'}
            </p>
            <button
              onClick={() => router.push('/shop')}
              className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-lg transition-colors"
            >
              🛍️ Go Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {purchases.map((purchase) => (
              <div key={purchase.id} className="bg-white/10 rounded-xl p-6 border border-white/20">
                {/* Purchase Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Purchase #{purchase.id.slice(-8)}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {formatDate(purchase.purchaseDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-orange-400">
                      {purchase.totalAmount} 🪙
                    </div>
                    <div className={`text-sm px-2 py-1 rounded-full inline-block ${
                      purchase.status === 'completed' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {purchase.status}
                    </div>
                  </div>
                </div>

                {/* Purchase Items */}
                <div className="space-y-3">
                  {purchase.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">📦</div>
                        <div>
                          <h4 className="text-white font-semibold">{item.name}</h4>
                          <p className="text-gray-400 text-sm">
                            Quantity: {item.quantity}
                          </p>
                        </div>
                      </div>
                      <div className="text-orange-400 font-semibold">
                        {item.price} 🪙
                      </div>
                    </div>
                  ))}
                </div>

                {/* User ID (Admin Only) */}
                {isAdmin && (
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <p className="text-gray-400 text-sm">
                      User ID: {purchase.userId}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {purchases.length > 0 && (
          <div className="mt-8 bg-white/10 rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-400">
                  {purchases.length}
                </div>
                <div className="text-gray-400">Total Purchases</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">
                  {purchases.reduce((total, purchase) => total + purchase.totalAmount, 0)} 🪙
                </div>
                <div className="text-gray-400">Total Spent</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">
                  {purchases.reduce((total, purchase) => total + purchase.items.length, 0)}
                </div>
                <div className="text-gray-400">Total Items</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
