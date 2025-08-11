'use client';

import { useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface MultiplayerLobbyProps {
  onJoinGame: (socket: Socket, playerName: string, gameId: string) => void;
}

export default function MultiplayerLobby({ onJoinGame }: MultiplayerLobbyProps) {
  const [playerName, setPlayerName] = useState('');
  const [gameId, setGameId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      // Use the current domain for Socket.IO connection (works with ngrok)
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      const host = window.location.hostname;
      const port = window.location.port || (protocol === 'https:' ? '443' : '80');
      const socketUrl = `${protocol}//${host}${port !== '80' && port !== '443' ? ':' + port : ''}`;
      
      const socket = io(socketUrl);
      
      socket.on('connect', () => {
        console.log('Connected to server');
        const roomId = gameId || 'default';
        socket.emit('joinGame', { playerName: playerName.trim(), gameId: roomId });
      });

      socket.on('connect_error', (err) => {
        console.error('Connection error:', err);
        setError('Failed to connect to server. Please try again.');
        setIsConnecting(false);
      });

      socket.on('gameState', (gameState) => {
        console.log('Received game state:', gameState);
        onJoinGame(socket, playerName.trim(), gameId || 'default');
      });

    } catch (err) {
      console.error('Connection error:', err);
      setError('Failed to connect to server');
      setIsConnecting(false);
    }
  };

  const generateGameId = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGameId(id);
  };

  return (
    <div className="text-center">
      <div className="text-4xl sm:text-5xl md:text-6xl mb-4 sm:mb-6 animate-bounce">🎮</div>
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 sm:mb-4 neon-text">
        🚀 JOIN BATTLE ARENA
      </h2>
      <p className="text-purple-300 text-sm sm:text-base md:text-lg mb-6 sm:mb-8">
        Connect with warriors and dominate the financial battlefield!
      </p>

      <div className="space-y-4 sm:space-y-6 max-w-md mx-auto">
        {/* Player Name */}
        <div>
          <label className="block text-xs sm:text-sm font-bold text-cyan-300 mb-2 sm:mb-3 uppercase tracking-wide">
            ⚔️ WARRIOR NAME *
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your warrior name"
            className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-black/50 border border-purple-500/50 rounded-lg sm:rounded-xl text-white placeholder-purple-300/50 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all duration-300 font-semibold text-sm sm:text-base"
            maxLength={20}
          />
        </div>

        {/* Game ID */}
        <div>
          <label className="block text-xs sm:text-sm font-bold text-cyan-300 mb-2 sm:mb-3 uppercase tracking-wide">
            🏰 BATTLE ARENA ID
          </label>
          <div className="flex space-x-2 sm:space-x-3">
            <input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value.toUpperCase())}
              placeholder="Enter arena ID or leave empty for default"
              className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-black/50 border border-purple-500/50 rounded-lg sm:rounded-xl text-white placeholder-purple-300/50 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all duration-300 font-semibold text-sm sm:text-base"
              maxLength={6}
            />
            <button
              onClick={generateGameId}
              className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg sm:rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all duration-300 font-bold border border-purple-400/50 hover:border-purple-300 text-sm sm:text-base"
              title="Generate random arena ID"
            >
              🎲
            </button>
          </div>
          <p className="text-xs text-purple-300/70 mt-2">
            Share this ID with your allies to join the same battle arena
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/50 border border-red-500/50 rounded-lg sm:rounded-xl p-3 sm:p-4 animate-pulse">
            <p className="text-red-300 text-xs sm:text-sm font-semibold">⚠️ {error}</p>
          </div>
        )}

        {/* Join Button */}
        <button
          onClick={handleJoinGame}
          disabled={isConnecting || !playerName.trim()}
          className={`w-full py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg md:text-xl transition-all duration-300 transform hover:scale-105 ${
            isConnecting || !playerName.trim()
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 shadow-2xl shadow-purple-500/50 glow'
          }`}
        >
          {isConnecting ? (
            <div className="flex items-center justify-center space-x-2 sm:space-x-3">
              <div className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6 border-2 sm:border-3 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm sm:text-base">ESTABLISHING CONNECTION...</span>
            </div>
          ) : (
            '⚡ ENTER BATTLE ARENA ⚡'
          )}
        </button>

        {/* Instructions */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg sm:rounded-2xl p-4 sm:p-6 border border-blue-500/30">
          <h4 className="font-bold text-blue-300 mb-2 sm:mb-3 text-sm sm:text-base md:text-lg">🎯 BATTLE INSTRUCTIONS:</h4>
          <ul className="text-xs sm:text-sm text-blue-200 space-y-1 sm:space-y-2">
            <li className="flex items-center">
              <span className="text-blue-400 mr-2">⚔️</span>
              <span>Enter your warrior name and join a battle arena</span>
            </li>
            <li className="flex items-center">
              <span className="text-blue-400 mr-2">🏢</span>
              <span>Host can add companies to invest in</span>
            </li>
            <li className="flex items-center">
              <span className="text-blue-400 mr-2">💰</span>
              <span>All players invest simultaneously</span>
            </li>
            <li className="flex items-center">
              <span className="text-blue-400 mr-2">🏆</span>
              <span>Highest final value wins the battle!</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
