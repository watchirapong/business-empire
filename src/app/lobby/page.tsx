'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface LobbyRoom {
  _id: string;
  roomId: string;
  roomName: string;
  description?: string;
  hostId: string;
  hostName: string;
  maxParticipants: number;
  participants: Array<{
    userId: string;
    username: string;
    joinedAt: string;
    isReady: boolean;
  }>;
  gameType: 'assessment' | 'quiz' | 'general';
  status: 'waiting' | 'starting' | 'active' | 'finished';
  settings: {
    isPrivate: boolean;
    allowSpectators: boolean;
    autoStart: boolean;
    timeLimit?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function LobbyPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'active'>('waiting');
  const [gameTypeFilter, setGameTypeFilter] = useState<'all' | 'assessment' | 'quiz' | 'general'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create room form state
  const [newRoom, setNewRoom] = useState({
    roomName: '',
    description: '',
    gameType: 'general' as 'assessment' | 'quiz' | 'general',
    maxParticipants: 10,
    isPrivate: false
  });

  const loadRooms = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (gameTypeFilter !== 'all') params.append('gameType', gameTypeFilter);
      
      const response = await fetch(`/api/lobby?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setRooms(data.rooms);
      } else {
        setError(data.error || 'Failed to load rooms');
      }
    } catch (err) {
      setError('Failed to load rooms');
      console.error('Error loading rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, [filter, gameTypeFilter, loadRooms]);

  const createRoom = async () => {
    if (!(session?.user as any)?.id) {
      alert('Please log in to create a room');
      return;
    }

    if (!newRoom.roomName.trim()) {
      alert('Please enter a room name');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/lobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoom)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowCreateForm(false);
        setNewRoom({
          roomName: '',
          description: '',
          gameType: 'general',
          maxParticipants: 10,
          isPrivate: false
        });
        loadRooms();
        alert('Room created successfully!');
      } else {
        alert(data.error || 'Failed to create room');
      }
    } catch (err) {
      alert('Failed to create room');
      console.error('Error creating room:', err);
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = async (roomId: string) => {
    if (!(session?.user as any)?.id) {
      alert('Please log in to join a room');
      return;
    }

    try {
      const response = await fetch(`/api/lobby/${roomId}/join`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Redirect to room page or show success message
        alert('Successfully joined the room!');
        loadRooms();
      } else {
        alert(data.error || 'Failed to join room');
      }
    } catch (err) {
      alert('Failed to join room');
      console.error('Error joining room:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'text-yellow-400 bg-yellow-400/20';
      case 'starting': return 'text-blue-400 bg-blue-400/20';
      case 'active': return 'text-green-400 bg-green-400/20';
      case 'finished': return 'text-gray-400 bg-gray-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getGameTypeIcon = (gameType: string) => {
    switch (gameType) {
      case 'assessment': return '📝';
      case 'quiz': return '🧠';
      case 'general': return '🎮';
      default: return '🎯';
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 border border-purple-500/30 bg-purple-500/10 text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-white mb-4">Login Required</h2>
          <p className="text-gray-300 mb-6">Please log in to access the lobby system.</p>
          <button
            onClick={() => router.push('/auth/signin')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass-card rounded-2xl p-6 border border-purple-500/30 bg-purple-500/10 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">🏛️ Game Lobby</h1>
              <p className="text-gray-300">Join existing rooms or create your own</p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              ➕ Create Room
            </button>
          </div>
        </div>

        {/* Create Room Form */}
        {showCreateForm && (
          <div className="glass-card rounded-2xl p-6 border border-green-500/30 bg-green-500/10 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Create New Room</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Room Name</label>
                <input
                  type="text"
                  value={newRoom.roomName}
                  onChange={(e) => setNewRoom({ ...newRoom, roomName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                  placeholder="Enter room name"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Game Type</label>
                <select
                  value={newRoom.gameType}
                  onChange={(e) => setNewRoom({ ...newRoom, gameType: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                >
                  <option value="general">🎮 General</option>
                  <option value="assessment">📝 Assessment</option>
                  <option value="quiz">🧠 Quiz</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Max Participants</label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={newRoom.maxParticipants}
                  onChange={(e) => setNewRoom({ ...newRoom, maxParticipants: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={newRoom.isPrivate}
                  onChange={(e) => setNewRoom({ ...newRoom, isPrivate: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isPrivate" className="text-gray-300 text-sm">Private Room</label>
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-300 text-sm mb-2">Description (Optional)</label>
                <textarea
                  value={newRoom.description}
                  onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                  rows={3}
                  placeholder="Enter room description"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={createRoom}
                disabled={creating}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {creating ? 'Creating...' : 'Create Room'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="glass-card rounded-2xl p-4 border border-blue-500/30 bg-blue-500/10 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-gray-300 text-sm">Status:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              >
                <option value="waiting">Waiting</option>
                <option value="active">Active</option>
                <option value="all">All</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-gray-300 text-sm">Game Type:</label>
              <select
                value={gameTypeFilter}
                onChange={(e) => setGameTypeFilter(e.target.value as any)}
                className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              >
                <option value="all">All</option>
                <option value="assessment">Assessment</option>
                <option value="quiz">Quiz</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>
        </div>

        {/* Rooms List */}
        {loading ? (
          <div className="glass-card rounded-2xl p-8 border border-purple-500/30 bg-purple-500/10 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-purple-300">Loading rooms...</p>
          </div>
        ) : error ? (
          <div className="glass-card rounded-2xl p-6 border border-red-500/30 bg-red-500/10">
            <div className="text-red-300">{error}</div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 border border-gray-500/30 bg-gray-500/10 text-center">
            <div className="text-6xl mb-4">🏛️</div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Rooms Found</h3>
            <p className="text-gray-400 mb-4">
              {filter === 'all' ? 'No rooms have been created yet.' : `No rooms found with status "${filter}".`}
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Create First Room
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {rooms.map((room) => (
              <div key={room._id} className="glass-card rounded-2xl p-6 border border-blue-500/30 bg-blue-500/10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getGameTypeIcon(room.gameType)}</span>
                      <h3 className="text-xl font-bold text-white">{room.roomName}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(room.status)}`}>
                        {room.status.toUpperCase()}
                      </span>
                      {room.settings.isPrivate && (
                        <span className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs">
                          🔒 Private
                        </span>
                      )}
                    </div>
                    
                    {room.description && (
                      <p className="text-gray-300 mb-3">{room.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Room ID:</span>
                        <div className="text-white font-mono">{room.roomId}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Host:</span>
                        <div className="text-white">{room.hostName}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Players:</span>
                        <div className="text-white">
                          {room.participants.length}/{room.maxParticipants}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400">Created:</span>
                        <div className="text-white">
                          {new Date(room.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    {room.status === 'waiting' && room.participants.length < room.maxParticipants && (
                      <button
                        onClick={() => joinRoom(room.roomId)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        🚀 Join
                      </button>
                    )}
                    {room.status === 'active' && (
                      <button
                        onClick={() => joinRoom(room.roomId)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        👁️ Spectate
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Participants */}
                {room.participants.length > 0 && (
                  <div className="border-t border-gray-600/50 pt-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Players:</h4>
                    <div className="flex flex-wrap gap-2">
                      {room.participants.map((participant) => (
                        <div
                          key={participant.userId}
                          className={`px-3 py-1 rounded-full text-xs ${
                            participant.userId === room.hostId
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                              : 'bg-gray-500/20 text-gray-300'
                          }`}
                        >
                          {participant.isReady ? '✅' : '⏳'} {participant.username}
                          {participant.userId === room.hostId && ' 👑'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
