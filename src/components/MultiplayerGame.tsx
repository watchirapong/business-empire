'use client';

import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface Player {
  id: string;
  name: string;
  remainingMoney: number;
  investments: Record<string, number>;
  finalValue?: number;
}

interface Company {
  name: string;
  totalInvestment: number;
  growth: number;
}

interface GameState {
  players: Player[];
  companies: Company[];
  phase: 'waiting' | 'investment' | 'results';
  currentPlayerIndex: number;
  currentCompanyIndex: number;
  investments: Record<string, Record<string, number>>;
  readyPlayers: Set<string>;
  submittedPlayers: Set<string>;
  hostId?: string;
}

interface MultiplayerGameProps {
  socket: Socket;
  playerName: string;
  gameId: string;
  onBackToLobby: () => void;
}

export default function MultiplayerGame({ socket, playerName, gameId, onBackToLobby }: MultiplayerGameProps) {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    companies: [],
    phase: 'waiting',
    currentPlayerIndex: 0,
    currentCompanyIndex: 0,
    investments: {},
    readyPlayers: new Set(),
    submittedPlayers: new Set()
  });
  const [newCompanyName, setNewCompanyName] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  
  // New state for simultaneous investing
  const [playerInvestments, setPlayerInvestments] = useState<Record<string, number>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // Reconnect to game if page was reloaded
    const savedGameId = localStorage.getItem('currentGameId');
    const savedPlayerName = localStorage.getItem('currentPlayerName');
    
    if (savedGameId && savedPlayerName && savedGameId === gameId) {
      // Rejoin the game automatically
      socket.emit('joinGame', { playerName: savedPlayerName, gameId: savedGameId });
    } else {
      // Save current game info for potential reconnection
      localStorage.setItem('currentGameId', gameId);
      localStorage.setItem('currentPlayerName', playerName);
    }
    
    // Listen for game state updates
    socket.on('gameState', (state: GameState) => {
      console.log('Received game state:', state);
      console.log('Host ID from server:', state.hostId);
      console.log('Current socket ID:', socket.id);
      console.log('Is current player host?', state.hostId === socket.id);
      
      // Convert arrays back to Sets for proper functionality
      const processedState = {
        ...state,
        submittedPlayers: new Set(state.submittedPlayers || []),
        readyPlayers: new Set(state.readyPlayers || []),
        hostId: state.hostId
      };
      
      setGameState(processedState);
      
      // Initialize player investments when investment phase starts
      if (processedState.phase === 'investment' && processedState.companies.length > 0) {
        // Try to load saved investments from localStorage
        const savedInvestments = localStorage.getItem(`game_${gameId}_investments`);
        let initialInvestments: Record<string, number> = {};
        
        if (savedInvestments) {
          try {
            initialInvestments = JSON.parse(savedInvestments);
            // Only use saved investments for companies that still exist
            processedState.companies.forEach(company => {
              if (!(company.name in initialInvestments)) {
                initialInvestments[company.name] = 0;
              }
            });
          } catch (error) {
            console.error('Error loading saved investments:', error);
            processedState.companies.forEach(company => {
              initialInvestments[company.name] = 0;
            });
          }
        } else {
          processedState.companies.forEach(company => {
            initialInvestments[company.name] = 0;
          });
        }
        
        setPlayerInvestments(initialInvestments);
        setHasSubmitted(false);
      }
    });

    socket.on('playerJoined', ({ player, totalPlayers }) => {
      console.log('Player joined:', player, 'Total:', totalPlayers);
      addMessage(`${player.name} joined the game! (${totalPlayers} players)`);
    });

    socket.on('playerLeft', ({ playerId, totalPlayers }) => {
      console.log('Player left:', playerId, 'Total:', totalPlayers);
      addMessage(`A player left the game (${totalPlayers} players remaining)`);
    });

    socket.on('companyAdded', ({ company, totalCompanies }) => {
      console.log('Company added:', company, 'Total:', totalCompanies);
      addMessage(`${company.name} was added! (${totalCompanies} companies)`);
    });

    socket.on('companyDeleted', ({ company, totalCompanies }) => {
      console.log('Company deleted:', company, 'Total:', totalCompanies);
      addMessage(`${company.name} was deleted! (${totalCompanies} companies remaining)`);
    });

    socket.on('investmentStarted', (state: GameState) => {
      console.log('Investment started:', state);
      
      const processedState = {
        ...state,
        submittedPlayers: new Set(state.submittedPlayers || []),
        readyPlayers: new Set(state.readyPlayers || []),
        hostId: state.hostId
      };
      
      setGameState(processedState);
      addMessage('🎉 Investment phase started! All players can invest simultaneously!');
    });

    socket.on('playerSubmitted', ({ playerId, game }) => {
      console.log('Player submitted:', playerId);
      
      const processedState = {
        ...game,
        submittedPlayers: new Set(game.submittedPlayers || []),
        readyPlayers: new Set(game.readyPlayers || []),
        hostId: game.hostId
      };
      
      setGameState(processedState);
      const player = game.players.find((p: Player) => p.id === playerId);
      if (player) {
        addMessage(`${player.name} submitted their investments!`);
      }
    });

    socket.on('allPlayersSubmitted', (state: GameState) => {
      console.log('All players submitted:', state);
      
      const processedState = {
        ...state,
        submittedPlayers: new Set(state.submittedPlayers || []),
        readyPlayers: new Set(state.readyPlayers || []),
        hostId: state.hostId
      };
      
      setGameState(processedState);
      addMessage('🎯 All players have submitted! Calculating results...');
    });

    socket.on('gameReset', (state: GameState) => {
      console.log('Game reset:', state);
      
      const processedState = {
        ...state,
        submittedPlayers: new Set(state.submittedPlayers || []),
        readyPlayers: new Set(state.readyPlayers || []),
        hostId: state.hostId
      };
      
      setGameState(processedState);
      addMessage('Game has been reset');
      setPlayerInvestments({});
      setHasSubmitted(false);
      
      // Clear saved investments from localStorage
      localStorage.removeItem(`game_${gameId}_investments`);
    });

    socket.on('playerKicked', ({ playerName, totalPlayers }) => {
      console.log('Player kicked:', playerName, 'Total:', totalPlayers);
      addMessage(`${playerName} was kicked from the game (${totalPlayers} players remaining)`);
    });

    socket.on('kickedFromGame', ({ message }) => {
      console.log('Kicked from game:', message);
      alert(message);
      onBackToLobby();
    });

    socket.on('gameDeleted', ({ message }) => {
      console.log('Game deleted:', message);
      addMessage(message);
      setTimeout(() => {
        onBackToLobby();
      }, 2000);
    });

    // Handle error messages
    socket.on('error', ({ message }) => {
      console.error('Server error:', message);
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(''), 5000); // Clear error after 5 seconds
    });

    return () => {
      socket.off('gameState');
      socket.off('playerJoined');
      socket.off('playerLeft');
      socket.off('companyAdded');
      socket.off('companyDeleted');
      socket.off('investmentStarted');
      socket.off('playerSubmitted');
      socket.off('allPlayersSubmitted');
      socket.off('gameReset');
      socket.off('playerKicked');
      socket.off('kickedFromGame');
      socket.off('gameDeleted');
      socket.off('error');
    };
  }, [socket, gameId, playerName, onBackToLobby]);

  const addMessage = (message: string) => {
    setMessages(prev => [...prev, message]);
  };

  const handleAddCompany = () => {
    if (newCompanyName.trim()) {
      socket.emit('addCompany', { companyName: newCompanyName.trim(), gameId });
      setNewCompanyName('');
    }
  };

  const handleDeleteCompany = (companyName: string) => {
    console.log('Delete button clicked for company:', companyName);
    console.log('Current socket ID:', socket.id);
    console.log('Current game state:', gameState);
    socket.emit('deleteCompany', { companyName, gameId });
  };

  const handleStartInvestment = () => {
    socket.emit('startInvestment', { gameId });
  };

  const handleInvestmentChange = (companyName: string, amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    const newInvestments = {
      ...playerInvestments,
      [companyName]: numAmount
    };
    setPlayerInvestments(newInvestments);
    
    // Save to localStorage for persistence
    localStorage.setItem(`game_${gameId}_investments`, JSON.stringify(newInvestments));
  };

  const handleSubmitAllInvestments = () => {
    socket.emit('submitAllInvestments', { investments: playerInvestments, gameId });
    setHasSubmitted(true);
  };



  const handleResetGame = () => {
    socket.emit('resetGame', { gameId });
  };

  const handleResetCurrentGame = () => {
    if (window.confirm('Are you sure you want to reset this game? This will clear all players, companies, and investments.')) {
      socket.emit('resetGame', { gameId });
    }
  };

  const handleKickPlayer = (playerId: string, playerName: string) => {
    if (window.confirm(`Are you sure you want to kick ${playerName} from the game?`)) {
      socket.emit('kickPlayer', { playerId, gameId });
    }
  };

  // Calculate total investment amount
  const totalInvestmentAmount = Object.values(playerInvestments).reduce((sum, amount) => sum + amount, 0);
  const currentPlayer = gameState.players.find(p => p.id === socket.id);
  const remainingMoney = currentPlayer ? currentPlayer.remainingMoney : 100000;
  const canSubmit = totalInvestmentAmount <= remainingMoney && !hasSubmitted;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
      {/* Game Header */}
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">🏢 Business Empire</h1>
          </div>
          <p className="text-purple-200 text-lg">
            Room: <span className="font-mono bg-purple-800 px-2 py-1 rounded">{gameId}</span> • 
            Players: <span className="text-yellow-400 font-bold">{gameState.players.length}</span> • 
            Companies: <span className="text-green-400 font-bold">{gameState.companies.length}</span>
          </p>
        </div>

        {/* Main Game Container */}
        <div className="bg-black/20 backdrop-blur-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Game Status Bar */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <h2 className="text-white font-bold text-lg">
                  {gameState.phase === 'waiting' ? '🔄 Waiting Room' : 
                   gameState.phase === 'investment' ? '💰 Investment Phase' : '🏆 Results'}
                </h2>
              </div>
              <div className="flex items-center space-x-3">
                {gameState.hostId === socket.id && gameState.phase === 'waiting' && (
                  <button
                    onClick={handleResetCurrentGame}
                    className="px-3 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-lg transition-all duration-200 hover:scale-105 text-sm font-semibold"
                    title="Reset current game"
                  >
                    🔄 Reset
                  </button>
                )}
                <button
                  onClick={onBackToLobby}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 hover:scale-105"
                >
                  ← Back to Lobby
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-500/20 border border-red-400/50 rounded-xl p-4 animate-pulse">
                <div className="flex items-center">
                  <div className="text-red-400 mr-3 text-xl">⚠️</div>
                  <span className="text-red-200 font-medium">{errorMessage}</span>
                </div>
              </div>
            )}

            {/* Players Section */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <span className="mr-2">👥</span> Players
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {gameState.players.map((player, index) => (
                  <div key={player.id} className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all duration-200 group relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 
                          index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' : 
                          index === 2 ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gradient-to-r from-blue-400 to-purple-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-white font-semibold">{player.name}</div>
                          <div className="flex items-center space-x-2 text-xs">
                            {player.id === socket.id && (
                              <span className="bg-blue-500 text-white px-2 py-1 rounded-full">You</span>
                            )}
                            {gameState.hostId === player.id && (
                              <span className="bg-yellow-500 text-black px-2 py-1 rounded-full">👑 Host</span>
                            )}
                            {gameState.submittedPlayers?.has(player.id) && (
                              <span className="bg-green-500 text-white px-2 py-1 rounded-full">✓ Ready</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold text-lg">
                          {player.remainingMoney.toLocaleString()}฿
                        </div>
                        <div className="text-gray-400 text-xs">Capital</div>
                      </div>
                    </div>
                    
                    {/* Kick Button (only for host, not for themselves) */}
                    {gameState.hostId === socket.id && player.id !== socket.id && (
                      <button
                        onClick={() => handleKickPlayer(player.id, player.name)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
                        title={`Kick ${player.name}`}
                      >
                        🚫
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Companies Section */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <span className="mr-2">🏢</span> Companies
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gameState.companies.map((company, index) => (
                  <div key={company.name} className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all duration-200 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-white font-semibold">{company.name}</div>
                          <div className="text-gray-400 text-xs">Company</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="text-green-400 font-bold">
                            {company.totalInvestment.toLocaleString()}฿
                          </div>
                          <div className="text-gray-400 text-xs">Investment</div>
                        </div>
                        {gameState.hostId === socket.id && gameState.phase === 'waiting' && (
                          <button
                            onClick={() => handleDeleteCompany(company.name)}
                            className="opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
                            title="Delete company"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Company Section */}
            {(gameState.phase === 'waiting' || gameState.phase === 'investment') && gameState.hostId === socket.id && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <span className="mr-2">➕</span> Add Company
                </h3>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Enter company name..."
                    className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                  <button
                    onClick={handleAddCompany}
                    disabled={!newCompanyName.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Start Game Button */}
            {gameState.phase === 'waiting' && gameState.players.length > 0 && (
              <div className="text-center">
                {gameState.hostId === socket.id ? (
                  <button
                    onClick={handleStartInvestment}
                    className="px-12 py-6 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-bold text-xl rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl animate-pulse"
                  >
                    🚀 Launch Investment Phase
                  </button>
                ) : (
                  <div className="bg-white/10 rounded-2xl p-8 border border-white/20">
                    <div className="text-4xl mb-4">⏳</div>
                    <div className="text-white text-xl font-semibold">Waiting for host to start the game...</div>
                    <div className="text-gray-400 mt-2">
                      Ready with {gameState.players.length} players
                      {gameState.companies.length > 0 && ` and ${gameState.companies.length} companies`}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Investment Phase */}
            {gameState.phase === 'investment' && currentPlayer && (
              <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-6 border border-white/10">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <span className="mr-3">💰</span> Investment Phase
                </h3>
                
                {gameState.companies.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">🏢</div>
                    <div className="text-white text-xl font-semibold mb-2">No Companies Available</div>
                    <div className="text-gray-400 mb-4">
                      The host needs to add companies before you can invest.
                    </div>
                    {gameState.hostId === socket.id && (
                      <div className="text-yellow-400 text-sm">
                        💡 Use the &quot;Add Company&quot; section above to add companies for players to invest in.
                      </div>
                    )}
                  </div>
                ) : !hasSubmitted ? (
                  <div className="space-y-6">
                    {/* Budget Display */}
                    <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-semibold">Your Budget</div>
                          <div className="text-green-400 font-bold text-2xl">{remainingMoney.toLocaleString()}฿</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-semibold">Total Investment</div>
                          <div className={`font-bold text-2xl ${totalInvestmentAmount > remainingMoney ? 'text-red-400' : 'text-green-400'}`}>
                            {totalInvestmentAmount.toLocaleString()}฿
                          </div>
                        </div>
                      </div>
                      
                      {totalInvestmentAmount > remainingMoney && (
                        <div className="mt-4 bg-red-500/20 border border-red-400/50 rounded-lg p-3">
                          <div className="text-red-200 text-sm">⚠️ You&apos;re investing more than you have! Please adjust your investments.</div>
                        </div>
                      )}
                    </div>

                    {/* Investment Inputs */}
                    <div className="space-y-4">
                      {gameState.companies.map((company) => (
                        <div key={company.name} className="bg-white/10 rounded-xl p-6 border border-white/20">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <div className="text-white font-semibold text-lg">{company.name}</div>
                              <div className="text-gray-400 text-sm">Current: {playerInvestments[company.name]?.toLocaleString() || '0'}฿</div>
                            </div>
                          </div>
                          <div className="flex space-x-3">
                            <input
                              type="number"
                              value={playerInvestments[company.name] || ''}
                              onChange={(e) => handleInvestmentChange(company.name, e.target.value)}
                              onBlur={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                handleInvestmentChange(company.name, value.toString());
                              }}
                              placeholder="0"
                              min="0"
                              max={remainingMoney}
                              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                              onClick={() => handleInvestmentChange(company.name, '0')}
                              className="px-4 py-3 bg-gray-500/50 hover:bg-gray-500/70 text-white rounded-lg transition-all duration-200"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Submit Button */}
                    <div className="text-center pt-6">
                      <button
                        onClick={handleSubmitAllInvestments}
                        disabled={!canSubmit}
                        className="px-12 py-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-2xl font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 shadow-2xl"
                      >
                        🎯 Submit All Investments
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-6xl mb-4">⏳</div>
                    <div className="text-white text-xl font-semibold">Waiting for other players...</div>
                    <div className="text-gray-400 mt-2">
                      {gameState.submittedPlayers?.size || 0} of {gameState.players.length} players have submitted
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Results Phase */}
            {gameState.phase === 'results' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-3xl font-bold text-white mb-4">🏆 Game Results</h3>
                  <button
                    onClick={handleResetGame}
                    className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                  >
                    🎮 Play Again
                  </button>
                </div>
                
                {/* Winner */}
                {gameState.players.length > 0 && (
                  <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/50 rounded-xl p-6">
                    <div className="text-center">
                      <div className="text-6xl mb-4">👑</div>
                      <h4 className="text-2xl font-bold text-yellow-400">
                        Winner: {gameState.players.reduce((prev, current) => 
                          (current.finalValue || 0) > (prev.finalValue || 0) ? current : prev
                        ).name}
                      </h4>
                    </div>
                  </div>
                )}

                {/* Company Analysis */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h4 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <span className="mr-3">📊</span> Company Analysis
                  </h4>
                  
                  <div className="space-y-4">
                    {gameState.companies.map((company) => {
                      const totalInvestment = company.totalInvestment;
                      const growthPercentage = company.growth;
                      const playerInvestments = gameState.players.map(player => {
                        const invested = gameState.investments[player.id]?.[company.name] || 0;
                        const finalValue = invested * (1 + growthPercentage / 100);
                        return {
                          player,
                          invested,
                          finalValue,
                          percentage: totalInvestment > 0 ? (invested / totalInvestment) * 100 : 0
                        };
                      });

                      return (
                        <div key={company.name} className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-6 border border-white/10">
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="text-xl font-bold text-white">{company.name}</h5>
                            <div className="text-right">
                              <div className="text-sm text-gray-400">Total Investment</div>
                              <div className="text-green-400 font-bold text-xl">
                                {totalInvestment.toLocaleString()}฿
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="text-center">
                              <div className="text-gray-400 text-sm">Growth Rate</div>
                              <div className={`font-bold text-xl ${growthPercentage > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                {growthPercentage.toFixed(1)}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-gray-400 text-sm">Market Share</div>
                              <div className="text-blue-400 font-bold text-xl">
                                {gameState.companies.reduce((sum, c) => sum + c.totalInvestment, 0) > 0 
                                  ? ((totalInvestment / gameState.companies.reduce((sum, c) => sum + c.totalInvestment, 0)) * 100).toFixed(1)
                                  : '0'}%
                              </div>
                            </div>
                          </div>

                          {/* Player Investments */}
                          <div className="bg-white/5 rounded-lg p-4">
                            <h6 className="font-semibold text-white mb-3">Player Investments:</h6>
                            <div className="space-y-2">
                              {playerInvestments.map(({ player, invested, finalValue, percentage }) => (
                                <div key={player.id} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-white font-medium">{player.name}</span>
                                    {player.id === socket.id && (
                                      <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs">You</span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-4">
                                    <div>
                                      <div className="text-gray-400 text-xs">Invested</div>
                                      <div className="text-white font-medium">{invested.toLocaleString()}฿</div>
                                    </div>
                                    <div>
                                      <div className="text-gray-400 text-xs">Final Value</div>
                                      <div className={`font-medium ${finalValue > invested ? 'text-green-400' : 'text-gray-400'}`}>
                                        {finalValue.toLocaleString()}฿
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-gray-400 text-xs">Share</div>
                                      <div className="text-white font-medium">{percentage.toFixed(1)}%</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Player Rankings */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <h4 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <span className="mr-3">🏅</span> Player Rankings
                  </h4>
                  
                  <div className="space-y-3">
                    {gameState.players
                      .sort((a, b) => (b.finalValue || 0) - (a.finalValue || 0))
                      .map((player, index) => {
                        const totalInvested = Object.values(gameState.investments[player.id] || {}).reduce((sum, val) => sum + val, 0);
                        const profit = (player.finalValue || 0) - totalInvested;
                        const profitPercentage = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
                        
                        return (
                          <div key={player.id} className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-white/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                                  index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 
                                  index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' : 
                                  index === 2 ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gradient-to-r from-blue-400 to-purple-500'
                                }`}>
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="text-white font-semibold text-lg">{player.name}</div>
                                  {player.id === socket.id && (
                                    <div className="text-blue-400 text-sm">(You)</div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-white font-bold text-xl">
                                  {(player.finalValue || 0).toLocaleString()}฿
                                </div>
                                <div className={`text-sm ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {profit >= 0 ? '+' : ''}{profit.toLocaleString()}฿ ({profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}%)
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Game Activity Log */}
        <div className="mt-6 bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 p-4">
          <h4 className="text-white font-semibold mb-3 flex items-center">
            <span className="mr-2">📝</span> Game Activity
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {messages.map((message, index) => (
              <div key={index} className="text-sm text-gray-300 bg-white/5 rounded px-3 py-2">
                {message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
