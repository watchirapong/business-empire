const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Game state management
const games = new Map();
// Track host names for each game to allow reconnection
const gameHosts = new Map();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000", "http://localhost:3002", "https://*.ngrok.app", "https://*.ngrok.io"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Join or create a game room
    socket.on('joinGame', ({ playerName, gameId }) => {
      const roomId = gameId || 'default';
      socket.join(roomId);
      
      if (!games.has(roomId)) {
        games.set(roomId, {
          players: [],
          companies: [],
          phase: 'waiting',
          currentPlayerIndex: 0,
          currentCompanyIndex: 0,
          investments: {},
          readyPlayers: new Set(),
          submittedPlayers: new Set(),
          hostId: socket.id // First player becomes the host
        });
        gameHosts.set(roomId, playerName); // Store host name
      }

      const game = games.get(roomId);
      const player = {
        id: socket.id,
        name: playerName,
        remainingMoney: 100000,
        investments: {}
      };

      // Check if player already exists (by name, not socket ID)
      const existingPlayerIndex = game.players.findIndex(p => p.name === playerName);
      if (existingPlayerIndex === -1) {
        game.players.push(player);
      } else {
        // Update existing player with new socket ID
        game.players[existingPlayerIndex] = player;
      }

      // Check if this player should be the host (either first player or reconnecting host)
      const isHost = gameHosts.get(roomId) === playerName;
      if (isHost) {
        game.hostId = socket.id;
      }

      // Send updated game state to all players in the room
      const serializedGame = {
        ...game,
        submittedPlayers: Array.from(game.submittedPlayers),
        readyPlayers: Array.from(game.readyPlayers),
        hostId: game.hostId
      };
      io.to(roomId).emit('gameState', serializedGame);
      io.to(roomId).emit('playerJoined', { player, totalPlayers: game.players.length });
    });

    // Add company to game (now works in both waiting and investment phases)
    socket.on('addCompany', ({ companyName, gameId }) => {
      const roomId = gameId || 'default';
      const game = games.get(roomId);
      
      if (game && game.hostId === socket.id && (game.phase === 'waiting' || game.phase === 'investment')) {
        const company = {
          name: companyName,
          totalInvestment: 0,
          growth: 0
        };
        
        game.companies.push(company);
        
        // Send updated game state to all players in the room
        const serializedGame = {
          ...game,
          submittedPlayers: Array.from(game.submittedPlayers),
          readyPlayers: Array.from(game.readyPlayers),
          hostId: game.hostId
        };
        io.to(roomId).emit('gameState', serializedGame);
        io.to(roomId).emit('companyAdded', { company, totalCompanies: game.companies.length });
      } else if (game && game.hostId !== socket.id) {
        // Notify non-host players that only host can add companies
        socket.emit('error', { message: 'Only the host can add companies!' });
      } else if (game && game.phase === 'results') {
        // Notify that companies can't be added during results phase
        socket.emit('error', { message: 'Companies cannot be added during the results phase!' });
      }
    });

    // Delete company (only host can delete)
    socket.on('deleteCompany', ({ companyName, gameId }) => {
      console.log('Delete company request received:', { companyName, gameId, socketId: socket.id });
      const roomId = gameId || 'default';
      const game = games.get(roomId);
      
      if (game && game.hostId === socket.id && game.phase === 'waiting') {
        console.log('Host check passed - attempting to delete company');
        const companyIndex = game.companies.findIndex(c => c.name === companyName);
        console.log('Company index found:', companyIndex);
        
        if (companyIndex !== -1) {
          console.log('Deleting company:', companyName);
          const deletedCompany = game.companies.splice(companyIndex, 1)[0];
          
          // Send updated game state to all players in the room
          const serializedGame = {
            ...game,
            submittedPlayers: Array.from(game.submittedPlayers),
            readyPlayers: Array.from(game.readyPlayers),
            hostId: game.hostId
          };
          io.to(roomId).emit('gameState', serializedGame);
          io.to(roomId).emit('companyDeleted', { company: deletedCompany, totalCompanies: game.companies.length });
        }
      } else if (game && game.hostId !== socket.id) {
        console.log('Non-host player attempted to delete company');
        // Notify non-host players that only host can delete
        socket.emit('error', { message: 'Only the host can delete companies!' });
      } else if (game && game.phase !== 'waiting') {
        console.log('Attempted to delete company during non-waiting phase');
        // Notify that companies can only be deleted during waiting phase
        socket.emit('error', { message: 'Companies can only be deleted during the waiting phase!' });
      } else {
        console.log('Game not found or other error');
      }
    });

    // Start investment phase (only host can start)
    socket.on('startInvestment', ({ gameId }) => {
      const roomId = gameId || 'default';
      const game = games.get(roomId);
      
      if (game && game.hostId === socket.id && game.players.length > 0) {
        // Remove the requirement for companies to start
        game.phase = 'investment';
        game.currentPlayerIndex = 0;
        game.currentCompanyIndex = 0;
        game.submittedPlayers.clear();
        
        const serializedGame = {
          ...game,
          submittedPlayers: Array.from(game.submittedPlayers),
          readyPlayers: Array.from(game.readyPlayers),
          hostId: game.hostId
        };
        io.to(roomId).emit('investmentStarted', serializedGame);
      } else if (game && game.hostId !== socket.id) {
        // Notify non-host players that only host can start
        socket.emit('error', { message: 'Only the host can start the game!' });
      }
    });

    // Submit all investments from a player
    socket.on('submitAllInvestments', ({ investments, gameId }) => {
      const roomId = gameId || 'default';
      const game = games.get(roomId);
      
      if (game && game.phase === 'investment') {
        const currentPlayer = game.players.find(p => p.id === socket.id);
        
        if (currentPlayer) {
          // Validate total investment doesn't exceed budget
          const totalInvestment = Object.values(investments).reduce((sum, amount) => sum + amount, 0);
          
          if (totalInvestment <= 100000) {
            // Store all investments for this player
            game.investments[currentPlayer.id] = investments;
            
            // Update player's remaining money
            currentPlayer.remainingMoney = 100000 - totalInvestment;
            
            // Mark player as submitted
            game.submittedPlayers.add(socket.id);
            
            // Create a serializable version of the game state
            const serializedGame = {
              ...game,
              submittedPlayers: Array.from(game.submittedPlayers),
              readyPlayers: Array.from(game.readyPlayers),
              hostId: game.hostId
            };
            
            // Notify all players that this player submitted
            io.to(roomId).emit('playerSubmitted', {
              playerId: socket.id,
              game: serializedGame
            });
            
            // Check if all players have submitted
            if (game.submittedPlayers.size === game.players.length) {
              // All players submitted - calculate results
              game.phase = 'results';
              calculateResults(game);
              
              const finalGame = {
                ...game,
                submittedPlayers: Array.from(game.submittedPlayers),
                readyPlayers: Array.from(game.readyPlayers),
                hostId: game.hostId
              };
              
              io.to(roomId).emit('allPlayersSubmitted', finalGame);
            }
          }
        }
      }
    });

    // Player ready for next phase
    socket.on('playerReady', ({ gameId }) => {
      const roomId = gameId || 'default';
      const game = games.get(roomId);
      
      if (game) {
        game.readyPlayers.add(socket.id);
        
        // Check if all players are ready
        if (game.readyPlayers.size === game.players.length) {
          game.readyPlayers.clear();
          io.to(roomId).emit('allPlayersReady', game);
        }
      }
    });

    // Reset game
    socket.on('resetGame', ({ gameId }) => {
      const roomId = gameId || 'default';
      const game = games.get(roomId);
      
      if (game) {
        game.players = [];
        game.companies = [];
        game.phase = 'waiting';
        game.currentPlayerIndex = 0;
        game.currentCompanyIndex = 0;
        game.investments = {};
        game.readyPlayers.clear();
        game.submittedPlayers.clear();
        
        const serializedGame = {
          ...game,
          submittedPlayers: Array.from(game.submittedPlayers),
          readyPlayers: Array.from(game.readyPlayers),
          hostId: game.hostId
        };
        io.to(roomId).emit('gameReset', serializedGame);
      }
    });

    socket.on('disconnect', () => {
      console.log('Player disconnected:', socket.id);
      // Remove player from all games
      games.forEach((game, roomId) => {
        const disconnectedPlayer = game.players.find(p => p.id === socket.id);
        game.players = game.players.filter(p => p.id !== socket.id);
        game.readyPlayers.delete(socket.id);
        game.submittedPlayers.delete(socket.id);
        
        // If the host disconnected, we need to handle host transfer
        if (disconnectedPlayer && game.hostId === socket.id) {
          console.log('Host disconnected:', disconnectedPlayer.name);
          
          // If there are other players, transfer host to the next player
          if (game.players.length > 0) {
            const newHost = game.players[0];
            game.hostId = newHost.id;
            gameHosts.set(roomId, newHost.name); // Update host name
            console.log('Host transferred to:', newHost.name);
          } else {
            // No players left, clean up the game
            games.delete(roomId);
            gameHosts.delete(roomId);
            console.log('Game deleted - no players remaining');
            return;
          }
        }
        
        if (game.players.length === 0) {
          games.delete(roomId);
          gameHosts.delete(roomId);
        } else {
          // Send updated game state to remaining players
          const serializedGame = {
            ...game,
            submittedPlayers: Array.from(game.submittedPlayers),
            readyPlayers: Array.from(game.readyPlayers),
            hostId: game.hostId
          };
          io.to(roomId).emit('gameState', serializedGame);
          io.to(roomId).emit('playerLeft', { playerId: socket.id, totalPlayers: game.players.length });
        }
      });
    });
  });

  const PORT = process.env.PORT || 3002;
  server.listen(PORT, () => {
    console.log(`🚀 Multiplayer server running on port ${PORT}`);
  });
});

function calculateResults(game) {
  // Handle case where there are no companies
  if (game.companies.length === 0) {
    // If no companies, all players keep their original money
    game.players.forEach(player => {
      player.finalValue = 100000; // Original starting money
    });
    return;
  }

  // Calculate total investment in each company
  game.companies.forEach(company => {
    company.totalInvestment = game.players.reduce((sum, player) => {
      const playerInvestments = game.investments[player.id] || {};
      return sum + (playerInvestments[company.name] || 0);
    }, 0);
  });

  // Calculate growth (max 30%)
  const totalAll = game.companies.reduce((sum, company) => sum + company.totalInvestment, 0);
  game.companies.forEach(company => {
    company.growth = totalAll > 0 ? (company.totalInvestment / totalAll) * 30 : 0;
  });

  // Calculate final values for each player
  game.players.forEach(player => {
    let totalValue = 0;
    const playerInvestments = game.investments[player.id] || {};
    
    Object.entries(playerInvestments).forEach(([companyName, invested]) => {
      const company = game.companies.find(c => c.name === companyName);
      if (company) {
        const newValue = invested * (1 + company.growth / 100);
        totalValue += newValue;
      }
    });
    
    // Add uninvested money to total value
    const totalInvested = Object.values(playerInvestments).reduce((sum, amount) => sum + amount, 0);
    totalValue += (100000 - totalInvested);
    
    player.finalValue = totalValue;
  });
}
