'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface VoiceRewardData {
  voiceTimeMinutes: number;
  requirement: number;
  rewardClaimed: boolean;
  rewardAmount: number;
  remainingMinutes: number;
}

interface VoiceRewardsData {
  todayProgress: VoiceRewardData;
  recentRewards: Array<{
    date: string;
    voiceTimeMinutes: number;
    rewardClaimed: boolean;
    rewardAmount: number;
  }>;
  totalRewardsEarned: number;
}

export default function VoiceRewards() {
  const { data: session } = useSession();
  const [rewardsData, setRewardsData] = useState<VoiceRewardsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchVoiceRewards();
    }
  }, [session]);

  const fetchVoiceRewards = async () => {
    try {
      const response = await fetch('/api/voice-rewards');
      const data = await response.json();
      
      if (data.success) {
        setRewardsData(data.data);
      }
    } catch (error) {
      console.error('Error fetching voice rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user || loading) {
    return (
      <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700/50 rounded mb-4"></div>
          <div className="h-4 bg-gray-700/50 rounded mb-2"></div>
          <div className="h-4 bg-gray-700/50 rounded mb-2"></div>
        </div>
      </div>
    );
  }

  if (!rewardsData) {
    return null;
  }

  const progressPercentage = Math.min((rewardsData.todayProgress.voiceTimeMinutes / rewardsData.todayProgress.requirement) * 100, 100);

  return (
    <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center">
          <span className="mr-2">🎤</span>
          Daily Voice Rewards
        </h3>
      </div>

      {/* Today's Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-white font-medium">Today&apos;s Progress</span>
          <span className="text-purple-300 text-sm">
            {rewardsData.todayProgress.voiceTimeMinutes}/{rewardsData.todayProgress.requirement} minutes
          </span>
        </div>
        
        <div className="w-full bg-gray-700/50 rounded-full h-3 mb-3">
          <div 
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        {rewardsData.todayProgress.rewardClaimed ? (
          <div className="flex items-center justify-center bg-green-500/20 border border-green-500/30 rounded-lg p-3">
            <span className="text-green-400 font-medium">
              ✅ Reward Claimed! +{rewardsData.todayProgress.rewardAmount} HamsterCoins
            </span>
          </div>
        ) : rewardsData.todayProgress.remainingMinutes === 0 ? (
          <div className="flex items-center justify-center bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
            <span className="text-yellow-400 font-medium">
              🎁 Reward Ready! Join voice to claim {rewardsData.todayProgress.rewardAmount} coins
            </span>
          </div>
        ) : (
          <div className="text-center text-gray-300 text-sm">
            {rewardsData.todayProgress.remainingMinutes} minutes remaining for today&apos;s reward
          </div>
        )}
      </div>


      <div className="mt-4 text-center text-gray-400 text-xs">
        Spend 15+ minutes in voice channels daily to earn Tickets!
      </div>
    </div>
  );
}
