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
      <div className="glass-card rounded-2xl p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-300 text-base font-medium">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-6 border-red-300/20">
        <div className="text-center">
          <div className="text-3xl mb-3">❌</div>
          <p className="text-red-300 text-base font-medium">{error}</p>
          <button
            onClick={fetchLeaderboard}
            className="mt-4 btn-modern bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center space-x-3 mb-3">
          <div className="text-3xl">🏆</div>
          <h2 className="text-2xl font-bold gradient-text-primary">
            MEMBER RANK
          </h2>
        </div>
        <p className="text-gray-300 text-sm">Top members by total earnings</p>
        <div className="h-px bg-gradient-to-r from-transparent via-orange-300/20 to-transparent mt-4"></div>
      </div>

      {/* Modern Leaderboard List */}
      <div className="space-y-3 max-h-96 overflow-y-auto relative z-10">
        {leaderboard.slice(0, 10).map((entry, index) => {
          const isTopThree = index < 3;
          const isCurrentUser = session?.user && entry.userId === (session.user as any).id;

          // Determine styling based on rank and user status - toned down version
          let cardStyle = 'glass-card hover:border-white/20';
          let rankStyle = 'text-white font-medium';
          let nameStyle = 'text-white';
          let coinStyle = 'text-white font-medium';
          let rankBadge = '';

          if (isCurrentUser) {
            cardStyle = 'glass-card border-red-300/30 bg-red-500/5 hover:border-red-300/50';
            rankStyle = 'text-red-200 font-semibold';
            nameStyle = 'text-red-200 font-medium';
            coinStyle = 'text-red-200 font-semibold';
            rankBadge = 'bg-red-500/15 text-red-300';
          } else if (index === 0) {
            cardStyle = 'glass-card border-yellow-300/30 bg-yellow-500/5 hover:border-yellow-300/50';
            rankStyle = 'text-yellow-200 font-semibold';
            nameStyle = 'text-yellow-100 font-medium';
            coinStyle = 'text-yellow-200 font-semibold';
            rankBadge = 'bg-yellow-500/15 text-yellow-300';
          } else if (index === 1) {
            cardStyle = 'glass-card border-gray-300/30 bg-gray-400/5 hover:border-gray-300/50';
            rankStyle = 'text-gray-200 font-semibold';
            nameStyle = 'text-gray-100 font-medium';
            coinStyle = 'text-gray-200 font-semibold';
            rankBadge = 'bg-gray-400/15 text-gray-200';
          } else if (index === 2) {
            cardStyle = 'glass-card border-orange-300/30 bg-orange-500/5 hover:border-orange-300/50';
            rankStyle = 'text-orange-200 font-semibold';
            nameStyle = 'text-orange-100 font-medium';
            coinStyle = 'text-orange-200 font-semibold';
            rankBadge = 'bg-orange-500/15 text-orange-300';
          }

          return (
            <div
              key={entry.userId}
              className={`${cardStyle} p-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] hover:-translate-y-0.5 relative overflow-hidden`}
            >
              {/* Rank badge for top 3 */}
              {isTopThree && !isCurrentUser && (
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${rankBadge}`}>
                  TOP {index + 1}
                </div>
              )}

              {/* Current user indicator */}
              {isCurrentUser && (
                <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300">
                  YOU
                </div>
              )}

              <div className="flex items-center space-x-4">
                {/* Rank */}
                <div className={`w-12 text-center font-bold text-lg ${rankStyle}`}>
                  #{entry.rank}
                </div>

                {/* Avatar */}
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full overflow-hidden ring-1 transition-all duration-200 ${
                    isCurrentUser ? 'ring-red-300/40' :
                    index === 0 ? 'ring-yellow-300/40' :
                    index === 1 ? 'ring-gray-300/40' :
                    index === 2 ? 'ring-orange-300/40' :
                    'ring-white/10'
                  }`}>
                    <img
                      src={entry.avatar || '/default-avatar.png'}
                      alt={entry.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Username */}
                <div className={`flex-1 font-medium ${nameStyle}`}>
                  {entry.username}
                </div>

                {/* Total Earned */}
                <div className={`flex items-center space-x-1 font-semibold ${coinStyle}`}>
                  <span>{entry.totalEarned.toLocaleString()}</span>
                  <span className="text-lg">🪙</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

            {/* Current User Position (if not in top 10) */}
      {currentUser && currentUser.rank > 10 && (
        <div className="mt-6 pt-6">
          <div className="h-px bg-gradient-to-r from-transparent via-red-300/20 to-transparent mb-4"></div>
          <div className="glass-card p-4 rounded-xl border-red-300/30 bg-red-500/5 hover:border-red-300/50 transition-all duration-200">
            <div className="flex items-center space-x-4">
              <div className="w-12 text-center font-bold text-lg text-red-200">
                #{currentUser.rank}
              </div>
              <div className="relative">
                <div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-red-300/40">
                  <img
                    src={currentUser.avatar || '/default-avatar.png'}
                    alt={currentUser.username}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex-1 font-medium text-red-200">
                {currentUser.username} <span className="text-red-300 font-semibold">(YOU)</span>
              </div>
              <div className="flex items-center space-x-1 font-semibold text-red-200">
                <span>{currentUser.totalEarned.toLocaleString()}</span>
                <span className="text-lg">🪙</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-refresh info at bottom */}
      <div className="mt-6 pt-4">
        <div className="h-px bg-gradient-to-r from-transparent via-orange-300/20 to-transparent mb-3"></div>
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2 text-orange-200 glass-card px-3 py-1.5 rounded-lg">
            <span className="text-base">⏰</span>
            <span className="font-medium">Next refresh: {formatTime(timeUntilRefresh)}</span>
          </div>
          {lastUpdated && (
            <div className="flex items-center space-x-2 text-gray-300 glass-card px-3 py-1.5 rounded-lg">
              <span className="text-base">🕒</span>
              <span className="font-medium">Updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
