'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Trophy, Star, Award, Zap, Target, CheckCircle, Lock } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  icon: string;
  requirement: {
    type: string;
    value: number;
    description: string;
  };
  reward: {
    hamsterCoins: number;
    experience: number;
  };
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');

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

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400';
      case 'uncommon': return 'text-green-400';
      case 'rare': return 'text-blue-400';
      case 'epic': return 'text-purple-400';
      case 'legendary': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'common': return '⭐';
      case 'uncommon': return '⭐⭐';
      case 'rare': return '⭐⭐⭐';
      case 'epic': return '⭐⭐⭐⭐';
      case 'legendary': return '⭐⭐⭐⭐⭐';
      default: return '⭐';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'login': return '🏠';
      case 'trading': return '📈';
      case 'gacha': return '🎰';
      case 'shop': return '🛒';
      case 'voice': return '🎤';
      case 'social': return '👥';
      case 'special': return '🎉';
      default: return '🏆';
    }
  };

  const filteredAchievements = achievements.filter(achievement => {
    const categoryMatch = selectedCategory === 'all' || achievement.category === selectedCategory;
    const rarityMatch = selectedRarity === 'all' || achievement.rarity === selectedRarity;
    return categoryMatch && rarityMatch;
  });

  const categories = [
    { id: 'all', name: 'All', icon: '🏆' },
    { id: 'login', name: 'Login', icon: '🏠' },
    { id: 'trading', name: 'Trading', icon: '📈' },
    { id: 'gacha', name: 'Gacha', icon: '🎰' },
    { id: 'shop', name: 'Shop', icon: '🛒' },
    { id: 'voice', name: 'Voice', icon: '🎤' },
    { id: 'social', name: 'Social', icon: '👥' },
    { id: 'special', name: 'Special', icon: '🎉' }
  ];

  const rarities = [
    { id: 'all', name: 'All Rarities' },
    { id: 'common', name: 'Common' },
    { id: 'uncommon', name: 'Uncommon' },
    { id: 'rare', name: 'Rare' },
    { id: 'epic', name: 'Epic' },
    { id: 'legendary', name: 'Legendary' }
  ];

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl border border-orange-500/30 p-4 text-center">
            <div className="text-white text-2xl font-bold">{stats.unlocked}</div>
            <div className="text-gray-400 text-sm">Unlocked</div>
          </div>
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl border border-orange-500/30 p-4 text-center">
            <div className="text-white text-2xl font-bold">{stats.total}</div>
            <div className="text-gray-400 text-sm">Total</div>
          </div>
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl border border-orange-500/30 p-4 text-center">
            <div className="text-white text-2xl font-bold">{stats.completionRate}%</div>
            <div className="text-gray-400 text-sm">Complete</div>
          </div>
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl border border-orange-500/30 p-4 text-center">
            <div className="text-white text-2xl font-bold">{stats.totalRewards}</div>
            <div className="text-gray-400 text-sm">Coins Earned</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div>
          <label className="text-white text-sm font-medium mb-2 block">Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <span className="mr-1">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="text-white text-sm font-medium mb-2 block">Rarity</label>
          <div className="flex flex-wrap gap-2">
            {rarities.map(rarity => (
              <button
                key={rarity.id}
                onClick={() => setSelectedRarity(rarity.id)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedRarity === rarity.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {rarity.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map(achievement => (
          <div
            key={achievement.id}
            className={`relative p-4 rounded-xl border transition-all duration-300 ${
              achievement.isUnlocked
                ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-green-500/30'
                : 'bg-gradient-to-br from-gray-800/30 to-gray-900/30 border-gray-600/30'
            }`}
          >
            {/* Rarity Badge */}
            <div className={`absolute top-2 right-2 text-xs font-bold ${getRarityColor(achievement.rarity)}`}>
              {getRarityIcon(achievement.rarity)}
            </div>

            {/* Achievement Icon */}
            <div className="text-center mb-3">
              <div className="text-4xl mb-2">
                {achievement.isUnlocked ? achievement.icon : '🔒'}
              </div>
              <div className="text-sm text-gray-400">
                {getCategoryIcon(achievement.category)} {achievement.category}
              </div>
            </div>

            {/* Achievement Info */}
            <div className="text-center mb-3">
              <h3 className="text-white font-semibold mb-1">{achievement.name}</h3>
              <p className="text-gray-400 text-sm mb-2">{achievement.description}</p>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <div
                  className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((achievement.progress / achievement.requirement.value) * 100, 100)}%`
                  }}
                ></div>
              </div>
              
              <div className="text-xs text-gray-400">
                {achievement.progress} / {achievement.requirement.value} - {achievement.requirement.description}
              </div>
            </div>

            {/* Reward Info */}
            {achievement.reward.hamsterCoins > 0 && (
              <div className="text-center mb-3">
                <div className="text-yellow-400 text-sm font-medium">
                  🪙 {achievement.reward.hamsterCoins} Coins
                </div>
              </div>
            )}

            {/* Status and Actions */}
            <div className="text-center">
              {achievement.isUnlocked ? (
                achievement.claimed ? (
                  <div className="flex items-center justify-center text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Claimed
                  </div>
                ) : (
                  <button
                    onClick={() => claimAchievement(achievement.id)}
                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Claim Reward
                  </button>
                )
              ) : (
                <div className="flex items-center justify-center text-gray-400 text-sm">
                  <Lock className="w-4 h-4 mr-1" />
                  Locked
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-lg">No achievements found</div>
          <p className="text-gray-500 text-sm">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
