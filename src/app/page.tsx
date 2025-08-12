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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>

      <div className="relative z-10 py-4 px-3 sm:py-8 sm:px-4">
        <div className="max-w-6xl mx-auto">
          {/* Game Title */}
          <div className="text-center mb-6 sm:mb-12">
            <div className="inline-block bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-2 sm:mb-4 tracking-tight leading-tight">
                🏢 BUSINESS<br className="sm:hidden" /> EMPIRE
              </h1>
            </div>
            <div className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              <p className="text-sm sm:text-xl md:text-2xl font-semibold mb-1 sm:mb-2">
                เกมจำลองการลงทุนเชิงกลยุทธ์
              </p>
            </div>
            <div className="text-cyan-300 text-xs sm:text-lg font-mono">
              เงินทุนเริ่มต้น: {STARTING_MONEY.toLocaleString()}฿
            </div>
          </div>

          {/* Game Mode Selection */}
          {gameMode === 'menu' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-black/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-purple-500/30 shadow-2xl p-6 sm:p-8 md:p-12">
                <div className="text-center mb-8 sm:mb-12">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-4">
                    🎮 เลือกโหมดเกม
                  </h2>
                  <p className="text-purple-300 text-sm sm:text-lg md:text-xl">
                    เลือกเส้นทางสู่การครองโลกการเงิน!
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                  {/* Single Player */}
                  <div 
                    className="group relative bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-blue-500/30 hover:border-blue-400/60 transition-all duration-500 cursor-pointer transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25"
                    onClick={() => setGameMode('single')}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                      <div className="text-4xl sm:text-5xl md:text-6xl mb-4 sm:mb-6 animate-pulse">🎯</div>
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-300 mb-2 sm:mb-4 group-hover:text-blue-200 transition-colors">
                        เล่นคนเดียว
                      </h3>
                      <p className="text-blue-200 text-sm sm:text-base md:text-lg mb-4 sm:mb-6">
                        ฝึกฝนศิลปะการลงทุนในสภาพแวดล้อมที่ควบคุมได้
                      </p>
                      <div className="space-y-1 sm:space-y-2 text-blue-300/80 text-xs sm:text-sm">
                        <div className="flex items-center">
                          <span className="text-blue-400 mr-2">⚡</span>
                          <span>ตั้งค่าผู้เล่นของคุณเอง</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-blue-400 mr-2">🏢</span>
                          <span>เพิ่มบริษัท</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-blue-400 mr-2">📈</span>
                          <span>ฝึกกลยุทธ์</span>
                        </div>
                      </div>
                      <div className="mt-4 sm:mt-6 text-center">
                        <div className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-lg sm:rounded-xl group-hover:from-blue-500 group-hover:to-cyan-500 transition-all duration-300 transform group-hover:scale-105 text-sm sm:text-base">
                          เริ่มเล่นคนเดียว
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Multiplayer */}
                  <div 
                    className="group relative bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-purple-500/30 hover:border-purple-400/60 transition-all duration-500 cursor-pointer transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25"
                    onClick={() => setGameMode('multiplayer')}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                      <div className="text-4xl sm:text-5xl md:text-6xl mb-4 sm:mb-6 animate-bounce">🎮</div>
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-purple-300 mb-2 sm:mb-4 group-hover:text-purple-200 transition-colors">
                        เล่นหลายคน
                      </h3>
                      <p className="text-purple-200 text-sm sm:text-base md:text-lg mb-4 sm:mb-6">
                        แข่งขันกับผู้เล่นจริงในการต่อสู้แบบเรียลไทม์
                      </p>
                      <div className="space-y-1 sm:space-y-2 text-purple-300/80 text-xs sm:text-sm">
                        <div className="flex items-center">
                          <span className="text-purple-400 mr-2">🔥</span>
                          <span>เข้าร่วมห้องเกม</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-purple-400 mr-2">⚡</span>
                          <span>อัปเดตแบบเรียลไทม์</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-purple-400 mr-2">🏆</span>
                          <span>การแข่งขันสด</span>
                        </div>
                      </div>
                      <div className="mt-4 sm:mt-6 text-center">
                        <div className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg sm:rounded-xl group-hover:from-purple-500 group-hover:to-pink-500 transition-all duration-300 transform group-hover:scale-105 text-sm sm:text-base">
                          เข้าร่วมการต่อสู้
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Single Player Mode */}
          {gameMode === 'single' && (
            <>
              {/* Progress Indicator */}
              <div className="mb-6 sm:mb-8">
                <div className="flex justify-center items-center space-x-2 sm:space-x-4 md:space-x-6">
                  <div className={`flex items-center ${gameState.currentPhase === 'setup' ? 'text-cyan-400' : 'text-gray-500'}`}>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm sm:text-base md:text-lg font-bold ${gameState.currentPhase === 'setup' ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/50' : 'bg-gray-700 text-gray-400'}`}>
                      1
                    </div>
                    <span className="ml-2 sm:ml-3 font-bold text-sm sm:text-base md:text-lg">ตั้งค่า</span>
                  </div>
                  <div className={`w-8 sm:w-12 md:w-20 h-1 rounded-full ${gameState.currentPhase === 'setup' ? 'bg-gray-600' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`}></div>
                  <div className={`flex items-center ${gameState.currentPhase === 'investment' ? 'text-purple-400' : gameState.currentPhase === 'results' ? 'text-green-400' : 'text-gray-500'}`}>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm sm:text-base md:text-lg font-bold ${gameState.currentPhase === 'investment' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50' : gameState.currentPhase === 'results' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/50' : 'bg-gray-700 text-gray-400'}`}>
                      2
                    </div>
                    <span className="ml-2 sm:ml-3 font-bold text-sm sm:text-base md:text-lg">การลงทุน</span>
                  </div>
                  <div className={`w-8 sm:w-12 md:w-20 h-1 rounded-full ${gameState.currentPhase === 'results' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gray-600'}`}></div>
                  <div className={`flex items-center ${gameState.currentPhase === 'results' ? 'text-green-400' : 'text-gray-500'}`}>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm sm:text-base md:text-lg font-bold ${gameState.currentPhase === 'results' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/50' : 'bg-gray-700 text-gray-400'}`}>
                      3
                    </div>
                    <span className="ml-2 sm:ml-3 font-bold text-sm sm:text-base md:text-lg">ผลลัพธ์</span>
                  </div>
                </div>
              </div>

              {/* Game Content */}
              <div className="bg-black/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-purple-500/30 shadow-2xl p-4 sm:p-6 md:p-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">🎯 โหมดเล่นคนเดียว</h2>
                  <button
                    onClick={() => setGameMode('menu')}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg sm:rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 font-bold border border-gray-600 hover:border-gray-500 text-sm sm:text-base"
                  >
                    ← กลับไปเมนู
                  </button>
                </div>

                {gameState.currentPhase === 'setup' && (
                  <div className="space-y-6 sm:space-y-8">
                    <PlayerSetup 
                      onComplete={handlePlayerSetup}
                      startingMoney={STARTING_MONEY}
                    />
                    <CompanySetup 
                      onComplete={handleCompanySetup}
                    />
                    
                    {/* Start Investment Button */}
                    {isSetupComplete && (
                      <div className="text-center pt-6 sm:pt-8">
                        <button
                          onClick={() => setGameState(prev => ({ ...prev, currentPhase: 'investment' }))}
                          className="px-6 sm:px-8 md:px-12 py-4 sm:py-5 md:py-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl sm:rounded-2xl font-bold text-lg sm:text-xl md:text-2xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-purple-500/50"
                        >
                          🚀 เริ่มเฟสการลงทุน
                        </button>
                        <p className="text-purple-300 text-sm sm:text-base md:text-lg mt-3 sm:mt-4 font-semibold">
                          พร้อมแล้ว {gameState.players.length} ผู้เล่น • {gameState.companies.length} บริษัท
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
            <div className="bg-black/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-purple-500/30 shadow-2xl p-4 sm:p-6 md:p-8">
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
    </div>
  );
}
