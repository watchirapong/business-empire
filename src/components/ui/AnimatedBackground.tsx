'use client';

import React from 'react';

interface AnimatedBackgroundProps {
  variant?: 'default' | 'particles' | 'geometric' | 'waves';
  className?: string;
  children?: React.ReactNode;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  variant = 'default',
  className = '',
  children
}) => {
  const renderBackground = () => {
    switch (variant) {
      case 'particles':
        return (
          <>
            {/* Floating particles */}
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={`absolute w-2 h-2 bg-orange-400/20 rounded-full animate-float`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${3 + Math.random() * 4}s`
                }}
              ></div>
            ))}
          </>
        );

      case 'geometric':
        return (
          <>
            {/* Geometric shapes */}
            <div className="absolute top-20 left-20 w-32 h-32 border border-orange-500/20 rotate-45 animate-morphing"></div>
            <div className="absolute bottom-32 right-16 w-24 h-24 border border-purple-500/20 rotate-12 animate-morphing animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/3 w-16 h-16 border border-pink-500/20 rotate-30 animate-morphing animation-delay-4000"></div>
          </>
        );

      case 'waves':
        return (
          <>
            {/* Wave patterns */}
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-orange-500/5 to-transparent animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-purple-500/5 to-transparent animate-pulse animation-delay-2000"></div>
            </div>
          </>
        );

      default:
        return (
          <>
            {/* Default floating orbs */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.1),transparent_50%)]"></div>
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse animate-morphing"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000 animate-morphing animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse delay-500 animate-morphing animation-delay-4000"></div>
          </>
        );
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {renderBackground()}
      {children && (
        <div className="relative z-10">
          {children}
        </div>
      )}
    </div>
  );
};

export default AnimatedBackground;
