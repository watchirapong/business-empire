'use client';

import { useState, useEffect } from 'react';

interface HouseData {
  _id: string;
  houseName: string;
  points: number;
  lastUpdated: string;
  updatedBy: string;
  updateReason: string;
}

export default function HouseLeaderboard() {
  const [houses, setHouses] = useState<HouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHouseLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/houses/leaderboard');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch house leaderboard');
      }
      
      setHouses(data.houses);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch house leaderboard');
      console.error('Error fetching house leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHouseLeaderboard();
  }, []);

  const getHouseColor = (houseName: string, index: number) => {
    // Predefined colors for known houses
    switch (houseName) {
      case 'Selene':
        return 'from-blue-500 to-blue-700';
      case 'Pleiades':
        return 'from-purple-500 to-purple-700';
      default:
        // Generate colors for dynamic houses
        const colors = [
          'from-green-500 to-green-700',
          'from-red-500 to-red-700',
          'from-yellow-500 to-yellow-700',
          'from-pink-500 to-pink-700',
          'from-indigo-500 to-indigo-700',
          'from-teal-500 to-teal-700',
          'from-orange-500 to-orange-700',
          'from-cyan-500 to-cyan-700'
        ];
        return colors[index % colors.length];
    }
  };

  const getHouseEmoji = (houseName: string, index: number) => {
    // Predefined emojis for known houses
    switch (houseName) {
      case 'Selene':
        return '🌙';
      case 'Pleiades':
        return '⭐';
      default:
        // Generate emojis for dynamic houses
        const emojis = ['🏠', '🏰', '⚔️', '🛡️', '🔥', '❄️', '⚡', '🌟', '🎯', '💎'];
        return emojis[index % emojis.length];
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return '🥇';
      case 1:
        return '🥈';
      case 2:
        return '🥉';
      default:
        return `#${index + 1}`;
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-8">
        <div className="text-center">
          <div className="text-2xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-white mb-2">House Leaderboard</h2>
          <p className="text-gray-400">Loading house rankings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-red-500/20 p-8">
        <div className="text-center">
          <div className="text-2xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-white mb-2">House Leaderboard</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchHouseLeaderboard}
            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">🏆 House Leaderboard</h2>
        <button
          onClick={fetchHouseLeaderboard}
          className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1 rounded text-sm transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        {houses.map((house, index) => (
          <div
            key={house._id}
            className={`bg-gradient-to-r ${getHouseColor(house.houseName, index)} rounded-xl p-6 border border-white/20 shadow-lg`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-3xl">
                  {getRankIcon(index)}
                </div>
                <div className="text-4xl">
                  {getHouseEmoji(house.houseName, index)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    {house.houseName}
                  </h3>
                  <p className="text-white/80 text-sm">
                    Last updated: {new Date(house.lastUpdated).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">
                  {house.points.toLocaleString()}
                </div>
                <div className="text-white/80 text-sm">
                  points
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {houses.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🏠</div>
          <h3 className="text-xl font-semibold text-white mb-2">No House Data</h3>
                            <p className="text-gray-400">House points haven&apos;t been set up yet.</p>
        </div>
      )}
    </div>
  );
}
