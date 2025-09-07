'use client';

import { useState } from 'react';
import { io, Socket } from 'socket.io-client';
import MultiplayerGame from '../../components/MultiplayerGame';

export default function BusinessEmpirePage() {
  const [playerName, setPlayerName] = useState('');
  const [gameId, setGameId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      setError('กรุณาใส่ชื่อผู้เล่น');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      // Connect to the Socket.IO server
      const socketUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : 'https://hamsterhub.fun';
      const newSocket = io(socketUrl);
      
      newSocket.on('connect', () => {
        console.log('Connected to server');
        const roomId = gameId || 'default';
        newSocket.emit('joinGame', { playerName: playerName.trim(), gameId: roomId });
      });

      newSocket.on('connect_error', (err) => {
        console.error('Connection error:', err);
        setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
        setIsConnecting(false);
      });

      newSocket.on('gameState', (gameState) => {
        console.log('Received game state:', gameState);
        setSocket(newSocket);
        setIsJoining(true);
        setIsConnecting(false);
      });

    } catch (err) {
      console.error('Connection error:', err);
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
      setIsConnecting(false);
    }
  };

  const handleBackToLobby = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setIsJoining(false);
    setPlayerName('');
    setGameId('');
    setError('');
  };

  if (isJoining) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-4">🎮 Business Empire Game</h2>
          <p className="text-gray-300 mb-6">
            Welcome, <span className="text-purple-400 font-semibold">{playerName}</span>!
          </p>
          <p className="text-gray-300 mb-6">
            The multiplayer version is currently under development. 
            Please check back later for the full Business Empire experience!
          </p>
          <button
            onClick={handleBackToLobby}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105"
          >
            ← Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 sm:py-12 md:py-16">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-block bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-2 sm:mb-4 tracking-tight leading-tight">
              🏢 BUSINESS EMPIRE
            </h1>
          </div>
          <div className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            <p className="text-lg sm:text-xl md:text-2xl font-semibold mb-1 sm:mb-2">
              เกมจำลองการลงทุนเชิงกลยุทธ์
            </p>
          </div>
        </div>

        {/* Game Lobby */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-blue-500/30">
            <div className="text-center mb-8">
              <div className="text-6xl sm:text-7xl md:text-8xl mb-6 animate-pulse">🏢</div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-300 mb-4">
                เข้าร่วมเกม
              </h2>
              <p className="text-blue-200 text-lg">
                ลงทุนในบริษัทและแข่งขันกับผู้เล่นอื่นแบบเรียลไทม์
              </p>
            </div>

            <div className="space-y-6">
              {/* Player Name Input */}
              <div>
                <label htmlFor="playerName" className="block text-blue-300 font-semibold mb-2">
                  ชื่อผู้เล่น *
                </label>
                <input
                  id="playerName"
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="ใส่ชื่อของคุณ"
                  className="w-full px-4 py-3 bg-blue-900/50 border border-blue-500/30 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                  maxLength={20}
                />
              </div>

              {/* Game ID Input (Optional) */}
              <div>
                <label htmlFor="gameId" className="block text-blue-300 font-semibold mb-2">
                  รหัสเกม (ไม่บังคับ)
                </label>
                <input
                  id="gameId"
                  type="text"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  placeholder="ใส่รหัสเกมเพื่อเข้าร่วมเกมที่มีอยู่"
                  className="w-full px-4 py-3 bg-blue-900/50 border border-blue-500/30 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                  maxLength={20}
                />
                <p className="text-blue-300/70 text-sm mt-1">
                  ปล่อยว่างเพื่อสร้างเกมใหม่
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-900/50 border border-red-500/30 rounded-xl p-4 text-red-200 text-center">
                  {error}
                </div>
              )}

              {/* Join Button */}
              <button
                onClick={handleJoinGame}
                disabled={!playerName.trim() || isConnecting}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl hover:from-blue-500 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 text-lg"
              >
                {isConnecting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    กำลังเชื่อมต่อ...
                  </div>
                ) : (
                  gameId ? 'เข้าร่วมเกม' : 'สร้างเกมใหม่'
                )}
              </button>
            </div>

            {/* Game Features */}
            <div className="mt-8 pt-6 border-t border-blue-500/30">
              <h3 className="text-blue-300 font-semibold mb-4 text-center">คุณสมบัติเกม</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-blue-200 text-sm">
                <div className="flex items-center">
                  <span className="text-blue-400 mr-2">💰</span>
                  <span>เงินทุนเริ่มต้น: 100,000฿</span>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-400 mr-2">🏢</span>
                  <span>ลงทุนในบริษัทต่างๆ</span>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-400 mr-2">📈</span>
                  <span>แข่งขันแบบเรียลไทม์</span>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-400 mr-2">👥</span>
                  <span>เล่นกับเพื่อนหลายคน</span>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-400 mr-2">🎯</span>
                  <span>กลยุทธ์การลงทุน</span>
                </div>
                <div className="flex items-center">
                  <span className="text-blue-400 mr-2">🏆</span>
                  <span>แข่งขันเพื่อเป็นผู้ชนะ</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
