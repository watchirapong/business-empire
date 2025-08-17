'use client';

import { useState } from 'react';
import { Player, Company } from '../types';

interface InvestmentPhaseProps {
  players: Player[];
  companies: Company[];
  onComplete: (updatedPlayers: Player[], updatedCompanies: Company[]) => void;
}

export default function InvestmentPhase({ players, companies, onComplete }: InvestmentPhaseProps) {
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentCompanyIndex, setCurrentCompanyIndex] = useState(0);
  const [investments, setInvestments] = useState<Record<string, Record<string, number>>>({});
  const [currentInvestment, setCurrentInvestment] = useState<string>('');

  const currentPlayer = players[currentPlayerIndex];
  const currentCompany = companies[currentCompanyIndex];
  const remainingMoney = currentPlayer.remainingMoney;

  const handleInvestmentChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue <= remainingMoney) {
      setCurrentInvestment(value);
    }
  };

  const handleSubmitInvestment = () => {
    const amount = parseFloat(currentInvestment) || 0;
    
    // Update investments
    if (!investments[currentPlayer.id!]) {
      investments[currentPlayer.id!] = {};
    }
    investments[currentPlayer.id!][currentCompany.name] = amount;
    setInvestments({ ...investments });

    // Update player's remaining money
    const updatedPlayers = [...players];
    updatedPlayers[currentPlayerIndex] = {
      ...updatedPlayers[currentPlayerIndex],
      remainingMoney: remainingMoney - amount
    };

    // Update company's total investment
    const updatedCompanies = [...companies];
    updatedCompanies[currentCompanyIndex] = {
      ...updatedCompanies[currentCompanyIndex],
      totalInvestment: updatedCompanies[currentCompanyIndex].totalInvestment + amount
    };

    // Move to next company or player
    if (currentCompanyIndex < companies.length - 1) {
      setCurrentCompanyIndex(currentCompanyIndex + 1);
    } else if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setCurrentCompanyIndex(0);
    } else {
      // All investments complete
      onComplete(updatedPlayers, updatedCompanies);
      return;
    }

    setCurrentInvestment('');
  };

  const canSubmit = parseFloat(currentInvestment) >= 0 && parseFloat(currentInvestment) <= remainingMoney;

  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center">
        <span className="mr-2">💰</span> เฟสการลงทุน
      </h3>

      <div className="bg-white/10 rounded-lg p-6 border border-white/20 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 className="text-lg font-semibold text-white">ผู้เล่นปัจจุบัน</h4>
            <p className="text-blue-300">{currentPlayer.name}</p>
          </div>
          <div className="text-right">
            <h4 className="text-lg font-semibold text-white">เงินคงเหลือ</h4>
            <p className="text-green-400 font-bold text-xl">{remainingMoney.toLocaleString()}฿</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h5 className="text-md font-semibold text-white mb-2">บริษัท: {currentCompany.name}</h5>
          <div className="flex items-center space-x-4">
            <input
              type="number"
              value={currentInvestment}
              onChange={(e) => handleInvestmentChange(e.target.value)}
              placeholder="0"
              min="0"
              max={remainingMoney}
              className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSubmitInvestment}
              disabled={!canSubmit}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
            >
              ลงทุน
            </button>
          </div>
          {parseFloat(currentInvestment) > remainingMoney && (
            <p className="text-red-400 text-sm mt-2">⚠️ คุณกำลังลงทุนมากกว่าเงินที่มี!</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h4 className="font-semibold text-white mb-3">ความคืบหน้าผู้เล่น</h4>
          <div className="space-y-2">
            {players.map((player, index) => (
              <div key={player.id} className="flex items-center justify-between">
                <span className={`text-sm ${index === currentPlayerIndex ? 'text-blue-400 font-semibold' : 'text-gray-300'}`}>
                  {player.name}
                </span>
                <span className="text-sm text-green-400">{player.remainingMoney.toLocaleString()}฿</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h4 className="font-semibold text-white mb-3">การลงทุนในบริษัท</h4>
          <div className="space-y-2">
            {companies.map((company, index) => (
              <div key={company.name} className="flex items-center justify-between">
                <span className={`text-sm ${index === currentCompanyIndex ? 'text-green-400 font-semibold' : 'text-gray-300'}`}>
                  {company.name}
                </span>
                <span className="text-sm text-blue-400">{company.totalInvestment.toLocaleString()}฿</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
