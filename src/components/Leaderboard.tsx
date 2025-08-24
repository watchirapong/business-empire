'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar: string;
  totalEarned: number;
  rank: number;
}

export default function Leaderboard() {
  const { data: session } = useSession();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(300); // 5 minutes in seconds
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/leaderboard');
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      setLeaderboard(data.leaderboard);
      setLastUpdated(new Date());
      setTimeUntilRefresh(300); // Reset timer to 5 minutes
    } catch (err) {
      setError('Failed to load leaderboard');
      console.error('Leaderboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    fetchLeaderboard();

    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 300000); // 5 minutes = 300,000ms

    return () => clearInterval(interval);
  }, []);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeUntilRefresh(prev => {
        if (prev <= 1) {
          return 300; // Reset to 5 minutes
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format countdown timer
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getCurrentUserRank = () => {
    if (!session?.user) return null;
    return leaderboard.find(entry => entry.userId === (session.user as any).id);
  };

  const currentUser = getCurrentUserRank();

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-red-500/20 p-6">
        <div className="text-center">
          <div className="text-2xl mb-2">❌</div>
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center space-x-2">
          <span className="text-2xl">🏆</span>
          <span>MEMBER RANK</span>
        </h2>
        <p className="text-gray-400 text-sm">Top members by total earnings</p>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {leaderboard.slice(0, 10).map((entry, index) => {
          const isTopThree = index < 3;
          const isCurrentUser = session?.user && entry.userId === (session.user as any).id;
          
          // Determine background color based on rank and user status
          let bgColor = 'bg-white/5 hover:bg-white/10';
          let borderColor = '';
          
          if (isCurrentUser) {
            // Red tint overrides all rank colors for current user
            bgColor = 'bg-red-500/20 border border-red-500/30';
            borderColor = 'border-l-4 border-red-400';
          } else if (index === 0) {
            bgColor = 'bg-gradient-to-r from-yellow-500/20 to-yellow-400/20 border border-yellow-400/30';
            borderColor = 'border-l-4 border-yellow-400';
          } else if (index === 1) {
            bgColor = 'bg-gradient-to-r from-gray-400/20 to-gray-300/20 border border-gray-400/30';
            borderColor = 'border-l-4 border-gray-400';
          } else if (index === 2) {
            bgColor = 'bg-gradient-to-r from-orange-600/20 to-orange-500/20 border border-orange-500/30';
            borderColor = 'border-l-4 border-orange-500';
          }
          
          return (
            <div
              key={entry.userId}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${bgColor} ${borderColor}`}
            >
              {/* Rank */}
              <div className={`w-12 text-center font-bold ${
                isCurrentUser ? 'text-red-400' : 
                index === 0 ? 'text-yellow-400' :
                index === 1 ? 'text-gray-300' :
                index === 2 ? 'text-orange-400' : 'text-white'
              }`}>
                #{entry.rank}
              </div>

              {/* Avatar */}
              <div className="w-8 h-8 rounded-full overflow-hidden mx-3">
                <img
                  src={entry.avatar || '/default-avatar.png'}
                  alt={entry.username}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Username */}
              <div className={`flex-1 font-medium ${
                isCurrentUser ? 'text-red-400' : 
                index === 0 ? 'text-yellow-400' :
                index === 1 ? 'text-gray-300' :
                index === 2 ? 'text-orange-400' : 'text-white'
              }`}>
                {entry.username}
              </div>

              {/* Total Earned */}
              <div className={`font-bold ${
                isCurrentUser ? 'text-red-400' : 
                index === 0 ? 'text-yellow-400' :
                index === 1 ? 'text-gray-300' :
                index === 2 ? 'text-orange-400' : 'text-white'
              }`}>
                {entry.totalEarned.toLocaleString()} 🪙
              </div>
            </div>
          );
        })}
      </div>

            {/* Current User Position (if not in top 10) */}
      {currentUser && currentUser.rank > 10 && (
        <div className="mt-4 pt-4 border-t border-orange-500/20">
          <div className="flex items-center p-3 rounded-lg bg-red-500/20 border border-red-500/30">
            <div className="w-12 text-center font-bold text-red-400">
              #{currentUser.rank}
            </div>
            <div className="w-8 h-8 rounded-full overflow-hidden mx-3">
              <img
                src={currentUser.avatar || '/default-avatar.png'}
                alt={currentUser.username}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 font-medium text-red-400">
              {currentUser.username} (You)
            </div>
            <div className="font-bold text-red-400">
              {currentUser.totalEarned.toLocaleString()} 🪙
            </div>
          </div>
        </div>
      )}

      {/* Auto-refresh info at bottom */}
      <div className="mt-6 pt-4 border-t border-orange-500/20">
        <div className="flex items-center justify-center space-x-4 text-sm">
          <div className="flex items-center space-x-2 text-orange-400">
            <span className="text-lg">⏰</span>
            <span>Next refresh: {formatTime(timeUntilRefresh)}</span>
          </div>
          {lastUpdated && (
            <div className="flex items-center space-x-2 text-gray-400">
              <span className="text-lg">🕒</span>
              <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
