'use client';

import { useState } from 'react';
import { Socket } from 'socket.io-client';
import PlayerSetup from '../components/PlayerSetup';
import CompanySetup from '../components/CompanySetup';
import InvestmentPhase from '../components/InvestmentPhase';
import Results from '../components/Results';
import MultiplayerLobby from '../components/MultiplayerLobby';
import MultiplayerGame from '../components/MultiplayerGame';

export type Player = {
  id?: string;
  name: string;
  remainingMoney: number;
  investments: Record<string, number>;
  finalValue?: number;
};

export type Company = {
  name: string;
  totalInvestment: number;
  growth: number;
};

export type GameState = {
  players: Player[];
  companies: Company[];
  currentPhase: 'setup' | 'investment' | 'results';
  currentPlayerIndex?: number;
  currentCompanyIndex?: number;
};

const STARTING_MONEY = 100000;
const MAX_GROWTH = 30;

export default function BusinessGame() {
  const [gameMode, setGameMode] = useState<'menu' | 'single' | 'multiplayer'>('menu');
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    companies: [],
    currentPhase: 'setup'
  });
  
  // Multiplayer state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [gameId, setGameId] = useState('');

  const handlePlayerSetup = (players: Player[]) => {
    setGameState(prev => ({
      ...prev,
      players
    }));
  };

  const handleCompanySetup = (companies: Company[]) => {
    setGameState(prev => ({
      ...prev,
      companies
    }));
  };

  const handleInvestmentComplete = (updatedPlayers: Player[], updatedCompanies: Company[]) => {
    // Calculate growth for each company
    const totalAll = updatedCompanies.reduce((sum, company) => sum + company.totalInvestment, 0);
    
    const companiesWithGrowth = updatedCompanies.map(company => ({
      ...company,
      growth: totalAll > 0 ? (company.totalInvestment / totalAll) * MAX_GROWTH : 0
    }));

    setGameState(prev => ({
      ...prev,
      players: updatedPlayers,
      companies: companiesWithGrowth,
      currentPhase: 'results'
    }));
  };

  const resetGame = () => {
    setGameState({
      players: [],
      companies: [],
      currentPhase: 'setup'
    });
  };

  const handleJoinMultiplayerGame = (socket: Socket, playerName: string, gameId: string) => {
    setSocket(socket);
    setPlayerName(playerName);
    setGameId(gameId);
    setGameMode('multiplayer');
  };

  const handleBackToLobby = () => {
    if (socket) {
      socket.disconnect();
    }
    setSocket(null);
    setPlayerName('');
    setGameId('');
    setGameMode('menu');
  };

  // Check if both players and companies are set up
  const isSetupComplete = gameState.players.length > 0 && gameState.companies.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🏢 Business Investment Game
          </h1>
          <p className="text-gray-600 text-lg">
            Strategic investment simulation with {STARTING_MONEY.toLocaleString()}฿ starting capital
          </p>
        </div>

        {/* Game Mode Selection */}
        {gameMode === 'menu' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Choose Game Mode
                </h2>
                <p className="text-gray-600">
                  Play solo or compete with friends in real-time!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Single Player */}
                <div className="bg-blue-50 rounded-xl p-6 text-center hover:bg-blue-100 transition-colors cursor-pointer"
                     onClick={() => setGameMode('single')}>
                  <div className="text-4xl mb-4">🎯</div>
                  <h3 className="text-xl font-bold text-blue-800 mb-2">Single Player</h3>
                  <p className="text-blue-600 text-sm">
                    Practice and learn the game mechanics on your own
                  </p>
                  <ul className="text-xs text-blue-600 mt-3 space-y-1">
                    <li>• Set up your own players</li>
                    <li>• Add companies</li>
                    <li>• Practice strategies</li>
                  </ul>
                </div>

                {/* Multiplayer */}
                <div className="bg-green-50 rounded-xl p-6 text-center hover:bg-green-100 transition-colors cursor-pointer"
                     onClick={() => setGameMode('multiplayer')}>
                  <div className="text-4xl mb-4">🎮</div>
                  <h3 className="text-xl font-bold text-green-800 mb-2">Multiplayer</h3>
                  <p className="text-green-600 text-sm">
                    Compete with friends in real-time multiplayer
                  </p>
                  <ul className="text-xs text-green-600 mt-3 space-y-1">
                    <li>• Join game rooms</li>
                    <li>• Real-time updates</li>
                    <li>• Live competition</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Single Player Mode */}
        {gameMode === 'single' && (
          <>
            {/* Progress Indicator */}
            <div className="mb-8">
              <div className="flex justify-center items-center space-x-4">
                <div className={`flex items-center ${gameState.currentPhase === 'setup' ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${gameState.currentPhase === 'setup' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                    1
                  </div>
                  <span className="ml-2 font-medium">Setup</span>
                </div>
                <div className={`w-16 h-1 ${gameState.currentPhase === 'setup' ? 'bg-gray-200' : 'bg-blue-600'}`}></div>
                <div className={`flex items-center ${gameState.currentPhase === 'investment' ? 'text-blue-600' : gameState.currentPhase === 'results' ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${gameState.currentPhase === 'investment' ? 'bg-blue-600 text-white' : gameState.currentPhase === 'results' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                    2
                  </div>
                  <span className="ml-2 font-medium">Investment</span>
                </div>
                <div className={`w-16 h-1 ${gameState.currentPhase === 'results' ? 'bg-green-600' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center ${gameState.currentPhase === 'results' ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${gameState.currentPhase === 'results' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                    3
                  </div>
                  <span className="ml-2 font-medium">Results</span>
                </div>
              </div>
            </div>

            {/* Game Content */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Single Player Mode</h2>
                <button
                  onClick={() => setGameMode('menu')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  ← Back to Menu
                </button>
              </div>

              {gameState.currentPhase === 'setup' && (
                <div className="space-y-8">
                  <PlayerSetup 
                    onComplete={handlePlayerSetup}
                    startingMoney={STARTING_MONEY}
                  />
                  <CompanySetup 
                    onComplete={handleCompanySetup}
                  />
                  
                  {/* Start Investment Button */}
                  {isSetupComplete && (
                    <div className="text-center pt-6">
                      <button
                        onClick={() => setGameState(prev => ({ ...prev, currentPhase: 'investment' }))}
                        className="px-8 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-lg"
                      >
                        🚀 Start Investment Phase
                      </button>
                      <p className="text-sm text-gray-600 mt-2">
                        {gameState.players.length} players • {gameState.companies.length} companies ready
                      </p>
                    </div>
                  )}
                </div>
              )}

              {gameState.currentPhase === 'investment' && (
                <InvestmentPhase
                  players={gameState.players}
                  companies={gameState.companies}
                  onComplete={handleInvestmentComplete}
                />
              )}

              {gameState.currentPhase === 'results' && (
                <Results
                  players={gameState.players}
                  companies={gameState.companies}
                  onReset={resetGame}
                />
              )}
            </div>
          </>
        )}

        {/* Multiplayer Mode */}
        {gameMode === 'multiplayer' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {!socket ? (
              <MultiplayerLobby onJoinGame={handleJoinMultiplayerGame} />
            ) : (
              <MultiplayerGame
                socket={socket}
                playerName={playerName}
                gameId={gameId}
                onBackToLobby={handleBackToLobby}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
