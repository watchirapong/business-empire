# MongoDB Setup for Business Empire

## Overview
This project now uses MongoDB for persistent data storage. Game states, players, and companies are stored in MongoDB and cached in memory for fast access.

## What's Been Set Up

### 1. Dependencies
- `mongoose`: MongoDB ODM for Node.js
- `dotenv`: Environment variable management

### 2. Database Configuration
- **File**: `config/database.js`
- **Connection**: MongoDB running on `localhost:27017`
- **Database**: `business-empire`

### 3. Data Models
- **File**: `models/Game.js`
- **Schema**: Includes players, companies, game state, and metadata

### 4. Service Layer
- **File**: `services/gameService.js`
- **Functions**: CRUD operations for games, players, and companies

### 5. Server Integration
- **File**: `server.js` (updated)
- **Features**: 
  - Automatic database connection on startup
  - Game state persistence
  - Player reconnection support
  - Admin functions for game management

## Environment Variables
Create a `.env` file in the project root:

```env
MONGODB_URI=mongodb://localhost:27017/business-empire
NODE_ENV=development
PORT=3001
```

## MongoDB Installation & Setup

### Ubuntu/Debian
```bash
# Add MongoDB repository
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
apt update
apt install -y mongodb-org

# Start and enable MongoDB
systemctl start mongod
systemctl enable mongod
```

### Check MongoDB Status
```bash
systemctl status mongod
```

## Usage

### Starting the Server
```bash
npm run multiplayer
```

The server will automatically:
1. Connect to MongoDB
2. Create the database and collections if they don't exist
3. Load existing games from the database
4. Start the Socket.IO server

### Database Operations

#### Creating a Game
```javascript
const game = await gameService.createGame(roomId, hostName, hostId);
```

#### Adding a Player
```javascript
const player = {
  id: socketId,
  name: playerName,
  remainingMoney: 100000,
  investments: {}
};
await gameService.addPlayer(roomId, player);
```

#### Updating Game State
```javascript
await gameService.updateGame(roomId, {
  players: game.players,
  companies: game.companies,
  phase: 'playing',
  // ... other game data
});
```

#### Getting All Games
```javascript
const allGames = await gameService.getAllGames();
```

#### Resetting All Games
```javascript
await gameService.resetAllGames();
```

## Data Structure

### Game Document
```javascript
{
  roomId: String,           // Unique game room identifier
  players: [Player],        // Array of player objects
  companies: [Company],     // Array of company objects
  phase: String,           // 'waiting', 'playing', 'finished'
  currentPlayerIndex: Number,
  currentCompanyIndex: Number,
  investments: Map,         // Player investments
  readyPlayers: [String],  // Array of ready player IDs
  submittedPlayers: [String], // Array of submitted player IDs
  hostId: String,          // Host socket ID
  hostName: String,        // Host player name
  createdAt: Date,
  updatedAt: Date
}
```

### Player Object
```javascript
{
  id: String,              // Socket ID
  name: String,            // Player name
  remainingMoney: Number,  // Current money
  investments: Map         // Investment amounts
}
```

### Company Object
```javascript
{
  name: String,            // Company name
  currentPrice: Number,    // Current stock price
  priceHistory: [Number],  // Price history array
  volatility: Number       // Price volatility
}
```

## Benefits

1. **Persistence**: Game states survive server restarts
2. **Scalability**: Can handle multiple game rooms
3. **Reliability**: Data is safely stored in MongoDB
4. **Performance**: In-memory caching for fast access
5. **Recovery**: Players can reconnect to existing games

## Monitoring

### MongoDB Logs
```bash
tail -f /var/log/mongodb/mongod.log
```

### Database Access
```bash
# Connect to MongoDB shell
mongosh

# Switch to business-empire database
use business-empire

# View games collection
db.games.find()

# View game statistics
db.games.stats()
```

## Troubleshooting

### Connection Issues
1. Check if MongoDB is running: `systemctl status mongod`
2. Verify connection string in `.env` file
3. Check MongoDB logs for errors

### Data Issues
1. Check database collections: `mongosh --eval "use business-empire; db.games.find()"`
2. Verify indexes: `mongosh --eval "use business-empire; db.games.getIndexes()"`

### Performance Issues
1. Monitor MongoDB performance: `mongosh --eval "db.stats()"`
2. Check memory usage: `systemctl status mongod`
3. Review query performance in MongoDB logs
