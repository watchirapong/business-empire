'use client';

import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";

export default function UserProfile() {
  const { data: session, status } = useSession();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogin = () => {
    signIn("discord", { callbackUrl: "/" });
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  const getDiscordAvatarUrl = (userId: string, avatar: string) => {
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
  };

  if (status === "loading") {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gray-600 rounded-full animate-pulse"></div>
        <div className="w-20 h-4 bg-gray-600 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <button
        onClick={handleLogin}
        className="flex items-center space-x-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
        <span>Login with Discord</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsProfileOpen(!isProfileOpen)}
        className="flex items-center space-x-3 bg-black/20 backdrop-blur-sm rounded-lg p-2 border border-white/20 hover:bg-white/10 transition-colors duration-200"
      >
        <img
          src={getDiscordAvatarUrl((session.user as any).id, (session.user as any).avatar)}
          alt="Profile"
          className="w-8 h-8 rounded-full"
        />
        <div className="text-left">
          <div className="text-white font-medium text-sm">
            {(session.user as any).username}
          </div>
          <div className="text-gray-300 text-xs">
            #{session.user?.name}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-white transition-transform duration-200 ${
            isProfileOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isProfileOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-900/95 backdrop-blur-sm rounded-lg border border-white/20 shadow-xl z-50">
          <div className="p-4">
            <div className="flex items-center space-x-3 mb-4">
              <img
                src={getDiscordAvatarUrl((session.user as any).id, (session.user as any).avatar)}
                alt="Profile"
                className="w-12 h-12 rounded-full"
              />
              <div>
                <div className="text-white font-semibold">
                  {(session.user as any).username}
                </div>
                <div className="text-gray-300 text-sm">
                  #{session.user?.name}
                </div>
                <div className="text-gray-400 text-xs">
                  Discord User
                </div>
              </div>
            </div>
            
            <div className="border-t border-white/10 pt-4 space-y-2">
              <div className="text-gray-300 text-sm">
                <span className="text-gray-400">Email:</span> {session.user?.email}
              </div>
              <div className="text-gray-300 text-sm">
                <span className="text-gray-400">User ID:</span> {(session.user as any).id}
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 mt-4">
              <button
                onClick={handleLogout}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
