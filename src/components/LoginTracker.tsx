'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface LoginTrackerData {
  consecutiveDays: number;
  totalLoginDays: number;
  lastLoginDate: string;
  streakStartDate: string;
  todayCompleted: boolean;
  streak: {
    current: number;
    required: number;
    isEligibleForCoins: boolean;
    daysUntilCoins: number;
  };
  todayProgress: {
    voiceTimeMinutes: number;
    requirement: number;
    rewardClaimed: boolean;
    ticketReward: number;
    coinReward: number;
    remainingMinutes: number;
  };
}

export default function LoginTracker() {
  const { data: session } = useSession();
  const [trackerData, setTrackerData] = useState<LoginTrackerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchLoginStreak();
    }
  }, [session]);

  const fetchLoginStreak = async () => {
    try {
      // Get both login streak and voice rewards data
      const [streakResponse, voiceResponse] = await Promise.all([
        fetch('/api/login-streak'),
        fetch('/api/voice-rewards')
      ]);
      
      const streakData = await streakResponse.json();
      const voiceData = await voiceResponse.json();
      
      if (streakData.success && voiceData.success) {
        // Combine the data
        const combinedData = {
          ...streakData.data,
          streak: voiceData.data.streak,
          todayProgress: voiceData.data.todayProgress
        };
        setTrackerData(combinedData);
      }
    } catch (error) {
      console.error('Error fetching login streak:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkTodayCompletion = async () => {
    if (!session?.user) return;
    
    try {
      const response = await fetch('/api/voice-rewards');
      const data = await response.json();
      
      if (data.success && data.data.todayProgress) {
        const todayCompleted = data.data.todayProgress.voiceTimeMinutes >= data.data.todayProgress.requirement;
        
        if (trackerData && trackerData.todayCompleted !== todayCompleted) {
          // Update database
          const updateResponse = await fetch('/api/login-streak', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ todayCompleted }),
          });
          
          if (updateResponse.ok) {
            const updateData = await updateResponse.json();
            if (updateData.success) {
              setTrackerData(updateData.data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking today completion:', error);
    }
  };

  // Check completion status periodically
  useEffect(() => {
    if (trackerData) {
      checkTodayCompletion();
      const interval = setInterval(checkTodayCompletion, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [trackerData, session, checkTodayCompletion]);

  if (!session?.user || loading) {
    return (
      <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700/50 rounded mb-4"></div>
          <div className="h-4 bg-gray-700/50 rounded mb-2"></div>
          <div className="h-4 bg-gray-700/50 rounded mb-2"></div>
        </div>
      </div>
    );
  }

  if (!trackerData) {
    return null;
  }

  const getStreakEmoji = (days: number) => {
    if (days >= 30) return '🔥🔥🔥';
    if (days >= 14) return '🔥🔥';
    if (days >= 7) return '🔥';
    if (days >= 3) return '⭐';
    return '🌱';
  };

  const getStreakColor = (days: number) => {
    if (days >= 30) return 'from-red-500 to-orange-500';
    if (days >= 14) return 'from-orange-500 to-yellow-500';
    if (days >= 7) return 'from-yellow-500 to-green-500';
    if (days >= 3) return 'from-green-500 to-blue-500';
    return 'from-blue-500 to-purple-500';
  };

  return (
    <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center">
          <span className="mr-2">📅</span>
          Login Streak
        </h3>
        <div className="text-orange-300 text-sm">
          Total: {trackerData.streak?.current || trackerData.totalLoginDays} days
        </div>
      </div>

      {/* Streak Display */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`text-3xl font-black bg-gradient-to-r ${getStreakColor(trackerData.streak?.current || trackerData.consecutiveDays)} bg-clip-text text-transparent`}>
              {trackerData.streak?.current || trackerData.consecutiveDays}
            </div>
            <div className="text-white font-medium">
              {(trackerData.streak?.current || trackerData.consecutiveDays) === 1 ? 'Day' : 'Days'} Streak
            </div>
          </div>
          <div className={`text-2xl ${getStreakEmoji(trackerData.streak?.current || trackerData.consecutiveDays)}`}>
            {getStreakEmoji(trackerData.streak?.current || trackerData.consecutiveDays)}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-700/50 rounded-full h-2 mb-2">
          <div 
            className={`bg-gradient-to-r ${getStreakColor(trackerData.streak?.current || trackerData.consecutiveDays)} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(((trackerData.streak?.current || trackerData.consecutiveDays) / 30) * 100, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Today's Status */}
      <div className="mb-4">
        {trackerData.todayCompleted ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center bg-green-500/20 border border-green-500/30 rounded-lg p-3">
              <span className="text-green-400 font-medium">
                ✅ Today&apos;s 15 minutes completed!
              </span>
            </div>
            
            {/* Coin Status */}
            {trackerData.streak && (
              <div className={`flex items-center justify-center rounded-lg p-3 ${
                trackerData.streak.isEligibleForCoins 
                  ? 'bg-yellow-500/20 border border-yellow-500/30' 
                  : 'bg-blue-500/20 border border-blue-500/30'
              }`}>
                <span className={`font-medium ${
                  trackerData.streak.isEligibleForCoins ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  {trackerData.streak.isEligibleForCoins ? (
                    `💰 Earning 10 coins per day! (${trackerData.streak.current} day streak)`
                  ) : (
                    `🎯 ${trackerData.streak.daysUntilCoins} more days to earn coins (${trackerData.streak.current}/${trackerData.streak.required})`
                  )}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
            <span className="text-yellow-400 font-medium">
              ⏳ Complete 15 minutes in voice to maintain streak
            </span>
          </div>
        )}
      </div>


      <div className="mt-4 text-center text-gray-400 text-xs">
        Login daily and spend 15+ minutes in voice to maintain your streak!
      </div>
    </div>
  );
}
