'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import HamsterCoinBalance from '@/components/HamsterCoinBalance';
import StardustCoinBalance from '@/components/StardustCoinBalance';
import Achievements from '@/components/Achievements';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';

interface UserProfile {
  id: string;
  username: string;
  discriminator?: string;
  avatar?: string;
  globalName?: string;
}

interface UserData {
  user: UserProfile;
  nickname?: string;
  userRank: string;
  userHouse: string;
  globalRank: number;
  houseRank: number;
  totalMembers: number;
  houseMembers: number;
  gamesCount: number;
  isOwnProfile: boolean | undefined;
}

export default function UserProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [userData, setUserData] = useState<UserData | null>(null);
  const [userGames, setUserGames] = useState<any[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userStats, setUserStats] = useState({
    programming: 85,
    artist: 72,
    creative: 68,
    leadership: 91,
    communication: 76,
    selfLearning: 83
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Track profile visits
  const { trackBehavior } = useBehaviorTracking({
    behaviorType: 'profile_visit',
    section: 'profile',
    action: 'view_user_profile'
  });

  const loadUserData = useCallback(async () => {
    if (!userId) {
      setError('Invalid user ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Validate user ID format (Discord snowflake should be numeric)
      if (!/^\d+$/.test(userId)) {
        throw new Error('Invalid user ID format');
      }

      // Fetch user basic info
      console.log('Profile page: Fetching user data for ID:', userId);
      const userResponse = await fetch(`/api/users/profile/${userId}`);
      console.log('Profile page: API response status:', userResponse.status);

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        console.log('Profile page: API error response:', errorData);

        // If we get debug info, show it
        if (errorData.debug) {
          console.log('Profile page: Available users in database:', errorData.debug.sampleUsers);
        }

        throw new Error(errorData.error || 'User not found');
      }
      const userInfo = await userResponse.json();

      // Fetch user rank and house
      const rankResponse = await fetch(`/api/users/get-rank?userId=${userId}`);
      let rankData = { rank: 'None', roles: [] };
      if (rankResponse.ok) {
        rankData = await rankResponse.json();
      }

      // Fetch user rankings
      const rankingsResponse = await fetch(`/api/users/get-rankings?userId=${userId}`);
      let rankingsData = { globalRank: 0, houseRank: 0, totalMembers: 0, houseMembers: 0 };
      if (rankingsResponse.ok) {
        rankingsData = await rankingsResponse.json();
      }

      // Determine house from roles
      const getHouseFromRoles = (roles: string[]): string => {
        if (roles.includes('1407921062808785017')) return 'Selene';
        if (roles.includes('1407921679757344888')) return 'Pleiades';
        if (roles.includes('1407921686526824478')) return 'Ophira';
        return 'None';
      };

      const userHouse = getHouseFromRoles(rankData.roles || []);

      // Check if this is the current user's profile
      const isOwnProfile = session?.user && (session.user as any).id === userId;

      setUserData({
        user: userInfo.user,
        nickname: userInfo.nickname,
        userRank: rankData.rank,
        userHouse,
        globalRank: rankingsData.globalRank,
        houseRank: rankingsData.houseRank,
        totalMembers: rankingsData.totalMembers,
        houseMembers: rankingsData.houseMembers,
        gamesCount: userInfo.gamesCount || 0,
        isOwnProfile
      });

    } catch (err) {
      console.error('Error loading user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  }, [userId, session?.user]);

  const loadUserStats = useCallback(async () => {
    if (!userId || !session?.user || !userData?.isOwnProfile) return;

    try {
      setStatsLoading(true);
      const response = await fetch('/api/users/stats');
      const data = await response.json();

      if (data.success) {
        setUserStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load user stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, [userId, session?.user, userData?.isOwnProfile]);

  const loadUserGames = useCallback(async () => {
    if (!userId) return;

    try {
      setGamesLoading(true);
      const response = await fetch(`/api/games?userId=${userId}&limit=6`);
      const data = await response.json();

      if (data.success) {
        setUserGames(data.games);
      }
    } catch (error) {
      console.error('Failed to load user games:', error);
    } finally {
      setGamesLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadUserData();
      loadUserGames();
    }
  }, [userId, loadUserData, loadUserGames]);

  useEffect(() => {
    if (userData?.isOwnProfile) {
      loadUserStats();
    }
  }, [userData?.isOwnProfile, loadUserStats]);

  const getDiscordAvatarUrl = (userId: string, avatar: string) => {
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
  };

  const getDisplayName = (user: UserProfile) => {
    return user.globalName || user.username;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ← Back
            </button>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-md mx-auto text-center">
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-xl font-bold text-white mb-2">Profile Not Found</h2>
            <p className="text-gray-400 mb-4">{error || 'This user profile could not be found.'}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.1),transparent_50%)]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="text-4xl hover:scale-110 transition-transform duration-300"
            >
              🏠
            </button>
            <div className="text-white text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              {userData.isOwnProfile ? 'My Profile' : `${getDisplayName(userData.user)}'s Profile`}
            </div>
          </div>

          {/* Share Button */}
          {!userData.isOwnProfile && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Profile link copied to clipboard!');
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <span>🔗</span>
              <span>Share Profile</span>
            </button>
          )}
        </div>

        {/* Profile Content */}
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-8 relative">
            {/* Hexagonal Rank Display - Positioned next to username */}
            <div className="absolute right-8 top-6 w-32 h-32">
              <div
                className={`absolute inset-0 shadow-2xl border-2 ${
                  userData.userRank === 'Ace' ? 'bg-gradient-to-br from-blue-300 via-blue-400 to-blue-500 border-blue-200' :
                  userData.userRank === 'Hero' ? 'bg-gradient-to-br from-green-700 via-green-800 to-green-900 border-green-600' :
                  userData.userRank === 'Enigma' ? 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 border-purple-300' :
                  userData.userRank === 'Warrior' ? 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 border-orange-300' :
                  userData.userRank === 'Trainee' ? 'bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 border-amber-100' :
                  'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 border-gray-300'
                }`}
                style={{
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
                }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="font-black text-white text-3xl">
                    {userData.userRank === 'None' ? 'N/A' : userData.userRank}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
              {/* Avatar */}
              <div className="relative">
                <img
                  src={getDiscordAvatarUrl(userData.user.id, userData.user.avatar || '') || `https://cdn.discordapp.com/embed/avatars/${parseInt(userData.user.discriminator || '0') % 5}.png`}
                  alt="Profile"
                  className="w-32 h-32 rounded-full ring-4 ring-orange-500/50 shadow-2xl"
                />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-black flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start mb-2">
                  <h1 className="text-3xl font-bold text-white">
                    {getDisplayName(userData.user)}
                  </h1>
                </div>
                <p className="text-gray-300 text-lg mb-2">
                  {userData.nickname ? `@${userData.nickname}` : `#${userData.user.username}`}
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  Discord User
                </p>
                <p className="text-gray-400 mb-6">
                  House: {userData.userHouse}
                </p>

                {/* Profile Stats */}
                <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-6">
                  <div className="bg-orange-900/30 rounded-lg px-4 py-2 text-center">
                    <div className="text-orange-300 font-bold text-lg">{userData.gamesCount}</div>
                    <div className="text-orange-200 text-sm">Games Shared</div>
                  </div>
                  <div className="bg-blue-900/30 rounded-lg px-4 py-2 text-center">
                    <div className="text-blue-300 font-bold text-lg">#{userData.globalRank || 'N/A'}</div>
                    <div className="text-blue-200 text-sm">Global Rank</div>
                  </div>
                  {userData.userHouse !== 'None' && (
                    <div className="bg-purple-900/30 rounded-lg px-4 py-2 text-center">
                      <div className="text-purple-300 font-bold text-lg">#{userData.houseRank || 'N/A'}</div>
                      <div className="text-purple-200 text-sm">{userData.userHouse} Rank</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Currency Balances - Only show for own profile */}
          {userData.isOwnProfile && (
            <div className="space-y-4">
              <HamsterCoinBalance />
              <StardustCoinBalance />
            </div>
          )}

          {/* Stats Section - Only show for own profile */}
          {userData.isOwnProfile && (
            <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-cyan-500/20 p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">📊 My Stats</h2>
                <p className="text-gray-400">Track your skill development and achievements</p>
              </div>

              {/* Ability Chart */}
              <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold gradient-text-primary mb-2">🎯 Ability Chart</h2>
                  <p className="text-gray-300">Your comprehensive skill assessment</p>
                </div>

                {/* Radar Chart Container */}
                <div className="relative flex items-center justify-center mb-8">
                  <div className="relative w-80 h-80">
                    {/* Radar Chart Background Circles */}
                    <div className="absolute inset-0 rounded-full border border-orange-500/20"></div>
                    <div className="absolute inset-8 rounded-full border border-orange-500/20"></div>
                    <div className="absolute inset-16 rounded-full border border-orange-500/20"></div>
                    <div className="absolute inset-24 rounded-full border border-orange-500/20"></div>
                    <div className="absolute inset-32 rounded-full border border-orange-500/20"></div>

                    {/* Radar Lines */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent rotate-0"></div>
                      <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent rotate-60"></div>
                      <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent rotate-120"></div>
                    </div>

                    {/* Skill Points */}
                    {(() => {
                      const centerX = 160;
                      const centerY = 160;
                      const maxRadius = 140;
                      const angleStep = (Math.PI * 2) / 6;

                      const skills = [
                        { name: 'Programming', value: userStats.programming, color: 'rgb(59, 130, 246)', icon: '💻' },
                        { name: 'Artist', value: userStats.artist, color: 'rgb(147, 51, 234)', icon: '🎨' },
                        { name: 'Creative', value: userStats.creative, color: 'rgb(34, 197, 94)', icon: '💡' },
                        { name: 'Leadership', value: userStats.leadership, color: 'rgb(234, 179, 8)', icon: '👑' },
                        { name: 'Communication', value: userStats.communication, color: 'rgb(236, 72, 153)', icon: '💬' },
                        { name: 'Self Learning', value: userStats.selfLearning, color: 'rgb(99, 102, 241)', icon: '📚' }
                      ];

                      return skills.map((skill, index) => {
                        const angle = index * angleStep - Math.PI / 2; // Start from top
                        const radius = (skill.value / 100) * maxRadius;
                        const x = centerX + Math.cos(angle) * radius;
                        const y = centerY + Math.sin(angle) * radius;

                        return (
                          <div
                            key={skill.name}
                            className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg animate-pulse"
                            style={{
                              backgroundColor: skill.color,
                              left: x - 8,
                              top: y - 8,
                              boxShadow: `0 0 15px ${skill.color}40`
                            }}
                          >
                            <div className="absolute -top-8 -left-8 text-lg">{skill.icon}</div>
                          </div>
                        );
                      });
                    })()}

                    {/* Center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 bg-orange-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Skill Labels */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { name: 'Programming', value: userStats.programming, color: 'text-blue-400', bg: 'from-blue-500 to-blue-400', icon: '💻' },
                    { name: 'Artist', value: userStats.artist, color: 'text-purple-400', bg: 'from-purple-500 to-purple-400', icon: '🎨' },
                    { name: 'Creative', value: userStats.creative, color: 'text-green-400', bg: 'from-green-500 to-green-400', icon: '💡' },
                    { name: 'Leadership', value: userStats.leadership, color: 'text-yellow-400', bg: 'from-yellow-500 to-yellow-400', icon: '👑' },
                    { name: 'Communication', value: userStats.communication, color: 'text-pink-400', bg: 'from-pink-500 to-pink-400', icon: '💬' },
                    { name: 'Self Learning', value: userStats.selfLearning, color: 'text-indigo-400', bg: 'from-indigo-500 to-indigo-400', icon: '📚' }
                  ].map((skill) => (
                    <div key={skill.name} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{skill.icon}</span>
                        <div>
                          <div className="text-sm font-medium text-white">{skill.name}</div>
                          <div className={`text-xs ${skill.color}`}>{skill.value}/100</div>
                        </div>
                      </div>
                      <div className={`w-16 h-2 bg-gray-700 rounded-full overflow-hidden`}>
                        <div
                          className={`h-full bg-gradient-to-r ${skill.bg} transition-all duration-1000`}
                          style={{ width: `${skill.value}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Achievements - Only show for own profile */}
          {userData.isOwnProfile && (
            <Achievements />
          )}

          {/* My Games */}
          <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {userData.isOwnProfile ? '🎮 My Games' : `🎮 ${getDisplayName(userData.user)}'s Games`}
                </h2>
                <p className="text-gray-400">
                  {userData.isOwnProfile
                    ? 'Games you\'ve shared on Game Space'
                    : `Games shared by ${getDisplayName(userData.user)} on Game Space`
                  }
                </p>
              </div>
              {userData.isOwnProfile && (
                <button
                  onClick={() => router.push('/game-space')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 font-semibold"
                >
                  View All Games
                </button>
              )}
            </div>

            {gamesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading games...</p>
              </div>
            ) : userGames.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🎮</div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {userData.isOwnProfile ? 'No Games Yet' : 'No Games Shared'}
                </h3>
                <p className="text-gray-400 mb-4">
                  {userData.isOwnProfile
                    ? 'Share your itch.io games with the community!'
                    : `${getDisplayName(userData.user)} hasn't shared any games yet.`
                  }
                </p>
                {userData.isOwnProfile && (
                  <button
                    onClick={() => router.push('/game-space')}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 font-semibold"
                  >
                    Post Your First Game
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userGames.slice(0, 6).map((game) => (
                  <div key={game._id} className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-purple-500/20 p-4 hover:border-purple-400/40 transition-all duration-300">
                    {/* Game Thumbnail */}
                    {game.thumbnailUrl && (
                      <img
                        src={game.thumbnailUrl}
                        alt={game.title}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                    )}

                    {/* Game Info */}
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">{game.title}</h3>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">{game.description}</p>

                    {/* Game Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                      <span>❤️ {game.likes.length}</span>
                      <span>💬 {game.comments.length}</span>
                      <span>👁️ {game.views}</span>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {game.genre && (
                        <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs">
                          {game.genre}
                        </span>
                      )}
                      {game.tags.slice(0, 2).map((tag: string, index: number) => (
                        <span key={index} className="bg-gray-600/50 text-gray-300 px-2 py-1 rounded-full text-xs">
                          #{tag}
                        </span>
                      ))}
                      {game.tags.length > 2 && (
                        <span className="bg-gray-600/50 text-gray-300 px-2 py-1 rounded-full text-xs">
                          +{game.tags.length - 2}
                        </span>
                      )}
                    </div>

                    {/* Play Button */}
                    <a
                      href={game.itchIoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 text-center block font-semibold"
                    >
                      🎮 Play on itch.io
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
