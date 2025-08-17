'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface BalanceData {
  hamsterCoins: number;
  totalEarned: number;
  totalSpent: number;
}

export default function HamsterCoinBalance() {
  const { data: session } = useSession();
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    if (!session?.user) return;

    setLoading(true);
    setError(null);

    try {
      // Force session refresh before making the API call
      await fetch('/api/auth/session');
      
      const response = await fetch('/api/currency/balance');
      
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch balance');
        return;
      }

      const data = await response.json();
      setBalance(data.data);
    } catch (err) {
      setError('Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchBalance();
    }
  }, [session]);

  if (!session) {
    return (
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
        <div className="text-center">
          <div className="text-2xl mb-4">🔐</div>
          <h3 className="text-xl font-bold text-white mb-2">Authentication Required</h3>
          <p className="text-gray-400">Please log in to view your Hamster Coins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white flex items-center space-x-2">
          <span className="text-2xl">🪙</span>
          <span>Hamster Coins</span>
        </h3>
        <button
          onClick={fetchBalance}
          disabled={loading}
          className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-3 py-1 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-gray-400 mt-2">Loading balance...</p>
        </div>
      ) : balance ? (
        <div className="space-y-4">
          {/* Main Balance */}
          <div className="text-center">
            <div className="text-4xl font-bold text-orange-400 mb-2">
              {balance.hamsterCoins.toLocaleString()}
            </div>
            <div className="text-gray-400 text-sm">Available Coins</div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-4 border border-orange-500/20">
              <div className="text-lg font-bold text-orange-400">
                {balance.totalEarned.toLocaleString()}
              </div>
              <div className="text-gray-400 text-sm">Total Earned</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 border border-orange-500/20">
              <div className="text-lg font-bold text-orange-400">
                {balance.totalSpent.toLocaleString()}
              </div>
              <div className="text-gray-400 text-sm">Total Spent</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-2xl mb-2">❌</div>
          <p className="text-gray-400">Failed to load balance</p>
        </div>
      )}

      {/* Error Messages */}
      {error && (
        <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}
