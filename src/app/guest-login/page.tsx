'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GuestLoginPage() {
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      alert('Please enter your name');
      return;
    }

    setLoading(true);
    
    // Store guest name in sessionStorage for the assessment page
    sessionStorage.setItem('guestName', guestName.trim());
    sessionStorage.setItem('isGuest', 'true');
    
    // Redirect to assessment page
    router.push('/assessment');
  };

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

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-12 animate-slide-in-bottom">
            <div className="text-7xl mb-6 animate-bounce-in">👤</div>
            <h1 className="text-4xl sm:text-5xl font-black mb-6 gradient-text">Guest Login</h1>
            <p className="text-xl text-gray-300 mb-4 leading-relaxed">
              Enter your name to join the assessment as a guest
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              You can participate in Phase 1 assessment without creating an account
            </p>
          </div>

          <div className="glass-card rounded-3xl p-8 border border-orange-500/30 animate-slide-in-bottom">
            <form onSubmit={handleGuestLogin} className="space-y-6">
              <div>
                <label htmlFor="guestName" className="block text-white font-medium mb-3 text-lg">
                  Your Name:
                </label>
                <input
                  type="text"
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full p-4 glass-card border border-orange-500/30 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-400 transition-all duration-300 text-lg"
                  placeholder="Enter your name here..."
                  maxLength={50}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !guestName.trim()}
                className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 disabled:from-gray-500 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-orange-500/25 transition-all duration-200 cursor-pointer hover:scale-105 flex items-center justify-center space-x-3"
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Joining...</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">🚀</span>
                    <span>Join Assessment</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-3">Want to save your progress?</p>
                <button
                  onClick={() => router.push('/auth/signin')}
                  className="text-orange-400 hover:text-orange-300 font-semibold transition-colors duration-200"
                >
                  Sign in with Discord →
                </button>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <button
              onClick={() => router.push('/')}
              className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center justify-center space-x-2 mx-auto"
            >
              <span>←</span>
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}