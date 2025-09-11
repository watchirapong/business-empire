'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-14 h-8 glass-card rounded-full p-1 opacity-50">
        <div className="w-6 h-6 rounded-full bg-gray-400"></div>
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-8 glass-card rounded-full p-1 transition-all duration-300 hover:scale-105 group"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {/* Toggle background */}
      <div className="absolute inset-0 rounded-full transition-colors duration-300"></div>

      {/* Toggle knob */}
      <div
        className={`relative w-6 h-6 rounded-full transition-all duration-300 transform ${
          theme === 'dark'
            ? 'translate-x-6 bg-orange-400'
            : 'translate-x-0 bg-purple-400'
        } shadow-lg`}
      >
        {/* Icon */}
        <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
          {theme === 'dark' ? '🌙' : '☀️'}
        </div>

        {/* Glow effect */}
        <div className={`absolute inset-0 rounded-full blur-md opacity-50 ${
          theme === 'dark' ? 'bg-orange-400' : 'bg-purple-400'
        }`}></div>
      </div>

      {/* Stars for dark mode */}
      {theme === 'dark' && (
        <>
          <div className="absolute top-1 left-1 w-1 h-1 bg-white rounded-full animate-pulse"></div>
          <div className="absolute bottom-1 left-2 w-0.5 h-0.5 bg-white rounded-full animate-pulse animation-delay-1000"></div>
          <div className="absolute top-2 left-3 w-0.5 h-0.5 bg-white rounded-full animate-pulse animation-delay-2000"></div>
        </>
      )}

      {/* Sun rays for light mode */}
      {theme === 'light' && (
        <>
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-yellow-400 rounded-full animate-pulse"></div>
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-yellow-400 rounded-full animate-pulse animation-delay-1000"></div>
          <div className="absolute left-1 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-yellow-400 rounded-full animate-pulse animation-delay-2000"></div>
          <div className="absolute right-1 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-yellow-400 rounded-full animate-pulse animation-delay-3000"></div>
        </>
      )}
    </button>
  );
};

export default ThemeToggle;
