'use client';

import React from 'react';

interface ModernCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  variant?: 'default' | 'glass' | 'gradient' | 'neon';
  onClick?: () => void;
}

const ModernCard: React.FC<ModernCardProps> = ({
  children,
  className = '',
  hover = true,
  glow = false,
  variant = 'glass',
  onClick
}) => {
  const baseClasses = 'rounded-3xl p-6 relative overflow-hidden transition-all duration-500';

  const variantClasses = {
    default: 'bg-white/5 border border-white/10',
    glass: 'glass-card',
    gradient: 'bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 border border-purple-500/20',
    neon: 'bg-black/20 border border-orange-500/30 shadow-lg shadow-orange-500/10'
  };

  const hoverClasses = hover
    ? 'transform hover:scale-105 hover:-translate-y-2 hover:shadow-2xl hover:shadow-orange-500/20'
    : '';

  const glowClasses = glow
    ? 'hover:shadow-orange-500/30 hover:shadow-2xl'
    : '';

  const clickableClasses = onClick
    ? 'cursor-pointer active:scale-95 active:translate-y-0'
    : '';

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${glowClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
    >
      {/* Background gradient overlay for interactive effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500"></div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default ModernCard;
