const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');
const { connectDB } = require('./config/database');
const gameService = require('./services/gameService');
require('dotenv').config();
const { parse } = require('url');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Configure for large file uploads
// Note: NODE_OPTIONS handled by PM2 config

// Prepare the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Game state management (in-memory cache for active games)
const games = new Map();
// Track host names for each game to allow reconnection
const gameHosts = new Map();
// Assessment live session rooms (in-memory)
const assessmentRooms = new Map();

app.prepare().then(async () => {
  // Connect to MongoDB
  try {
    await connectDB();
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }

  const server = createServer(async (req, res) => {
    try {
      // Parse the URL
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      // Configure timeout for large file uploads
      if (pathname.startsWith('/api/shop/upload-file')) {
        // Increase the limit for file uploads
        req.setTimeout(300000); // 5 minutes timeout
        
        // Set headers for large file uploads
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        // Set higher limits for file uploads
        req.setMaxListeners(0);
        res.setMaxListeners(0);
        
        // Increase buffer size for large uploads
        req.setEncoding('binary');
      }

      // Let Next.js handle the request
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Configure server for large file uploads
  server.maxHeaderSize = 64 * 1024; // 64KB
  server.timeout = 300000; // 5 minutes
  
  // Set higher limits for large file uploads
  server.maxConnections = 1000;
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000", "https://hamsterhub.fun", "https://*.ngrok.app", "https://*.ngrok.io"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  server
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });

  // Cleanup inactive games every 5 minutes
  setInterval(() => {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
    
    games.forEach((game, roomId) => {
      // Skip lock entries
      if (roomId.startsWith('game_lock_')) return;
      
      if (game.lastActivity && (now - game.lastActivity) > inactiveThreshold) {
        console.log(`Cleaning up inactive game: ${roomId}`);
        games.delete(roomId);
        gameHosts.delete(roomId);
        
        // Also clean up from database
        gameService.deleteGame(roomId).catch(console.error);
      }
    });
  }, 5 * 60 * 1000); // Run every 5 minutes

  io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Reset all games (admin function)
    socket.on('resetAllGames', async () => {
      console.log('Resetting all games...');
      try {
        await gameService.resetAllGames();
        games.clear();
        gameHosts.clear();
        console.log('All games have been reset');
        socket.emit('gamesReset', { message: 'เกมทั้งหมดถูกรีเซ็ตเรียบร้อยแล้ว' });
      } catch (error) {
        console.error('Error resetting games:', error);
        socket.emit('gamesReset', { error: 'เกิดข้อผิดพลาดในการรีเซ็ตเกม' });
      }
    });

    // Join or create a game room
    socket.on('joinGame', async ({ playerName, gameId }) => {
      console.log('Player joining game:', { playerName, gameId, socketId: socket.id });
      const roomId = gameId || 'default';
      
      // Input validation
      if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
        socket.emit('error', { message: 'ชื่อผู้เล่นไม่ถูกต้อง' });
        return;
      }
      
      if (typeof roomId !== 'string' || roomId.trim().length === 0) {
        socket.emit('error', { message: 'รหัสห้องไม่ถูกต้อง' });
        return;
      }
      
      // Sanitize inputs
      const sanitizedPlayerName = playerName.trim().substring(0, 50); // Limit length
      const sanitizedRoomId = roomId.trim();
      
      socket.join(sanitizedRoomId);
      
      try {
        // Use a lock mechanism to prevent race conditions
        const lockKey = `game_lock_${sanitizedRoomId}`;
        if (games.has(lockKey)) {
          // Game is being modified, wait and retry
          setTimeout(() => {
            socket.emit('joinGame', { playerName: sanitizedPlayerName, gameId: sanitizedRoomId });
          }, 100);
          return;
        }
        
        // Set lock
        games.set(lockKey, true);
        
        // Check if game exists in memory cache first
        if (!games.has(sanitizedRoomId)) {
          // Try to load from database
          let gameData = await gameService.getGame(sanitizedRoomId);
          
          if (!gameData) {
            // Create new game in database
            console.log('Creating new game room:', sanitizedRoomId);
            gameData = await gameService.createGame(sanitizedRoomId, sanitizedPlayerName, socket.id);
            gameHosts.set(sanitizedRoomId, sanitizedPlayerName);
          }
          
          // Load into memory cache
          const game = {
            players: gameData.players || [],
            companies: (gameData.companies || []).map(company => ({
              name: company.name,
              totalInvestment: company.totalInvestment || 0,
              growth: company.growth || 0,
              // Keep stock trading properties if they exist
              ...(company.currentPrice && { currentPrice: company.currentPrice }),
              ...(company.priceHistory && { priceHistory: company.priceHistory }),
              ...(company.volatility !== undefined && { volatility: company.volatility })
            })),
            phase: gameData.phase || 'waiting',
            currentPlayerIndex: gameData.currentPlayerIndex || 0,
            currentCompanyIndex: gameData.currentCompanyIndex || 0,
            investments: gameData.investments || {},
            readyPlayers: new Set(gameData.readyPlayers || []),
            submittedPlayers: new Set(gameData.submittedPlayers || []),
            hostId: gameData.hostId || socket.id,
            lastActivity: new Date() // Add timestamp for cleanup
          };
          games.set(sanitizedRoomId, game);
        }

        const game = games.get(sanitizedRoomId);
        
        // Update last activity
        game.lastActivity = new Date();
        
        console.log('Current game state before adding player:', {
          players: game.players.length,
          companies: game.companies.length,
          hostId: game.hostId
        });
        
        const player = {
          id: socket.id,
          name: sanitizedPlayerName,
          remainingMoney: 100000,
          investments: {}
        };

        // Check if player already exists (by name, not socket ID)
        const existingPlayerIndex = game.players.findIndex(p => p.name === sanitizedPlayerName);
        if (existingPlayerIndex === -1) {
          // Limit maximum players per game to prevent abuse
          if (game.players.length >= 10) {
            socket.emit('error', { message: 'ห้องเต็มแล้ว (สูงสุด 10 คน)' });
            games.delete(lockKey); // Remove lock
            return;
          }
          game.players.push(player);
          console.log('Added new player:', sanitizedPlayerName);
        } else {
          // Update existing player with new socket ID
          game.players[existingPlayerIndex] = player;
          console.log('Updated existing player:', sanitizedPlayerName);
        }
        
        // Remove lock before continuing
        games.delete(lockKey);

        // Check if this player should be the host (either first player or reconnecting host)
        const isHost = gameHosts.get(roomId) === playerName;
        if (isHost) {
          game.hostId = socket.id;
          console.log('Set host to:', playerName);
        } else if (game.players.length === 1) {
          // If this is the first player and no host is set, make them the host
          game.hostId = socket.id;
          gameHosts.set(roomId, playerName);
          console.log('Set first player as host:', playerName);
        }

        // Save to database
        await gameService.updateGame(roomId, {
          players: game.players,
          companies: game.companies,
          phase: game.phase,
          currentPlayerIndex: game.currentPlayerIndex,
          currentCompanyIndex: game.currentCompanyIndex,
          investments: game.investments,
          readyPlayers: Array.from(game.readyPlayers),
          submittedPlayers: Array.from(game.submittedPlayers),
          hostId: game.hostId,
          hostName: gameHosts.get(roomId)
        });

        console.log('Game state after adding player:', {
          players: game.players.length,
          companies: game.companies.length,
          hostId: game.hostId,
          playerNames: game.players.map(p => p.name)
        });

        // Send updated game state to all players in the room
        const serializedGame = {
          ...game,
          submittedPlayers: Array.from(game.submittedPlayers),
          readyPlayers: Array.from(game.readyPlayers),
          hostId: game.hostId
        };
        io.to(roomId).emit('gameState', serializedGame);
        io.to(roomId).emit('playerJoined', { player, totalPlayers: game.players.length });
        console.log('Sent game state to room:', roomId);
      } catch (error) {
        console.error('Error joining game:', error);
        socket.emit('error', { message: 'เกิดข้อผิดพลาดในการเข้าร่วมเกม' });
      }
    });

    // Add company to game (now works in both waiting and investment phases)
    socket.on('addCompany', ({ companyName, gameId }) => {
      console.log('Add company request:', { companyName, gameId, socketId: socket.id });
      const roomId = gameId || 'default';
      const game = games.get(roomId);
      
      if (!game) {
        console.log('Game not found for room:', roomId);
        socket.emit('error', { message: 'ไม่พบเกม!' });
        return;
      }
      
      console.log('Current game state:', {
        hostId: game.hostId,
        socketId: socket.id,
        isHost: game.hostId === socket.id,
        phase: game.phase,
        companies: game.companies.length
      });
      
      if (game && game.hostId === socket.id && (game.phase === 'waiting' || game.phase === 'investment')) {
        const company = {
          name: companyName,
          totalInvestment: 0,
          growth: 0
        };
        
        game.companies.push(company);
        console.log('Added company:', companyName, 'Total companies:', game.companies.length);
        
        // Send updated game state to all players in the room
        const serializedGame = {
          ...game,
          submittedPlayers: Array.from(game.submittedPlayers),
          readyPlayers: Array.from(game.readyPlayers),
          hostId: game.hostId
        };
        io.to(roomId).emit('gameState', serializedGame);
        io.to(roomId).emit('companyAdded', { company, totalCompanies: game.companies.length });
        console.log('Sent updated game state after adding company');
      } else if (game && game.hostId !== socket.id) {
        console.log('Non-host player attempted to add company');
        // Notify non-host players that only host can add companies
        socket.emit('error', { message: 'เฉพาะโฮสต์เท่านั้นที่สามารถเพิ่มบริษัทได้!' });
      } else if (game && game.phase === 'results') {
        console.log('Attempted to add company during results phase');
        // Notify that companies can't be added during results phase
        socket.emit('error', { message: 'บริษัทไม่สามารถเพิ่มได้ในช่วงผลลัพธ์!' });
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
        socket.emit('error', { message: 'เฉพาะโฮสต์เท่านั้นที่สามารถลบบริษัทได้!' });
      } else if (game && game.phase !== 'waiting') {
        console.log('Attempted to delete company during non-waiting phase');
        // Notify that companies can only be deleted during waiting phase
        socket.emit('error', { message: 'บริษัทสามารถลบได้เฉพาะในช่วงรอเท่านั้น!' });
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
        socket.emit('error', { message: 'เฉพาะโฮสต์เท่านั้นที่สามารถเริ่มเกมได้!' });
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

    // Kick player (only host can kick)
    socket.on('kickPlayer', ({ playerId, gameId }) => {
      const roomId = gameId || 'default';
      const game = games.get(roomId);
      
      if (game && game.hostId === socket.id) {
        const playerToKick = game.players.find(p => p.id === playerId);
        
        if (playerToKick && playerToKick.id !== socket.id) {
          // Remove player from game
          game.players = game.players.filter(p => p.id !== playerId);
          
          // Remove player's investments
          if (game.investments[playerId]) {
            delete game.investments[playerId];
          }
          
          // Remove from submitted players
          game.submittedPlayers.delete(playerId);
          
          // If no players left, clean up the game
          if (game.players.length === 0) {
            games.delete(roomId);
            gameHosts.delete(roomId);
            io.to(roomId).emit('gameDeleted', { message: 'เกมถูกลบ - ไม่มีผู้เล่นที่เหลือ' });
          } else {
            // Send updated game state to remaining players
            const serializedGame = {
              ...game,
              submittedPlayers: Array.from(game.submittedPlayers),
              readyPlayers: Array.from(game.readyPlayers),
              hostId: game.hostId
            };
            io.to(roomId).emit('gameState', serializedGame);
            io.to(roomId).emit('playerKicked', { playerName: playerToKick.name, totalPlayers: game.players.length });
            
            // Notify the kicked player
            io.to(playerId).emit('kickedFromGame', { 
              message: `คุณถูกเตะออกจากเกมโดยโฮสต์` 
            });
          }
        } else if (playerToKick && playerToKick.id === socket.id) {
          socket.emit('error', { message: 'คุณไม่สามารถเตะตัวเองได้!' });
        } else {
          socket.emit('error', { message: 'ไม่พบผู้เล่น!' });
        }
      } else if (game && game.hostId !== socket.id) {
        socket.emit('error', { message: 'เฉพาะโฮสต์เท่านั้นที่สามารถเตะผู้เล่นได้!' });
      }
    });

    // Modify player investment (only host can modify)
    socket.on('modifyPlayerInvestment', ({ playerId, companyName, newAmount, gameId }) => {
      const roomId = gameId || 'default';
      const game = games.get(roomId);
      
      if (game && game.hostId === socket.id) {
        const player = game.players.find(p => p.id === playerId);
        
        if (player) {
          // Initialize player investments if not exists
          if (!game.investments[playerId]) {
            game.investments[playerId] = {};
          }
          
          // Update the investment amount
          game.investments[playerId][companyName] = newAmount;
          
          // Update company total investment
          const company = game.companies.find(c => c.name === companyName);
          if (company) {
            // Recalculate total investment for this company
            let totalInvestment = 0;
            Object.keys(game.investments).forEach(playerId => {
              if (game.investments[playerId][companyName]) {
                totalInvestment += game.investments[playerId][companyName];
              }
            });
            company.totalInvestment = totalInvestment;
          }
          
          // Send updated game state to all players
          const serializedGame = {
            ...game,
            submittedPlayers: Array.from(game.submittedPlayers),
            readyPlayers: Array.from(game.readyPlayers),
            hostId: game.hostId
          };
          io.to(roomId).emit('gameState', serializedGame);
          io.to(roomId).emit('playerInvestmentModified', { 
            playerName: player.name, 
            companyName, 
            newAmount 
          });
        } else {
          socket.emit('error', { message: 'ไม่พบผู้เล่น!' });
        }
      } else if (game && game.hostId !== socket.id) {
        socket.emit('error', { message: 'เฉพาะโฮสต์เท่านั้นที่สามารถแก้ไขการลงทุนได้!' });
      }
    });

    // =========================
    // Assessment live session
    // =========================
    socket.on('assessment:createRoom', ({ roomId, hostName, isAdmin }) => {
      try {
        const rid = (roomId || '').toUpperCase().slice(0, 8) || Math.random().toString(36).substring(2, 8).toUpperCase();
        if (!isAdmin) {
          socket.emit('assessment:error', { message: 'Only admin can create a room' });
          return;
        }

        if (!assessmentRooms.has(rid)) {
          assessmentRooms.set(rid, {
            roomId: rid,
            hostId: socket.id,
            participants: new Map(),
            currentQuestionIndex: 0
          });
        }

        const room = assessmentRooms.get(rid);
        room.hostId = socket.id;
        room.participants.set(socket.id, { id: socket.id, name: hostName || 'Admin' });
        socket.join(`assessment:${rid}`);

        const state = {
          roomId: rid,
          hostId: room.hostId,
          participants: Array.from(room.participants.values()),
          currentQuestionIndex: room.currentQuestionIndex
        };
        socket.emit('assessment:state', state);
        socket.to(`assessment:${rid}`).emit('assessment:state', state);
      } catch (err) {
        console.error('assessment:createRoom error', err);
        socket.emit('assessment:error', { message: 'Failed to create room' });
      }
    });

    socket.on('assessment:joinRoom', ({ roomId, name }) => {
      try {
        const rid = (roomId || '').toUpperCase();
        if (!rid || !assessmentRooms.has(rid)) {
          socket.emit('assessment:error', { message: 'Room not found' });
          return;
        }
        const room = assessmentRooms.get(rid);
        socket.join(`assessment:${rid}`);
        room.participants.set(socket.id, { id: socket.id, name: name || 'Player' });
        const state = {
          roomId: rid,
          hostId: room.hostId,
          participants: Array.from(room.participants.values()),
          currentQuestionIndex: room.currentQuestionIndex
        };
        socket.emit('assessment:state', state);
        socket.to(`assessment:${rid}`).emit('assessment:state', state);
      } catch (err) {
        console.error('assessment:joinRoom error', err);
        socket.emit('assessment:error', { message: 'Failed to join room' });
      }
    });

    socket.on('assessment:next', ({ roomId }) => {
      try {
        const rid = (roomId || '').toUpperCase();
        if (!rid || !assessmentRooms.has(rid)) return;
        const room = assessmentRooms.get(rid);
        if (room.hostId !== socket.id) {
          socket.emit('assessment:error', { message: 'Only admin can go next' });
          return;
        }
        room.currentQuestionIndex = Math.max(0, (room.currentQuestionIndex || 0) + 1);
        const state = {
          roomId: rid,
          hostId: room.hostId,
          participants: Array.from(room.participants.values()),
          currentQuestionIndex: room.currentQuestionIndex
        };
        io.to(`assessment:${rid}`).emit('assessment:state', state);
      } catch (err) {
        console.error('assessment:next error', err);
        socket.emit('assessment:error', { message: 'Failed to go next' });
      }
    });

    socket.on('assessment:leave', ({ roomId }) => {
      try {
        const rid = (roomId || '').toUpperCase();
        if (!rid || !assessmentRooms.has(rid)) return;
        const room = assessmentRooms.get(rid);
        socket.leave(`assessment:${rid}`);
        room.participants.delete(socket.id);
        if (room.hostId === socket.id) {
          const first = Array.from(room.participants.keys())[0];
          if (first) {
            room.hostId = first;
          } else {
            assessmentRooms.delete(rid);
            return;
          }
        }
        const state = {
          roomId: rid,
          hostId: room.hostId,
          participants: Array.from(room.participants.values()),
          currentQuestionIndex: room.currentQuestionIndex
        };
        io.to(`assessment:${rid}`).emit('assessment:state', state);
      } catch (err) {
        console.error('assessment:leave error', err);
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

      // Cleanup from assessment rooms
      assessmentRooms.forEach((room, rid) => {
        if (room.participants.has(socket.id)) {
          room.participants.delete(socket.id);
          if (room.hostId === socket.id) {
            const first = Array.from(room.participants.keys())[0];
            if (first) {
              room.hostId = first;
            } else {
              assessmentRooms.delete(rid);
              return;
            }
          }
          const state = {
            roomId: rid,
            hostId: room.hostId,
            participants: Array.from(room.participants.values()),
            currentQuestionIndex: room.currentQuestionIndex
          };
          io.to(`assessment:${rid}`).emit('assessment:state', state);
        }
      });
    });
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
