'use client';

import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Leaderboard from '@/components/Leaderboard';
import HouseLeaderboard from '@/components/HouseLeaderboard';
import { isAdmin } from '@/lib/admin-config';
import dynamic from 'next/dynamic';
import UserQuickMenu from '@/components/UserQuickMenu';

import VoiceRewards from '@/components/VoiceRewards';
import LoginTracker from '@/components/LoginTracker';
// Removed: import HamsterCoinBalance from '@/components/HamsterCoinBalance';

// Dynamically import ThemeToggle to avoid prerendering issues
const ThemeToggle = dynamic(() => import('@/components/ThemeToggle'), {
  ssr: false,
  loading: () => (
    <div className="w-14 h-8 glass-card rounded-full p-1 opacity-50">
      <div className="w-6 h-6 rounded-full bg-gray-400"></div>
    </div>
  )
});

export default function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [userRank, setUserRank] = useState<string>('None');
  const [isProfileOpen, setIsProfileOpen] = useState(false);


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

  // Close on Escape key for accessibility and reliability
  useEffect(() => {
    if (!isProfileOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsProfileOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isProfileOpen]);


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
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.1),transparent_50%)]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse animate-morphing"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000 animate-morphing animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse delay-500 animate-morphing animation-delay-4000"></div>

        {/* Additional floating elements for depth */}
        <div className="absolute top-1/3 right-1/3 w-32 h-32 bg-purple-500/5 rounded-full blur-xl animate-float"></div>
        <div className="absolute bottom-1/3 left-1/3 w-24 h-24 bg-pink-500/5 rounded-full blur-xl animate-float animation-delay-2000"></div>
        <div className="absolute top-2/3 right-1/4 w-16 h-16 bg-blue-500/5 rounded-full blur-lg animate-float animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 sm:py-12 md:py-16">
        {/* Modern Header with Glassmorphism */}
        <div className="flex justify-between items-center mb-12 animate-slide-in-bottom">
          <div className="flex items-center space-x-6">
            <div className="w-14 h-14 glass-card rounded-2xl p-2 animate-bounce-in">
              <img
                src="/hamsterhub-logo.png"
                alt="HamsterHub Logo"
                className="w-full h-full object-contain animate-float"
              />
            </div>
            <div className="text-3xl font-bold gradient-text-primary animate-slide-in-left stagger-1">
              HamsterHub
            </div>
          </div>

          <div className="flex items-center space-x-6 animate-slide-in-bottom stagger-2">
            {/* Theme Toggle */}
            <div className="animate-bounce-in">
              <ThemeToggle />
            </div>

            {session ? (
              <div className="flex items-center space-x-4">
                {/* Profile trigger + new drawer */}
                <div className="relative group">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-3 glass-card rounded-xl p-3 border border-orange-500/30 hover:border-orange-400/50 transition-all duration-300 cursor-pointer"
                    aria-haspopup="dialog"
                    aria-expanded={isProfileOpen}
                  >
                    <div className="relative">
                      <img
                        src={getDiscordAvatarUrl((session.user as any).id, (session.user as any).avatar)}
                        alt="Profile"
                        className="w-10 h-10 rounded-full ring-2 ring-orange-500/50 group-hover:ring-orange-400 transition-all duration-300"
                      />
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-black"></span>
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="text-white font-semibold text-sm">{(session.user as any).username}</div>
                      <div className="text-gray-300 text-xs">#{session.user?.name}</div>
                    </div>
                  </button>
                </div>

                {/* Admin Panel Button - Only show for admin */}
                {isCurrentUserAdmin && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 cursor-pointer hover:scale-105 shadow-lg hover:shadow-purple-500/25 flex items-center space-x-2"
                  >
                    <span className="text-xl">👑</span>
                    <span>Admin</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => router.push('/api/auth/signin?callbackUrl=/')}
                className="btn-modern bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-orange-500/25 flex items-center space-x-3 group animate-bounce-in stagger-3"
              >
                <span className="text-xl group-hover:animate-bounce">🔐</span>
                <span>เข้าสู่ระบบ</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* New Drawer Component (mobile and desktop) */}
        {session && (
          <UserQuickMenu
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            onProfile={() => {
              setIsProfileOpen(false);
              router.push(`/profile/${(session.user as any).id}`);
            }}
            onLogout={async () => {
              setIsProfileOpen(false);
              await new Promise(resolve => setTimeout(resolve, 100));
              try {
                await signOut({ callbackUrl: '/' });
              } catch (e) {
                console.error(e);
              }
            }}
            username={(session.user as any).username}
            handle={session.user?.name || null}
            avatarUrl={getDiscordAvatarUrl((session.user as any).id, (session.user as any).avatar)}
          />
        )}

        {/* Modern Hero Section */}
        <div className="text-center mb-20 animate-slide-in-bottom stagger-1">
          <div className="relative">
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black mb-8 tracking-tight leading-tight gradient-text animate-pulse">
              Hamstellar
            </h1>
            {/* Decorative elements */}
            <div className="absolute -top-4 -left-4 w-8 h-8 bg-orange-500/20 rounded-full blur-xl animate-float"></div>
            <div className="absolute -bottom-4 -right-4 w-6 h-6 bg-purple-500/20 rounded-full blur-lg animate-float animation-delay-2000"></div>
            <div className="absolute top-1/2 -left-8 w-4 h-4 bg-pink-500/20 rounded-full blur-md animate-float animation-delay-4000"></div>
          </div>
          {!session && (
            <p className="text-xl sm:text-2xl text-gray-300 mb-8 animate-slide-in-bottom stagger-2 max-w-3xl mx-auto leading-relaxed">
              The ultimate platform for HamsterHub members featuring{' '}
              <span className="gradient-text-primary font-semibold">business games</span>,{' '}
              <span className="gradient-text-primary font-semibold">trading simulators</span>, and{' '}
              <span className="gradient-text-primary font-semibold">exclusive community features</span>
            </p>
          )}
        </div>

        {/* Modern Menu Section - Only show when logged in */}
        {session && (
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">

              {/* Modern Hamster Shop Card */}
              <button
                onClick={() => handleMenuClick('/shop')}
                className="group glass-card rounded-3xl p-8 hover:border-orange-400/60 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 w-full flex flex-col items-center justify-center animate-slide-in-bottom stagger-1 relative overflow-hidden"
              >
                {/* Background gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Floating particles */}
                <div className="absolute top-4 right-4 w-2 h-2 bg-orange-400/40 rounded-full animate-ping animation-delay-1000"></div>
                <div className="absolute bottom-6 left-6 w-1.5 h-1.5 bg-orange-300/60 rounded-full animate-ping animation-delay-2000"></div>

                <div className="text-center w-full flex flex-col items-center justify-center relative z-10">
                  <div className="text-7xl mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 flex justify-center animate-bounce-in">🛒</div>
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-orange-300 transition-colors duration-300 text-center leading-tight">
                    Hamster Shop
                  </h3>
                  <p className="text-gray-400 text-sm group-hover:text-orange-200 transition-colors duration-300 text-center leading-relaxed">
                    ระบบร้านค้าใหม่
                  </p>
                </div>
              </button>

              {/* Modern Gacha Card */}
              <button
                onClick={() => handleMenuClick('/gacha')}
                className="group glass-card rounded-3xl p-8 hover:border-purple-400/60 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 w-full flex flex-col items-center justify-center animate-slide-in-bottom stagger-2 relative overflow-hidden"
              >
                {/* Background gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Floating particles */}
                <div className="absolute top-6 left-4 w-3 h-3 bg-purple-400/40 rounded-full animate-bounce animation-delay-500"></div>
                <div className="absolute bottom-4 right-6 w-2 h-2 bg-pink-300/60 rounded-full animate-bounce animation-delay-1500"></div>

                <div className="text-center w-full flex flex-col items-center justify-center relative z-10">
                  <div className="text-7xl mb-6 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500 flex justify-center animate-bounce-in">🎰</div>
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors duration-300 text-center leading-tight">
                    Gacha
                  </h3>
                  <p className="text-gray-400 text-sm group-hover:text-purple-200 transition-colors duration-300 text-center leading-relaxed">
                    ลุ้นรางวัลสุดพิเศษ
                  </p>
                </div>
              </button>

              {/* Modern Hamsterboard Card */}
              <button
                onClick={() => handleMenuClick('/hamsterboard')}
                className="group glass-card rounded-3xl p-8 hover:border-green-400/60 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 w-full flex flex-col items-center justify-center animate-slide-in-bottom stagger-3 relative overflow-hidden"
              >
                {/* Background gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Floating particles */}
                <div className="absolute top-4 left-6 w-2.5 h-2.5 bg-green-400/40 rounded-full animate-pulse animation-delay-700"></div>
                <div className="absolute bottom-6 right-4 w-1.5 h-1.5 bg-emerald-300/60 rounded-full animate-pulse animation-delay-1200"></div>

                <div className="text-center w-full flex flex-col items-center justify-center relative z-10">
                  <div className="text-7xl mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 flex justify-center animate-bounce-in">🐹</div>
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-green-300 transition-colors duration-300 text-center leading-tight">
                    Hamsterboard
                  </h3>
                  <p className="text-gray-400 text-sm group-hover:text-green-200 transition-colors duration-300 text-center leading-relaxed">
                    ทำภารกิจ รับรางวัล
                  </p>
                </div>
              </button>

              {/* Modern University Search Card */}
              <button
                onClick={() => handleMenuClick('/university-search')}
                className="group glass-card rounded-3xl p-8 hover:border-blue-400/60 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 w-full flex flex-col items-center justify-center animate-slide-in-bottom stagger-4 relative overflow-hidden"
              >
                {/* Background gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Floating particles */}
                <div className="absolute top-6 right-6 w-2 h-2 bg-blue-400/40 rounded-full animate-float animation-delay-800"></div>
                <div className="absolute bottom-4 left-4 w-1.5 h-1.5 bg-indigo-300/60 rounded-full animate-float animation-delay-1300"></div>

                <div className="text-center w-full flex flex-col items-center justify-center relative z-10">
                  <div className="text-7xl mb-6 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 flex justify-center animate-bounce-in">🏫</div>
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors duration-300 text-center leading-tight">
                    University Search
                  </h3>
                  <p className="text-gray-400 text-sm group-hover:text-blue-200 transition-colors duration-300 text-center leading-relaxed">
                    ค้นหามหาวิทยาลัย
                  </p>
                </div>
              </button>

              {/* Modern Game Space Card */}
              <button
                onClick={() => handleMenuClick('/game-space')}
                className="group glass-card rounded-3xl p-8 hover:border-pink-400/60 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 w-full flex flex-col items-center justify-center animate-slide-in-bottom stagger-5 relative overflow-hidden"
              >
                {/* Background gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-rose-500/10 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Floating particles */}
                <div className="absolute top-5 left-5 w-2.5 h-2.5 bg-pink-400/40 rounded-full animate-bounce animation-delay-900"></div>
                <div className="absolute bottom-5 right-5 w-1.5 h-1.5 bg-rose-300/60 rounded-full animate-bounce animation-delay-1400"></div>

                <div className="text-center w-full flex flex-col items-center justify-center relative z-10">
                  <div className="text-7xl mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 flex justify-center animate-bounce-in">🎮</div>
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-pink-300 transition-colors duration-300 text-center leading-tight">
                    Game Space
                  </h3>
                  <p className="text-gray-400 text-sm group-hover:text-pink-200 transition-colors duration-300 text-center leading-relaxed">
                    แชร์เกม itch.io
                  </p>
                </div>
              </button>

              {/* Modern Assessment Card */}
              <button
                onClick={() => handleMenuClick('/assessment')}
                className="group glass-card rounded-3xl p-8 hover:border-cyan-400/60 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 w-full flex flex-col items-center justify-center animate-slide-in-bottom stagger-6 relative overflow-hidden"
              >
                {/* Background gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-teal-500/10 to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Floating particles */}
                <div className="absolute top-4 right-4 w-2 h-2 bg-cyan-400/40 rounded-full animate-ping animation-delay-1000"></div>
                <div className="absolute bottom-6 left-6 w-1.5 h-1.5 bg-teal-300/60 rounded-full animate-ping animation-delay-2000"></div>

                <div className="text-center w-full flex flex-col items-center justify-center relative z-10">
                  <div className="text-7xl mb-6 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500 flex justify-center animate-bounce-in">📝</div>
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors duration-300 text-center leading-tight">
                    Assessment
                  </h3>
                  <p className="text-gray-400 text-sm group-hover:text-cyan-200 transition-colors duration-300 text-center leading-relaxed">
                    ระบบประเมินทักษะ
                  </p>
                </div>
              </button>

              {/* Guest Login Card */}
              <button
                onClick={() => handleMenuClick('/guest-login')}
                className="group glass-card rounded-3xl p-8 hover:border-orange-400/60 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 w-full flex flex-col items-center justify-center animate-slide-in-bottom stagger-7 relative overflow-hidden"
              >
                {/* Background gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Floating particles */}
                <div className="absolute top-4 right-4 w-2 h-2 bg-orange-400/40 rounded-full animate-ping animation-delay-1000"></div>
                <div className="absolute bottom-6 left-6 w-1.5 h-1.5 bg-orange-300/60 rounded-full animate-ping animation-delay-2000"></div>

                <div className="text-center w-full flex flex-col items-center justify-center relative z-10">
                  <div className="text-7xl mb-6 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500 flex justify-center animate-bounce-in">👤</div>
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-orange-300 transition-colors duration-300 text-center leading-tight">
                    Guest Login
                  </h3>
                  <p className="text-gray-400 text-sm group-hover:text-orange-200 transition-colors duration-300 text-center leading-relaxed">
                    เข้าร่วมแบบไม่ต้องสมัครสมาชิก
                  </p>
                </div>
              </button>
            </div>

            {/* Voice Rewards Section */}
            <div className="max-w-2xl mx-auto mb-8">
              <VoiceRewards />
            </div>

            {/* Login Tracker Section */}
            <div className="max-w-2xl mx-auto mb-8">
              <LoginTracker />
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
