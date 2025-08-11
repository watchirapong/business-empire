'use client';

import { useState, useEffect } from 'react';
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
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-8">
        <div className="text-4xl mb-4">🎮</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Join Multiplayer Game
        </h2>
        <p className="text-gray-600">
          Connect with friends and play together in real-time!
        </p>
      </div>

      <div className="space-y-6">
        {/* Player Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Name *
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={20}
          />
        </div>

        {/* Game ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Game Room ID
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value.toUpperCase())}
              placeholder="Enter game ID or leave empty for default"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={6}
            />
            <button
              onClick={generateGameId}
              className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              title="Generate random game ID"
            >
              🎲
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Share this ID with friends to join the same game
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Join Button */}
        <button
          onClick={handleJoinGame}
          disabled={isConnecting || !playerName.trim()}
          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
            isConnecting || !playerName.trim()
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isConnecting ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Connecting...</span>
            </div>
          ) : (
            '🚀 Join Game'
          )}
        </button>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">How to play:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Enter your name and join a game room</li>
            <li>• Share the game ID with friends</li>
            <li>• Wait for all players to join</li>
            <li>• Add companies and start investing!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
