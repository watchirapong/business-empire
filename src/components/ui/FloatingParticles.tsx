'use client';

import React from 'react';

type ParticleColor = 'orange' | 'purple' | 'pink' | 'blue';

interface FloatingParticlesProps {
  count?: number;
  colors?: ParticleColor[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const FloatingParticles: React.FC<FloatingParticlesProps> = ({
  count = 10,
  colors = ['orange', 'purple', 'pink', 'blue'],
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  const colorClasses: Record<ParticleColor, string> = {
    orange: 'bg-orange-400/30',
    purple: 'bg-purple-400/30',
    pink: 'bg-pink-400/30',
    blue: 'bg-blue-400/30'
  };

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {Array.from({ length: count }).map((_, i) => {
        const color = colors[Math.floor(Math.random() * colors.length)] as ParticleColor;
        const delay = Math.random() * 5;
        const duration = 3 + Math.random() * 4;

        return (
          <div
            key={i}
            className={`absolute ${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-float`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`
            }}
          ></div>
        );
      })}
    </div>
  );
};

export default FloatingParticles;
