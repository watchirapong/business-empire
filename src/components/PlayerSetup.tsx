'use client';

import { useState } from 'react';
import { Player } from '../app/page';

interface PlayerSetupProps {
  onComplete: (players: Player[]) => void;
  startingMoney: number;
}

export default function PlayerSetup({ onComplete, startingMoney }: PlayerSetupProps) {
  const [numPlayers, setNumPlayers] = useState<number>(2);
  const [playerNames, setPlayerNames] = useState<string[]>(['', '']);
  const [currentStep, setCurrentStep] = useState<'count' | 'names'>('count');

  const handlePlayerCountChange = (count: number) => {
    setNumPlayers(count);
    setPlayerNames(Array(count).fill('').map((_, i) => playerNames[i] || ''));
  };

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const handleContinue = () => {
    if (currentStep === 'count') {
      setCurrentStep('names');
    } else {
      const validNames = playerNames.filter(name => name.trim() !== '');
      if (validNames.length === numPlayers) {
        const players: Player[] = validNames.map((name, index) => ({
          id: `player-${index + 1}`,
          name: name.trim(),
          remainingMoney: startingMoney,
          investments: {}
        }));
        onComplete(players);
      }
    }
  };

  const canContinue = currentStep === 'count' ? numPlayers >= 1 : 
    playerNames.slice(0, numPlayers).every(name => name.trim() !== '');

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          👥 Player Setup
        </h2>
        <p className="text-gray-600">
          {currentStep === 'count' 
            ? 'How many players will participate?' 
            : 'Enter player names'
          }
        </p>
      </div>

      {currentStep === 'count' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[2, 3, 4, 5, 6, 7, 8].map(count => (
              <button
                key={count}
                onClick={() => handlePlayerCountChange(count)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  numPlayers === count
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-gray-600">Players</div>
              </button>
            ))}
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-blue-800">
                  Starting Capital: {startingMoney.toLocaleString()}฿
                </div>
                <div className="text-sm text-blue-600">
                  Each player will start with this amount
                </div>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </div>
        </div>
      )}

      {currentStep === 'names' && (
        <div className="space-y-4">
          <div className="grid gap-4">
            {Array.from({ length: numPlayers }, (_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                  {i + 1}
                </div>
                <input
                  type="text"
                  value={playerNames[i]}
                  onChange={(e) => handleNameChange(i, e.target.value)}
                  placeholder={`Player ${i + 1} name`}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ))}
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">✅</div>
              <div>
                <div className="font-semibold text-green-800">
                  Ready to start investing!
                </div>
                <div className="text-sm text-green-600">
                  Each player has {startingMoney.toLocaleString()}฿ to invest
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            canContinue
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {currentStep === 'count' ? 'Continue' : 'Start Game'}
        </button>
      </div>
    </div>
  );
}
