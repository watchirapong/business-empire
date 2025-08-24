'use client';

import { useState } from 'react';
import ForexTradingGame from '../../../components/ForexTradingGame';

export default function ForexTradingPage() {
  const [gameState, setGameState] = useState<'home' | 'forex'>('forex');

  const handleBackToHome = () => {
    window.location.href = '/games';
  };

  return (
    <ForexTradingGame onBackToHome={handleBackToHome} />
  );
}
