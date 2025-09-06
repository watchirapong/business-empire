'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import HamsterCoinBalance from '@/components/HamsterCoinBalance';
import StardustCoinBalance from '@/components/StardustCoinBalance';
import Achievements from '@/components/Achievements';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Track profile visits
  const { trackBehavior } = useBehaviorTracking({
    behaviorType: 'profile_visit',
    section: 'profile',
    action: 'view_profile'
  });
  const [currentNickname, setCurrentNickname] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<string>('None');
  const [userHouse, setUserHouse] = useState<string>('None');
  const [globalRank, setGlobalRank] = useState<number>(0);
  const [houseRank, setHouseRank] = useState<number>(0);
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [houseMembers, setHouseMembers] = useState<number>(0);

  const handleLogout = () => {
    setIsLoading(true);
    signOut({ callbackUrl: '/' });
  };

  const getDiscordAvatarUrl = (userId: string, avatar: string) => {
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
  };

  const getHouseFromRoles = (roles: string[]): string => {
    if (roles.includes('1407921062808785017')) return 'Selene';
    if (roles.includes('1407921679757344888')) return 'Pleiades';
    if (roles.includes('1407921686526824478')) return 'Ophira';
    return 'None';
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!session?.user) return;
      
      try {
        // Fetch current nickname
        const nicknameResponse = await fetch(`/api/users/get-server-nickname?userId=${(session.user as any).id}`);
        if (nicknameResponse.ok) {
          const nicknameData = await nicknameResponse.json();
          setCurrentNickname(nicknameData.nickname);
        }
        // Fetch user rank and house
        const rankResponse = await fetch(`/api/users/get-rank?userId=${(session.user as any).id}`);
        if (rankResponse.ok) {
          const rankData = await rankResponse.json();
          setUserRank(rankData.rank);
          
          // If we have roles data, determine house
          if (rankData.roles && Array.isArray(rankData.roles)) {
            const house = getHouseFromRoles(rankData.roles);
            setUserHouse(house);
          }
        }

        // Fetch user rankings
        const rankingsResponse = await fetch(`/api/users/get-rankings?userId=${(session.user as any).id}`);
        if (rankingsResponse.ok) {
          const rankingsData = await rankingsResponse.json();
          setGlobalRank(rankingsData.globalRank);
          setHouseRank(rankingsData.houseRank);
          setTotalMembers(rankingsData.totalMembers);
          setHouseMembers(rankingsData.houseMembers);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [session]);

  if (!session) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.1),transparent_50%)]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
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
              HamsterProfile
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-8 relative">
            {/* Hexagonal Rank Display - Positioned next to username */}
            <div className="absolute right-8 top-6 w-32 h-32">
              <div 
                className={`absolute inset-0 shadow-2xl border-2 ${
                  userRank === 'Ace' ? 'bg-gradient-to-br from-blue-300 via-blue-400 to-blue-500 border-blue-200' :
                  userRank === 'Hero' ? 'bg-gradient-to-br from-green-700 via-green-800 to-green-900 border-green-600' :
                  userRank === 'Enigma' ? 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 border-purple-300' :
                  userRank === 'Warrior' ? 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 border-orange-300' :
                  userRank === 'Trainee' ? 'bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 border-amber-100' :
                  'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 border-gray-300'
                }`}
                style={{
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
                }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="font-black text-white text-3xl">
                    {userRank === 'None' ? 'N/A' : userRank}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
              {/* Avatar */}
              <div className="relative">
                <img
                  src={getDiscordAvatarUrl((session.user as any).id, (session.user as any).avatar)}
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
                    {(session.user as any).username}
                  </h1>
                </div>
                <p className="text-gray-300 text-lg mb-2">
                  {currentNickname ? `@${currentNickname}` : `#${session.user?.name}`}
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  Discord User
                </p>
                <p className="text-gray-400 mb-6">
                  House: {userHouse}
                </p>
                

              </div>
            </div>
          </div>

          {/* Currency Balances */}
          <div className="space-y-4">
            <HamsterCoinBalance />
            <StardustCoinBalance />
          </div>

          {/* Leaderboard Rank Display */}
          <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Your Rankings</h2>
              <p className="text-gray-400">Compare your earnings with other members</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* House Ranking */}
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl border border-pink-500/30 p-6 text-center">
                <div className="text-white text-lg font-semibold mb-4">House Ranking</div>
                <div className="text-white text-3xl font-bold mb-2">
                  {userHouse !== 'None' && houseRank > 0 ? `#${houseRank}` : 'N/A'}
                </div>
                <div className="text-gray-400 text-sm">among {houseMembers} {userHouse} members</div>
                <div className="w-full h-px bg-pink-500/50 my-4"></div>
              </div>

              {/* Global Ranking */}
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl border border-pink-500/30 p-6 text-center">
                <div className="text-white text-lg font-semibold mb-4">Global Ranking</div>
                <div className="text-white text-3xl font-bold mb-2">
                  {globalRank > 0 ? `#${globalRank}` : 'N/A'}
                </div>
                <div className="text-gray-400 text-sm">among {totalMembers} members</div>
                <div className="w-full h-px bg-pink-500/50 my-4"></div>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <Achievements />
        </div>
      </div>
    </div>
  );
}
