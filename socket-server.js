const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Game state management
const gameRooms = new Map();

class GameRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map();
    this.companies = [];
    this.phase = 'waiting'; // waiting, investment, results
    this.currentPlayerIndex = 0;
    this.currentCompanyIndex = 0;
    this.investments = {};
    this.readyPlayers = new Set();
    this.submittedPlayers = new Set();
    this.hostId = null;
  }

  addPlayer(socketId, playerName) {
    const player = {
      id: socketId,
      name: playerName,
      remainingMoney: 10000,
      investments: {}
    };
    
    this.players.set(socketId, player);
    
    // Set first player as host
    if (this.players.size === 1) {
      this.hostId = socketId;
    }
    
    return player;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.readyPlayers.delete(socketId);
    this.submittedPlayers.delete(socketId);
    
    // If host left, assign new host
    if (this.hostId === socketId && this.players.size > 0) {
      this.hostId = Array.from(this.players.keys())[0];
    }
  }

  getGameState() {
    return {
      players: Array.from(this.players.values()),
      companies: this.companies,
      phase: this.phase,
      currentPlayerIndex: this.currentPlayerIndex,
      currentCompanyIndex: this.currentCompanyIndex,
      investments: this.investments,
      readyPlayers: Array.from(this.readyPlayers),
      submittedPlayers: Array.from(this.submittedPlayers),
      hostId: this.hostId
    };
  }

  addCompany(name) {
    if (this.phase === 'waiting') {
      this.companies.push({
        name: name,
        totalInvestment: 0,
        growth: Math.random() * 2 - 1 // Random growth between -1 and 1
      });
      return true;
    }
    return false;
  }

  startGame() {
    if (this.players.size >= 1 && this.companies.length >= 1) {
      this.phase = 'investment';
      this.currentPlayerIndex = 0;
      this.currentCompanyIndex = 0;
      this.investments = {};
      this.readyPlayers.clear();
      this.submittedPlayers.clear();
      return true;
    }
    return false;
  }

  submitInvestment(socketId, companyName, amount) {
    const player = this.players.get(socketId);
    if (!player || this.phase !== 'investment') return false;
    
    if (amount > player.remainingMoney) return false;
    
    if (!this.investments[socketId]) {
      this.investments[socketId] = {};
    }
    
    this.investments[socketId][companyName] = amount;
    player.remainingMoney -= amount;
    player.investments[companyName] = amount;
    
    this.submittedPlayers.add(socketId);
    return true;
  }

  calculateResults() {
    if (this.phase !== 'investment') return;
    
    // Calculate company growth based on total investment
    this.companies.forEach(company => {
      const totalInvestment = Object.values(this.investments)
        .reduce((sum, playerInvestments) => {
          return sum + (playerInvestments[company.name] || 0);
        }, 0);
      
      company.totalInvestment = totalInvestment;
      // Growth is influenced by total investment (more investment = better growth)
      company.growth = (Math.random() * 2 - 1) + (totalInvestment / 10000) * 0.5;
    });
    
    // Calculate final values for each player
    this.players.forEach(player => {
      let finalValue = player.remainingMoney;
      
      Object.entries(player.investments).forEach(([companyName, investment]) => {
        const company = this.companies.find(c => c.name === companyName);
        if (company) {
          finalValue += investment * (1 + company.growth);
        }
      });
      
      player.finalValue = finalValue;
    });
    
    this.phase = 'results';
  }
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinGame', ({ playerName, gameId }) => {
      console.log(`Player ${playerName} joining game ${gameId}`);
      
      // Leave any existing rooms
      socket.rooms.forEach(room => {
        if (room !== socket.id) {
          socket.leave(room);
        }
      });
      
      // Join the game room
      socket.join(gameId);
      
      // Get or create game room
      if (!gameRooms.has(gameId)) {
        gameRooms.set(gameId, new GameRoom(gameId));
      }
      
      const room = gameRooms.get(gameId);
      room.addPlayer(socket.id, playerName);
      
      // Send current game state to the player
      socket.emit('gameState', room.getGameState());
      
      // Broadcast updated state to all players in the room
      io.to(gameId).emit('gameState', room.getGameState());
    });

    socket.on('addCompany', ({ companyName }) => {
      const roomId = Array.from(socket.rooms).find(room => room !== socket.id);
      if (!roomId) return;
      
      const room = gameRooms.get(roomId);
      if (!room || room.hostId !== socket.id) return;
      
      if (room.addCompany(companyName)) {
        io.to(roomId).emit('gameState', room.getGameState());
      }
    });

    socket.on('startGame', () => {
      const roomId = Array.from(socket.rooms).find(room => room !== socket.id);
      if (!roomId) return;
      
      const room = gameRooms.get(roomId);
      if (!room || room.hostId !== socket.id) return;
      
      if (room.startGame()) {
        io.to(roomId).emit('gameState', room.getGameState());
      }
    });

    socket.on('submitInvestment', ({ companyName, amount }) => {
      const roomId = Array.from(socket.rooms).find(room => room !== socket.id);
      if (!roomId) return;
      
      const room = gameRooms.get(roomId);
      if (!room) return;
      
      if (room.submitInvestment(socket.id, companyName, amount)) {
        io.to(roomId).emit('gameState', room.getGameState());
      }
    });

    socket.on('readyForNext', () => {
      const roomId = Array.from(socket.rooms).find(room => room !== socket.id);
      if (!roomId) return;
      
      const room = gameRooms.get(roomId);
      if (!room) return;
      
      room.readyPlayers.add(socket.id);
      
      // If all players are ready, move to next phase
      if (room.readyPlayers.size === room.players.size) {
        if (room.phase === 'investment') {
          room.calculateResults();
        }
        io.to(roomId).emit('gameState', room.getGameState());
      } else {
        io.to(roomId).emit('gameState', room.getGameState());
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      // Remove player from all rooms
      socket.rooms.forEach(roomId => {
        if (roomId !== socket.id && gameRooms.has(roomId)) {
          const room = gameRooms.get(roomId);
          room.removePlayer(socket.id);
          
          // If room is empty, delete it
          if (room.players.size === 0) {
            gameRooms.delete(roomId);
          } else {
            // Broadcast updated state
            io.to(roomId).emit('gameState', room.getGameState());
          }
        }
      });
    });
  });

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> Socket.IO server running on port ${PORT}`);
  });
});
