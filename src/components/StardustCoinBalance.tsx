'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface StardustCoinData {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastUpdated: string;
}

export default function StardustCoinBalance() {
  const { data: session } = useSession();
  const [stardustCoinData, setStardustCoinData] = useState<StardustCoinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStardustCoinBalance = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stardustcoin/balance');
      const data = await response.json();

      if (response.ok && data.success) {
        setStardustCoinData(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch StardustCoin balance');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching StardustCoin balance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ((session?.user as any)?.id) {
      fetchStardustCoinBalance();
    }
  }, [(session?.user as any)?.id]);

  if (!session) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
          <span className="text-purple-200">Loading StardustCoin...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-xl p-4 border border-red-500/20">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">❌</span>
          <div>
            <div className="text-red-200 font-semibold">StardustCoin Error</div>
            <div className="text-red-300 text-sm">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">✨</div>
          <div>
            <div className="text-purple-200 font-semibold">StardustCoin</div>
            <div className="text-purple-300 text-sm">
              Balance: <span className="font-bold text-purple-100">{stardustCoinData?.balance.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-purple-300 text-xs">
            Earned: {stardustCoinData?.totalEarned.toLocaleString() || 0}
          </div>
          <div className="text-purple-300 text-xs">
            Spent: {stardustCoinData?.totalSpent.toLocaleString() || 0}
          </div>
        </div>
      </div>
    </div>
  );
}
