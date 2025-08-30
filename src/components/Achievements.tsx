'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Trophy, CheckCircle, Lock } from 'lucide-react';

interface Achievement {
  id?: string;
  _id?: string;
  name?: string;
  title?: string;
  description: string;
  category: string;
  rarity: string;
  icon: string;
  requirement?: {
    type: string;
    value: number;
    description: string;
  };
  reward?: {
    hamsterCoins: number;
    experience: number;
  };
  coinReward?: number;
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  claimed: boolean;
  claimedAt?: string;
}

interface AchievementStats {
  total: number;
  unlocked: number;
  claimed: number;
  totalRewards: number;
  completionRate: string;
}

export default function Achievements() {
  const { data: session } = useSession();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchAchievements();
    }
  }, [session]);

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/achievements/user?userId=${(session?.user as any).id}`);
      const data = await response.json();
      
      if (response.ok) {
        setAchievements(data.achievements || []);
        setStats(data.statistics || null);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimAchievement = async (achievementId: string) => {
    try {
      const response = await fetch('/api/achievements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: (session?.user as any).id,
          achievementId,
          action: 'claim'
        }),
      });

      if (response.ok) {
        // Refresh achievements
        fetchAchievements();
      }
    } catch (error) {
      console.error('Error claiming achievement:', error);
    }
  };

  // Separate achievements by completion status
  const completedAchievements = achievements.filter(achievement => achievement.isUnlocked);
  const incompleteAchievements = achievements.filter(achievement => !achievement.isUnlocked);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading achievements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center space-x-2">
          <Trophy className="text-yellow-400" />
          <span>Achievements</span>
        </h2>
        <p className="text-gray-400">Track your progress and unlock rewards</p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="mb-6">
          <div className="text-center mb-4">
            <div className="text-white text-2xl font-bold mb-2">
              {stats.unlocked} OF {stats.total} ACHIEVEMENTS EARNED
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${stats.completionRate}%`
                }}
              ></div>
            </div>
            <div className="text-gray-400 text-sm">
              ({stats.completionRate}%)
            </div>
          </div>
        </div>
      )}

      {/* Completed Achievements Section */}
      {completedAchievements.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <CheckCircle className="text-green-400 mr-2" />
            Completed Achievements ({completedAchievements.length})
          </h3>
          <div className="space-y-3">
            {completedAchievements.map(achievement => (
              <div
                key={achievement.id}
                className="flex items-center p-4 rounded-xl border border-green-500/30 bg-gradient-to-br from-gray-800/50 to-gray-900/50 transition-all duration-300"
              >
                {/* Achievement Icon */}
                <div className="flex-shrink-0 mr-4">
                  <div className="text-3xl">
                    {achievement.icon}
                  </div>
                </div>

                {/* Achievement Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg mb-1">{achievement.name || achievement.title}</h3>
                      <p className="text-gray-400 text-sm mb-2">{achievement.description}</p>
                      
                      {/* Progress Bar */}
                      {achievement.requirement && (
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min((achievement.progress / achievement.requirement.value) * 100, 100)}%`
                            }}
                          ></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Right side - Reward and Status */}
                    <div className="flex flex-col items-end ml-4 space-y-2">
                      {/* Reward Info */}
                      {((achievement.reward?.hamsterCoins || 0) > 0 || (achievement.coinReward || 0) > 0) && (
                        <div className="text-yellow-400 text-sm font-medium">
                          🪙 {achievement.reward?.hamsterCoins || achievement.coinReward || 0} Coins
                        </div>
                      )}
                      
                      {/* Unlock Time */}
                      {achievement.unlockedAt && (
                        <div className="text-gray-400 text-xs">
                          Unlocked {new Date(achievement.unlockedAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })} at {new Date(achievement.unlockedAt).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </div>
                      )}
                      
                      {/* Status and Actions */}
                      <div className="text-center">
                        {achievement.claimed ? (
                          <div className="flex items-center justify-center text-green-400 text-sm">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Claimed
                          </div>
                        ) : (
                          <button
                            onClick={() => claimAchievement(achievement.id || achievement._id || '')}
                            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            Claim Reward
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incomplete Achievements Section */}
      {incompleteAchievements.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <Lock className="text-gray-400 mr-2" />
            Incomplete Achievements ({incompleteAchievements.length})
          </h3>
          <div className="space-y-3">
            {incompleteAchievements.map(achievement => (
              <div
                key={achievement.id}
                className="flex items-center p-4 rounded-xl border border-gray-600/30 bg-gradient-to-br from-gray-800/30 to-gray-900/30 transition-all duration-300"
              >
                {/* Achievement Icon */}
                <div className="flex-shrink-0 mr-4">
                  <div className="text-3xl">
                    🔒
                  </div>
                </div>

                {/* Achievement Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg mb-1">{achievement.name || achievement.title}</h3>
                      <p className="text-gray-400 text-sm mb-2">{achievement.description}</p>
                      
                      {/* Progress Bar */}
                      {achievement.requirement && (
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                          <div
                            className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min((achievement.progress / achievement.requirement.value) * 100, 100)}%`
                            }}
                          ></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Right side - Reward and Status */}
                    <div className="flex flex-col items-end ml-4 space-y-2">
                      {/* Reward Info */}
                      {((achievement.reward?.hamsterCoins || 0) > 0 || (achievement.coinReward || 0) > 0) && (
                        <div className="text-yellow-400 text-sm font-medium">
                          🪙 {achievement.reward?.hamsterCoins || achievement.coinReward || 0} Coins
                        </div>
                      )}
                      
                      {/* Status */}
                      <div className="text-center">
                        <div className="flex items-center justify-center text-gray-400 text-sm">
                          <Lock className="w-4 h-4 mr-1" />
                          Locked
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {achievements.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-lg">No achievements found</div>
          <p className="text-gray-500 text-sm">Start playing to unlock achievements!</p>
        </div>
      )}
    </div>
  );
}
