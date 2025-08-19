'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import SavedServerMemberData from '@/components/SavedServerMemberData';
import HamsterCoinBalance from '@/components/HamsterCoinBalance';

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = () => {
    setIsLoading(true);
    signOut({ callbackUrl: '/' });
  };

  const getDiscordAvatarUrl = (userId: string, avatar: string) => {
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
  };

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
          <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-8">
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
                <h1 className="text-3xl font-bold text-white mb-2">
                  {(session.user as any).username}
                </h1>
                <p className="text-gray-300 text-lg mb-4">
                  #{session.user?.name}
                </p>
                <p className="text-gray-400 mb-6">
                  Discord User • HamsterHub Member
                </p>
                
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white/5 rounded-lg p-4 border border-orange-500/20">
                    <div className="text-2xl font-bold text-orange-400">0</div>
                    <div className="text-gray-400 text-sm">Games Played</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-orange-500/20">
                    <div className="text-2xl font-bold text-orange-400">0</div>
                    <div className="text-gray-400 text-sm">Total Score</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-orange-500/20">
                    <div className="text-2xl font-bold text-orange-400">0</div>
                    <div className="text-gray-400 text-sm">Achievements</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4">
                  
                  <button
                    onClick={() => router.push('/shop')}
                    className="bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
                  >
                    <span className="text-xl">🛒</span>
                    <span>Visit Shop</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <span className="text-xl">🚪</span>
                    <span>{isLoading ? 'Logging out...' : 'Logout'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Hamster Coin Balance */}
          <HamsterCoinBalance />

          {/* Discord Server Member Data */}
          <SavedServerMemberData />

          {/* Recent Activity */}
          <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-3">
              <span className="text-2xl">📊</span>
              <span>Recent Activity</span>
            </h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg border border-orange-500/10">
                <div className="text-2xl">🎉</div>
                <div className="flex-1">
                  <div className="text-white font-semibold">Welcome to HamsterHub!</div>
                  <div className="text-gray-400 text-sm">You joined the HamsterHub community</div>
                </div>
                <div className="text-gray-500 text-sm">Just now</div>
              </div>
              <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg border border-orange-500/10">
                <div className="text-2xl">🔐</div>
                <div className="flex-1">
                  <div className="text-white font-semibold">Account Connected</div>
                  <div className="text-gray-400 text-sm">Discord account successfully linked</div>
                </div>
                <div className="text-gray-500 text-sm">Just now</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
