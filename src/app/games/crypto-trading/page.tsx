'use client';

import { useState } from 'react';
import CryptoTradingGame from '../../../components/CryptoTradingGame';

export default function CryptoTradingPage() {
  const [gameState, setGameState] = useState<'home' | 'crypto'>('crypto');

  const handleBackToHome = () => {
    window.location.href = '/games';
  };

  return (
    <CryptoTradingGame onBackToHome={handleBackToHome} />
  );
}
