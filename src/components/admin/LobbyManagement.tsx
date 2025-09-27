'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

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
  startedAt?: string;
  endedAt?: string;
}

export default function LobbyManagement() {
  const { data: session } = useSession();
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'active' | 'finished'>('all');
  const [gameTypeFilter, setGameTypeFilter] = useState<'all' | 'assessment' | 'quiz' | 'general'>('all');

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
    const interval = setInterval(loadRooms, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [filter, gameTypeFilter, loadRooms]);

  const deleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    
    try {
      const response = await fetch(`/api/lobby/${roomId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        loadRooms();
      } else {
        alert(data.error || 'Failed to delete room');
      }
    } catch (err) {
      alert('Failed to delete room');
      console.error('Error deleting room:', err);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-purple-500/30 bg-purple-500/10">
        <div className="flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-purple-300">Loading lobby rooms...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 border border-purple-500/30 bg-purple-500/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            🏛️ Lobby Management
          </h2>
          <button
            onClick={loadRooms}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-gray-300 text-sm">Status:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            >
              <option value="all">All</option>
              <option value="waiting">Waiting</option>
              <option value="active">Active</option>
              <option value="finished">Finished</option>
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

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Rooms List */}
      <div className="grid gap-4">
        {rooms.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 border border-gray-500/30 bg-gray-500/10 text-center">
            <div className="text-6xl mb-4">🏛️</div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Lobby Rooms Found</h3>
            <p className="text-gray-400">
              {filter === 'all' ? 'No rooms have been created yet.' : `No rooms found with status "${filter}".`}
            </p>
          </div>
        ) : (
          rooms.map((room) => (
            <div key={room._id} className="glass-card rounded-2xl p-6 border border-blue-500/30 bg-blue-500/10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getGameTypeIcon(room.gameType)}</span>
                    <h3 className="text-xl font-bold text-white">{room.roomName}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(room.status)}`}>
                      {room.status.toUpperCase()}
                    </span>
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
                      <span className="text-gray-400">Participants:</span>
                      <div className="text-white">
                        {room.participants.length}/{room.maxParticipants}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">Created:</span>
                      <div className="text-white">{formatDate(room.createdAt)}</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => deleteRoom(room.roomId)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
              
              {/* Participants */}
              {room.participants.length > 0 && (
                <div className="border-t border-gray-600/50 pt-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Participants:</h4>
                  <div className="flex flex-wrap gap-2">
                    {room.participants.map((participant, index) => (
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
          ))
        )}
      </div>
    </div>
  );
}
