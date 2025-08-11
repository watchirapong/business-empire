const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Game state management
const games = new Map();

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
      }

      const game = games.get(roomId);
      const player = {
        id: socket.id,
        name: playerName,
        remainingMoney: 100000,
        investments: {}
      };

      // Check if player already exists
      const existingPlayerIndex = game.players.findIndex(p => p.id === socket.id);
      if (existingPlayerIndex === -1) {
        game.players.push(player);
      } else {
        game.players[existingPlayerIndex] = player;
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

    // Add company to game
    socket.on('addCompany', ({ companyName, gameId }) => {
      const roomId = gameId || 'default';
      const game = games.get(roomId);
      
      if (game) {
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
      
      if (game && game.hostId === socket.id && game.players.length > 0 && game.companies.length > 0) {
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
        game.players = game.players.filter(p => p.id !== socket.id);
        game.readyPlayers.delete(socket.id);
        game.submittedPlayers.delete(socket.id);
        
        if (game.players.length === 0) {
          games.delete(roomId);
        } else {
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
    
    player.finalValue = totalValue;
  });
}
