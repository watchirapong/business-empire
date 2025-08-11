'use client';

import { useState } from 'react';
import { Player, Company } from '@/app/page';

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

  // Add null checks to prevent errors
  if (!players || players.length === 0 || !companies || companies.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-2xl mb-4">⏳</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Loading...</h3>
        <p className="text-gray-600">Setting up the investment phase</p>
      </div>
    );
  }

  const currentPlayer = players[currentPlayerIndex];
  const currentCompany = companies[currentCompanyIndex];

  // Additional safety check
  if (!currentPlayer || !currentCompany) {
    return (
      <div className="text-center py-8">
        <div className="text-2xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Setup Error</h3>
        <p className="text-gray-600">Please ensure players and companies are properly configured</p>
      </div>
    );
  }

  const currentPlayerInvestments = investments[currentPlayer.name] || {};
  const totalInvested = Object.values(currentPlayerInvestments).reduce((sum, amount) => sum + amount, 0);
  const remainingMoney = 100000 - totalInvested;

  const handleInvestmentChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue >= 0 && numValue <= remainingMoney) {
      setCurrentInvestment(value);
    }
  };

  const handleInvest = () => {
    const amount = parseFloat(currentInvestment) || 0;
    if (amount >= 0 && amount <= remainingMoney) {
      const newInvestments = {
        ...investments,
        [currentPlayer.name]: {
          ...currentPlayerInvestments,
          [currentCompany.name]: amount
        }
      };
      setInvestments(newInvestments);
      setCurrentInvestment('');

      // Move to next company or player
      if (currentCompanyIndex < companies.length - 1) {
        setCurrentCompanyIndex(currentCompanyIndex + 1);
      } else if (currentPlayerIndex < players.length - 1) {
        setCurrentPlayerIndex(currentPlayerIndex + 1);
        setCurrentCompanyIndex(0);
      } else {
        // All investments complete
        const updatedPlayers = players.map(player => ({
          ...player,
          investments: newInvestments[player.name] || {},
          remainingMoney: 100000 - Object.values(newInvestments[player.name] || {}).reduce((sum, amount) => sum + amount, 0)
        }));

        const updatedCompanies = companies.map(company => ({
          ...company,
          totalInvestment: players.reduce((sum, player) => sum + (newInvestments[player.name]?.[company.name] || 0), 0)
        }));

        onComplete(updatedPlayers, updatedCompanies);
      }
    }
  };

  const handleSkip = () => {
    const newInvestments = {
      ...investments,
      [currentPlayer.name]: {
        ...currentPlayerInvestments,
        [currentCompany.name]: 0
      }
    };
    setInvestments(newInvestments);

    // Move to next company or player
    if (currentCompanyIndex < companies.length - 1) {
      setCurrentCompanyIndex(currentCompanyIndex + 1);
    } else if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setCurrentCompanyIndex(0);
    } else {
      // All investments complete
      const updatedPlayers = players.map(player => ({
        ...player,
        investments: newInvestments[player.name] || {},
        remainingMoney: 100000 - Object.values(newInvestments[player.name] || {}).reduce((sum, amount) => sum + amount, 0)
      }));

      const updatedCompanies = companies.map(company => ({
        ...company,
        totalInvestment: players.reduce((sum, player) => sum + (newInvestments[player.name]?.[company.name] || 0), 0)
      }));

      onComplete(updatedPlayers, updatedCompanies);
    }
  };

  const progress = ((currentPlayerIndex * companies.length + currentCompanyIndex + 1) / (players.length * companies.length)) * 100;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          💸 Investment Phase
        </h2>
        <p className="text-gray-600">
          Players invest their capital in companies
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div 
          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="text-center text-sm text-gray-600">
        {currentPlayerIndex + 1} of {players.length} players • {currentCompanyIndex + 1} of {companies.length} companies
      </div>

      {/* Current Investment */}
      <div className="bg-white border-2 border-blue-200 rounded-xl p-6">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">💰</div>
          <h3 className="text-xl font-bold text-gray-800">
            {currentPlayer.name} invests in {currentCompany.name}
          </h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">
                {remainingMoney.toLocaleString()}฿
              </div>
              <div className="text-sm text-blue-600">Available</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {totalInvested.toLocaleString()}฿
              </div>
              <div className="text-sm text-green-600">Invested</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600">
                {companies.length - currentCompanyIndex - 1}
              </div>
              <div className="text-sm text-purple-600">Companies Left</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Investment Amount (฿)
              </label>
              <input
                type="number"
                value={currentInvestment}
                onChange={(e) => handleInvestmentChange(e.target.value)}
                placeholder="0"
                min="0"
                max={remainingMoney}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg"
              />
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleSkip}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Skip (Invest 0฿)
              </button>
              <button
                onClick={handleInvest}
                disabled={!currentInvestment || parseFloat(currentInvestment) < 0 || parseFloat(currentInvestment) > remainingMoney}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                  currentInvestment && parseFloat(currentInvestment) >= 0 && parseFloat(currentInvestment) <= remainingMoney
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                }`}
              >
                Invest
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Investment Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-3">Current Investments by {currentPlayer.name}:</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {companies.map(company => (
            <div key={company.name} className="text-sm">
              <span className="font-medium">{company.name}:</span>
              <span className="ml-1">
                {(currentPlayerInvestments[company.name] || 0).toLocaleString()}฿
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
