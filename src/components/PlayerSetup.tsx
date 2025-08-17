'use client';

import { useState } from 'react';
import { Player } from '../types';

interface PlayerSetupProps {
  onComplete: (players: Player[]) => void;
  startingMoney: number;
}

export default function PlayerSetup({ onComplete, startingMoney }: PlayerSetupProps) {
  const [players, setPlayers] = useState<Player[]>([
    { name: '', remainingMoney: startingMoney, investments: {} }
  ]);

  const addPlayer = () => {
    setPlayers([...players, { name: '', remainingMoney: startingMoney, investments: {} }]);
  };

  const removePlayer = (index: number) => {
    if (players.length > 1) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const updatePlayer = (index: number, field: keyof Player, value: string | number) => {
    const updatedPlayers = [...players];
    updatedPlayers[index] = { ...updatedPlayers[index], [field]: value };
    setPlayers(updatedPlayers);
  };

  const handleComplete = () => {
    const validPlayers = players.filter(player => player.name.trim() !== '');
    if (validPlayers.length > 0) {
      onComplete(validPlayers);
    }
  };

  const canComplete = players.some(player => player.name.trim() !== '');

  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center">
        <span className="mr-2">👥</span> ตั้งค่าผู้เล่น
      </h3>
      
      <div className="space-y-4">
        {players.map((player, index) => (
          <div key={index} className="bg-white/10 rounded-lg p-4 border border-white/20">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {index + 1}
              </div>
              <input
                type="text"
                value={player.name}
                onChange={(e) => updatePlayer(index, 'name', e.target.value)}
                placeholder={`ชื่อผู้เล่น ${index + 1}`}
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="text-green-400 font-bold text-lg">
                {startingMoney.toLocaleString()}฿
              </div>
              {players.length > 1 && (
                <button
                  onClick={() => removePlayer(index)}
                  className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 hover:scale-105"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-6">
        <button
          onClick={addPlayer}
          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105"
        >
          ➕ เพิ่มผู้เล่น
        </button>
        
        <button
          onClick={handleComplete}
          disabled={!canComplete}
          className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
        >
          ✅ เสร็จสิ้น
        </button>
      </div>
    </div>
  );
}
