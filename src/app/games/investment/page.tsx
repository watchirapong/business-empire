'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import MultiplayerGame from '../../../components/MultiplayerGame';

interface GameState {
  phase: 'setup' | 'game';
  playerName: string;
  gameId: string;
  socket: Socket | null;
}

export default function BusinessEmpirePage() {
  const { data: session } = useSession();
  const [gameState, setGameState] = useState<GameState>({
    phase: 'setup',
    playerName: '',
    gameId: '',
    socket: null
  });
  const [discordNickname, setDiscordNickname] = useState<string>('');
  const [loadingNickname, setLoadingNickname] = useState(false);

  // Fetch Discord nickname when session is available
  useEffect(() => {
    const fetchDiscordNickname = async () => {
      if (!session?.user) return;
      
      setLoadingNickname(true);
      try {
        const response = await fetch('/api/users/get-server-nickname');
        const data = await response.json();
        
        if (response.ok && data.nickname) {
          setDiscordNickname(data.nickname);
          setGameState(prev => ({ ...prev, playerName: data.nickname }));
        } else {
          // Fallback to Discord username if no nickname
          const username = (session.user as any).username;
          setDiscordNickname(username);
          setGameState(prev => ({ ...prev, playerName: username }));
        }
      } catch (error) {
        console.error('Error fetching Discord nickname:', error);
        // Fallback to Discord username
        const username = (session.user as any).username;
        setDiscordNickname(username);
        setGameState(prev => ({ ...prev, playerName: username }));
      } finally {
        setLoadingNickname(false);
      }
    };

    fetchDiscordNickname();
  }, [session]);

  const handleStartGame = () => {
    if (!gameState.playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    // Create socket connection
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '');
    
    socket.on('connect', () => {
      console.log('Connected to server with ID:', socket.id);
      const gameId = gameState.gameId || 'default';
      socket.emit('joinGame', { 
        playerName: gameState.playerName.trim(), 
        gameId: gameId 
      });
      
      setGameState(prev => ({
        ...prev,
        phase: 'game',
        socket
      }));
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  };

  const handleBackToSetup = () => {
    if (gameState.socket) {
      gameState.socket.disconnect();
    }
    setGameState({
      phase: 'setup',
      playerName: '',
      gameId: '',
      socket: null
    });
  };

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      if (gameState.socket) {
        gameState.socket.disconnect();
      }
    };
  }, [gameState.socket]);

  // Show loading state while session is loading
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-white mb-4">กำลังโหลด...</h1>
            <p className="text-blue-200">กรุณารอสักครู่</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">🏢 Business Empire</h1>
          <p className="text-blue-200 text-lg">เกมจำลองการลงทุนเชิงกลยุทธ์ - ลงทุนในบริษัทและแข่งขันกับผู้เล่นอื่น</p>
        </div>
        
        {gameState.phase === 'setup' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                <span className="mr-2">👥</span> เข้าร่วมเกม
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-cyan-300 mb-2">
                    ชื่อผู้เล่น (จาก Discord - ไม่สามารถแก้ไขได้) *
                  </label>
                  {loadingNickname ? (
                    <div className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
                      กำลังโหลดชื่อจาก Discord...
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={gameState.playerName}
                      readOnly
                      placeholder="กำลังโหลดชื่อจาก Discord..."
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 cursor-not-allowed opacity-75"
                    />
                  )}
                  {discordNickname && (
                    <div className="text-xs text-blue-300 mt-1">
                      💬 ชื่อจาก Discord: {discordNickname}
                    </div>
                  )}
                  {!loadingNickname && gameState.playerName && (
                    <div className="text-xs text-yellow-300 mt-1">
                      🔒 ชื่อไม่สามารถแก้ไขได้ - ใช้ชื่อจาก Discord เท่านั้น
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-cyan-300 mb-2">
                    รหัสเกม (ไม่บังคับ)
                  </label>
                  <input
                    type="text"
                    value={gameState.gameId}
                    onChange={(e) => setGameState(prev => ({ ...prev, gameId: e.target.value }))}
                    placeholder="ใส่รหัสเกมหรือปล่อยว่าง"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="mt-6">
                                          <button
                            onClick={handleStartGame}
                            disabled={!gameState.playerName.trim() || loadingNickname}
                            className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                          >
                            {loadingNickname ? '⏳ กำลังโหลดชื่อจาก Discord...' : '🚀 เข้าร่วมเกมด้วยชื่อ Discord'}
                          </button>
              </div>
            </div>
          </div>
        )}
        
        {gameState.phase === 'game' && gameState.socket && (
          <MultiplayerGame 
            socket={gameState.socket}
            playerName={gameState.playerName}
            gameId={gameState.gameId || 'default'}
            onBackToLobby={handleBackToSetup}
          />
        )}
      </div>
    </div>
  );
}
