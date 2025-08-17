# Routing Setup for Business Empire Game

## Overview
This document explains how the routing is set up so that users can access the multiplayer game at `https://hamsterhub.fun/gamehub`.

## URL Structure

### Main Routes
- **`/`** (Root) → Redirects to `/gamehub`
- **`/gamehub`** → Multiplayer game lobby and game interface
- **`/games`** → Alternative game selection page

## How It Works

### 1. Root Route (`/`)
- **File**: `src/app/page.tsx`
- **Behavior**: Automatically redirects users to `/gamehub`
- **Implementation**: Uses Next.js `useRouter` to redirect on component mount

### 2. Game Hub Route (`/gamehub`)
- **File**: `src/app/gamehub/page.tsx`
- **Features**:
  - Beautiful lobby interface for joining games
  - Player name input
  - Optional game ID input for joining existing games
  - Socket.IO connection management
  - Error handling and loading states

### 3. Game Component Integration
- **File**: `src/components/MultiplayerGame.tsx`
- **Integration**: Loaded when user joins a game
- **Features**: Full multiplayer game functionality

## Server Configuration

### Development Server
- **Port**: 3000 (Next.js)
- **Command**: `npm run dev`
- **Features**: Hot reloading, development tools

### Multiplayer Server
- **Port**: 3001 (Socket.IO + MongoDB)
- **Command**: `npm run multiplayer`
- **Features**: Real-time game state, MongoDB persistence

### Production Setup
- **Domain**: `https://hamsterhub.fun`
- **Proxy**: Nginx likely handles routing between Next.js and Socket.IO
- **Database**: MongoDB running on port 27017

## User Flow

### 1. User visits `https://hamsterhub.fun/gamehub`
1. Next.js serves the gamehub page
2. User sees the lobby interface
3. User enters their name and optionally a game ID

### 2. User joins a game
1. Socket.IO connection is established
2. User joins the game room
3. MultiplayerGame component is loaded
4. Real-time game begins

### 3. Game Features
- Real-time multiplayer gameplay
- MongoDB persistence for game state
- Player reconnection support
- Host controls for game management

## Technical Implementation

### Next.js App Router
```typescript
// src/app/page.tsx - Root redirect
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.push('/gamehub');
  }, [router]);
  // ... loading UI
}
```

### Socket.IO Integration
```typescript
// src/app/gamehub/page.tsx - Game lobby
const handleJoinGame = async () => {
  const newSocket = io();
  newSocket.on('connect', () => {
    newSocket.emit('joinGame', { playerName, gameId });
  });
  // ... handle game state
};
```

### MongoDB Persistence
- Game states are saved to MongoDB
- Players can reconnect to existing games
- Admin functions for game management

## Development Commands

### Start Development
```bash
# Terminal 1: Next.js development server
npm run dev

# Terminal 2: Multiplayer server
npm run multiplayer
```

### Build for Production
```bash
npm run build
npm start
```

## Access URLs

### Development
- **Next.js**: `http://localhost:3000`
- **Game Hub**: `http://localhost:3000/gamehub`
- **Socket.IO**: `http://localhost:3001`

### Production
- **Main Site**: `https://hamsterhub.fun`
- **Game Hub**: `https://hamsterhub.fun/gamehub`
- **Socket.IO**: `https://hamsterhub.fun` (proxied)

## Troubleshooting

### Common Issues
1. **Socket connection fails**: Check if multiplayer server is running
2. **MongoDB connection fails**: Verify MongoDB is running and accessible
3. **Routing issues**: Check Next.js build and server configuration

### Debug Commands
```bash
# Check server status
ps aux | grep node

# Check ports
netstat -tlnp | grep -E "(3000|3001)"

# Check MongoDB
systemctl status mongod

# View logs
tail -f /var/log/mongodb/mongod.log
```

## Security Considerations
- CORS is configured for the domain
- Socket.IO connections are validated
- MongoDB access is properly configured
- Environment variables are used for sensitive data
