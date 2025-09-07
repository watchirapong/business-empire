'use client';

import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Leaderboard from '@/components/Leaderboard';
import HouseLeaderboard from '@/components/HouseLeaderboard';
import { isAdmin } from '@/lib/admin-config';

import VoiceRewards from '@/components/VoiceRewards';
// Removed: import HamsterCoinBalance from '@/components/HamsterCoinBalance';

export default function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userRank, setUserRank] = useState<string>('None');

  // Debug URL display issues
  useEffect(() => {
    console.log('Current URL:', window.location.href);
    console.log('Expected URL:', 'https://hamsterhub.fun/');

    // Check for any URL manipulation
    if (window.location.href.includes('@')) {
      console.warn('URL contains @ symbol - this might be caused by browser extensions');
    }

    // Check for common browser extensions that might interfere
    const checkForExtensions = () => {
      const extensions = [
        'uBlock Origin',
        'AdBlock',
        'Privacy Badger',
        'HTTPS Everywhere',
        'NoScript'
      ];

      extensions.forEach(ext => {
        if (navigator.userAgent.includes(ext) || document.querySelector(`[data-extension="${ext}"]`)) {
          console.warn(`Detected browser extension: ${ext} - this might be causing URL display issues`);
        }
      });
    };

    // Small delay to let extensions load
    setTimeout(checkForExtensions, 1000);
  }, []);

  const handleLogout = () => {
    signOut({ callbackUrl: '/' });
  };

  const handleMenuClick = (path: string) => {
    router.push(path);
  };

  const getDiscordAvatarUrl = (userId: string, avatar: string) => {
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
  };

  // Check if current user is admin
  const isCurrentUserAdmin = isAdmin((session?.user as any)?.id);

  // Rank priority (higher number = higher rank)
  const RANK_PRIORITY: { [key: string]: number } = {
    'Ace': 5,
    'Hero': 4,
    'Enigma': 3,
    'Warrior': 2,
    'Trainee': 1
  };

  // Check if user has warrior rank or higher or is admin
  const hasWarriorRankOrHigher = RANK_PRIORITY[userRank] >= 2;
  const canSeeHouseLeaderboard = hasWarriorRankOrHigher || isCurrentUserAdmin;

  useEffect(() => {
    const fetchUserRank = async () => {
      if (!session?.user) return;
      
      try {
        const rankResponse = await fetch(`/api/users/get-rank?userId=${(session.user as any).id}`);
        if (rankResponse.ok) {
          const rankData = await rankResponse.json();
          setUserRank(rankData.rank);
        }
      } catch (error) {
        console.error('Error fetching user rank:', error);
      }
    };

    fetchUserRank();
  }, [session]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.1),transparent_50%)]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 sm:py-12 md:py-16">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12">
              <img
                src="/hamsterhub-logo.png"
                alt="HamsterHub Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-white text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              HamsterHub
            </div>
          </div>

          {/* Debug URL Display - Only show in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="fixed top-4 right-4 bg-black/80 text-white p-2 rounded text-xs z-50 max-w-xs">
              <div className="font-bold">URL Debug:</div>
              <div className="break-all">{typeof window !== 'undefined' ? window.location.href : 'Loading...'}</div>
              {typeof window !== 'undefined' && window.location.href.includes('@') && (
                <div className="text-red-400 font-bold mt-1">⚠️ @ symbol detected!</div>
              )}
            </div>
          )}
          <div className="flex items-center space-x-4">
            {session ? (
              <div className="relative group">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-3 bg-black/20 backdrop-blur-sm rounded-lg p-2 border border-orange-500/30 hover:bg-white/10 transition-all duration-300 transform hover:scale-105"
                >
                  <img
                    src={getDiscordAvatarUrl((session.user as any).id, (session.user as any).avatar)}
                    alt="Profile"
                    className="w-8 h-8 rounded-full ring-2 ring-orange-500/50 group-hover:ring-orange-400 transition-all duration-300"
                  />
                  <div className="text-left">
                    <div className="text-white font-medium text-sm group-hover:text-orange-200 transition-colors duration-300">
                      {(session.user as any).username}
                    </div>
                    <div className="text-gray-300 text-xs group-hover:text-orange-300 transition-colors duration-300">
                      #{session.user?.name}
                    </div>
                  </div>
                  <svg
                    className={`w-4 h-4 text-white transition-transform duration-300 group-hover:text-orange-300 ${
                      isProfileOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Profile Menu Dropdown */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-sm rounded-xl border border-orange-500/20 shadow-2xl z-50 animate-in slide-in-from-top-2 duration-300">
                    <div className="p-4 space-y-2">
                      {/* Profile Button */}
                      <button
                        onClick={() => router.push('/profile')}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg font-medium flex items-center justify-center space-x-2"
                      >
                        <span className="text-lg">👤</span>
                        <span>Profile</span>
                      </button>
                      
                      {/* Admin Panel Button - Only show for admin */}
                      {isCurrentUserAdmin && (
                        <button
                          onClick={() => router.push('/admin')}
                          className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg font-medium flex items-center justify-center space-x-2"
                        >
                          <span className="text-lg">👑</span>
                          <span>Admin Panel</span>
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg font-medium flex items-center justify-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>ออกจากระบบ</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={() => router.push('/api/auth/signin?callbackUrl=/')}
                className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-8 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-orange-500/25 flex items-center space-x-2"
              >
                <span className="text-xl">🔐</span>
                <span>เข้าสู่ระบบ</span>
              </button>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-block bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-transparent bg-clip-text">
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black mb-8 tracking-tight leading-tight">
              {session ? `Welcome! ${session.user?.name || 'user'}` : 'Hamstellar'}
            </h1>
          </div>
        </div>

        {/* Menu Section - Only show when logged in */}
        {session && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">

              {/* Hamster Shop */}
              <button
                onClick={() => handleMenuClick('/shop')}
                className="group bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-8 hover:border-orange-400/40 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/20 w-full flex flex-col items-center justify-center"
              >
                <div className="text-center w-full flex flex-col items-center justify-center">
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300 flex justify-center">🛒</div>
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-orange-300 transition-colors duration-300 text-center leading-tight">
                    Hamster Shop
                  </h3>
                  <p className="text-gray-400 text-sm group-hover:text-orange-200 transition-colors duration-300 text-center leading-relaxed">
                    ระบบร้านค้าใหม่
                  </p>
                </div>
              </button>

              {/* Gacha */}
              <button
                onClick={() => handleMenuClick('/gacha')}
                className="group bg-gradient-to-br from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 p-8 hover:border-purple-400/40 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 w-full flex flex-col items-center justify-center"
              >
                <div className="text-center w-full flex flex-col items-center justify-center">
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300 flex justify-center">🎰</div>
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors duration-300 text-center leading-tight">
                    Gacha
                  </h3>
                  <p className="text-gray-400 text-sm group-hover:text-purple-200 transition-colors duration-300 text-center leading-relaxed">
                    ลุ้นรางวัลสุดพิเศษ
                  </p>
                </div>
              </button>

              {/* Hamsterboard */}
              <button
                onClick={() => handleMenuClick('/hamsterboard')}
                className="group bg-gradient-to-br from-green-900/50 to-emerald-900/50 backdrop-blur-sm rounded-2xl border border-green-500/20 p-8 hover:border-green-400/40 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-green-500/20 w-full flex flex-col items-center justify-center"
              >
                <div className="text-center w-full flex flex-col items-center justify-center">
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300 flex justify-center">🐹</div>
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-green-300 transition-colors duration-300 text-center leading-tight">
                    Hamsterboard
                  </h3>
                  <p className="text-gray-400 text-sm group-hover:text-green-200 transition-colors duration-300 text-center leading-relaxed">
                    ทำภารกิจ รับรางวัล
                  </p>
                </div>
              </button>

              {/* University Search */}
              <button
                onClick={() => handleMenuClick('/university-search')}
                className="group bg-gradient-to-br from-blue-900/50 to-indigo-900/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 p-8 hover:border-blue-400/40 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20 w-full flex flex-col items-center justify-center"
              >
                <div className="text-center w-full flex flex-col items-center justify-center">
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300 flex justify-center">🏫</div>
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors duration-300 text-center leading-tight">
                    University Search
                  </h3>
                  <p className="text-gray-400 text-sm group-hover:text-blue-200 transition-colors duration-300 text-center leading-relaxed">
                    ค้นหามหาวิทยาลัย
                  </p>
                </div>
              </button>
            </div>

            {/* Voice Rewards Section */}
            <div className="max-w-2xl mx-auto mb-8">
              <VoiceRewards />
            </div>

            {/* House Leaderboard Section - Only for Warrior rank or higher, or Admins */}
            {canSeeHouseLeaderboard && (
              <div className="max-w-2xl mx-auto mb-8">
                <HouseLeaderboard />
              </div>
            )}

            {/* Member Leaderboard Section */}
            <div className="max-w-2xl mx-auto">
              <Leaderboard />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
