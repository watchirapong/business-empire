'use client';

import { useState } from 'react';
import StockTradingGame from '../../../components/StockTradingGame';

export default function StockTradingPage() {
  const [gameState, setGameState] = useState('setup');

  const handleBackToHome = () => {
    setGameState('setup');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">📈 Stock Trading Game</h1>
          <p className="text-blue-200 text-lg">Master the art of stock trading and build your portfolio</p>
        </div>
        
        <StockTradingGame onBackToHome={handleBackToHome} />
      </div>
    </div>
  );
}
