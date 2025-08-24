'use client';

import { useState } from 'react';
import UnifiedTradingDashboard from '../../../components/UnifiedTradingDashboard';

export default function UnifiedTradingPage() {
  const [gameState, setGameState] = useState<'home' | 'trading'>('trading');

  const handleBackToHome = () => {
    window.location.href = '/games';
  };

  return (
    <UnifiedTradingDashboard onBackToHome={handleBackToHome} />
  );
}
