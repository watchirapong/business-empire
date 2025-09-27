'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';
import { isAdmin } from '@/lib/admin-config';

interface Game {
  _id: string;
  title: string;
  description: string;
  itchIoUrl: string;
  thumbnailUrl?: string;
  tags: string[];
  genre?: string;
  author: {
    userId: string;
    username: string;
    nickname?: string;
    avatar?: string;
  };
  likes: Array<{
    userId: string;
    username: string;
    createdAt: string;
  }>;
  comments: Array<{
    _id: string;
    userId: string;
    username: string;
    avatar?: string;
    content: string;
    createdAt: string;
  }>;
  views: number;
  createdAt: string;
  updatedAt: string;
  color: string;
  priority: number;
}

const GameSpace: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Track Game Space visits
  const { trackBehavior } = useBehaviorTracking({
    behaviorType: 'game_space_visit',
    section: 'game-space',
    action: 'view_game_space'
  });

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showComments, setShowComments] = useState<{[key: string]: boolean}>({});

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'title' | 'tags' | 'genre' | 'author'>('all');

  // Form states
  const [newGame, setNewGame] = useState({
    title: '',
    description: '',
    itchIoUrl: '',
    thumbnailUrl: '',
    tags: '',
    genre: ''
  });

  const [newComment, setNewComment] = useState<{[key: string]: string}>({});
  const [commentingOn, setCommentingOn] = useState<string | null>(null);

  // Admin controls state
  const [showAdminControls, setShowAdminControls] = useState<{[key: string]: boolean}>({});
  const [adminColor, setAdminColor] = useState<{[key: string]: string}>({});
  const [adminPriority, setAdminPriority] = useState<{[key: string]: number}>({});
  const [adminUpdating, setAdminUpdating] = useState<string | null>(null);

  // Load games with search
  const loadGames = useCallback(async (query: string = '', filter: string = 'all') => {
    try {
      setLoading(true);
      const searchParams = new URLSearchParams();

      if (query.trim()) {
        searchParams.append('search', query.trim());
        searchParams.append('searchFilter', filter);
      }

      const response = await fetch(`/api/games?${searchParams.toString()}`);
      const data = await response.json();

      if (data.success) {
        setGames(data.games);
      }
    } catch (error) {
      console.error('Failed to load games:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search function
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback((query: string, filter: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      loadGames(query, filter);
    }, 300); // 300ms debounce

    setSearchTimeout(timeout);
  }, [loadGames, searchTimeout]);

  // Post new game
  const handlePostGame = async () => {
    if (!newGame.title || !newGame.description || !newGame.itchIoUrl) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setPosting(true);
      const tagsArray = newGame.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newGame,
          tags: tagsArray
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewGame({
          title: '',
          description: '',
          itchIoUrl: '',
          thumbnailUrl: '',
          tags: '',
          genre: ''
        });
        setShowPostForm(false);
        // Reload with current search parameters
        loadGames(searchQuery, searchFilter);
        alert('Game posted successfully!');
      } else {
        alert(data.error || 'Failed to post game');
      }
    } catch (error) {
      console.error('Failed to post game:', error);
      alert('Failed to post game. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  // Toggle like
  const handleLike = async (gameId: string) => {
    try {
      const response = await fetch(`/api/games/${gameId}/like`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        // Update the game in the local state
                setGames(prevGames =>
                  prevGames.map(game =>
                    game._id === gameId
                      ? { ...game, likes: data.action === 'liked'
                          ? [...game.likes, {
                              userId: (session?.user as any)?.id || session?.user?.email || '',
                              username: (session?.user as any)?.nickname || session?.user?.name || 'Unknown',
                              createdAt: new Date().toISOString()
                            }]
                          : game.likes.filter(like => like.userId !== ((session?.user as any)?.id || session?.user?.email))
                        }
                      : game
                  )
                );
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  // Add comment
  const handleAddComment = async (gameId: string) => {
    const content = newComment[gameId]?.trim();
    if (!content) return;

    try {
      setCommentingOn(gameId);
      const response = await fetch(`/api/games/${gameId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (data.success) {
        setNewComment(prev => ({ ...prev, [gameId]: '' }));

        // Update the game in the local state
        setGames(prevGames =>
          prevGames.map(game =>
            game._id === gameId
              ? { ...game, comments: [...game.comments, {
                  ...data.comment,
                  username: (session?.user as any)?.nickname || session?.user?.name || 'Unknown'
                }] }
              : game
          )
        );
      } else {
        alert(data.error || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setCommentingOn(null);
    }
  };

  // Delete game (admin only)
  const handleDeleteGame = async (gameId: string) => {
    if (!confirm('Are you sure you want to delete this game? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/games?id=${gameId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Remove the game from the local state
        setGames(prevGames => prevGames.filter(game => game._id !== gameId));
        alert('Game deleted successfully!');
      } else {
        alert(data.error || 'Failed to delete game');
      }
    } catch (error) {
      console.error('Failed to delete game:', error);
      alert('Failed to delete game. Please try again.');
    }
  };

  // Handle play button click and increment view count
  const handlePlayClick = async (gameId: string, itchIoUrl: string) => {
    try {
      // Increment view count
      const response = await fetch(`/api/games/${gameId}/view`, {
        method: 'POST',
      });

      if (response.ok) {
        // Update the game in the local state
        setGames(prevGames =>
          prevGames.map(game =>
            game._id === gameId
              ? { ...game, views: game.views + 1 }
              : game
          )
        );
      }
    } catch (error) {
      console.error('Failed to increment view count:', error);
    }

    // Open the game in a new tab
    window.open(itchIoUrl, '_blank', 'noopener,noreferrer');
  };

  // Admin: Update game color
  const handleUpdateColor = async (gameId: string) => {
    const color = adminColor[gameId];
    if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      alert('Please enter a valid hex color (e.g., #FF5733)');
      return;
    }

    try {
      setAdminUpdating(gameId);
      const response = await fetch(`/api/games/${gameId}/color`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ color }),
      });

      const data = await response.json();

      if (data.success) {
        // Update the game in the local state
        setGames(prevGames =>
          prevGames.map(game =>
            game._id === gameId
              ? { ...game, color }
              : game
          )
        );
        setShowAdminControls(prev => ({ ...prev, [gameId]: false }));
        alert('Color updated successfully!');
      } else {
        alert(data.error || 'Failed to update color');
      }
    } catch (error) {
      console.error('Failed to update color:', error);
      alert('Failed to update color. Please try again.');
    } finally {
      setAdminUpdating(null);
    }
  };

  // Admin: Update game priority
  const handleUpdatePriority = async (gameId: string) => {
    const priority = adminPriority[gameId];
    if (typeof priority !== 'number' || priority < 0 || priority > 100) {
      alert('Priority must be a number between 0 and 100');
      return;
    }

    try {
      setAdminUpdating(gameId);
      const response = await fetch(`/api/games/${gameId}/priority`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priority }),
      });

      const data = await response.json();

      if (data.success) {
        // Update the game in the local state
        setGames(prevGames =>
          prevGames.map(game =>
            game._id === gameId
              ? { ...game, priority }
              : game
          )
        );
        setShowAdminControls(prev => ({ ...prev, [gameId]: false }));
        alert('Priority updated successfully!');
        // Reload games to ensure proper sorting
        loadGames();
      } else {
        alert(data.error || 'Failed to update priority');
      }
    } catch (error) {
      console.error('Failed to update priority:', error);
      alert('Failed to update priority. Please try again.');
    } finally {
      setAdminUpdating(null);
    }
  };

  // Extract itch.io game ID from URL for thumbnail
  const getItchThumbnailUrl = (url: string) => {
    const match = url.match(/https?:\/\/([a-zA-Z0-9\-]+)\.itch\.io\/([a-zA-Z0-9\-]+)/);
    if (match) {
      return `https://img.itch.zone/aW1nLzE0MzY5MzcucG5n/original/${match[1]}/${match[2]}`;
    }
    return null;
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    loadGames();
  }, [status, router, loadGames]);

  // Handle search input changes
  const handleSearchInputChange = (query: string) => {
    setSearchQuery(query);
    handleSearch(query, searchFilter);
  };

  const handleFilterChange = (filter: 'all' | 'title' | 'tags' | 'genre' | 'author') => {
    setSearchFilter(filter);
    handleSearch(searchQuery, filter);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Game Space...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.1),transparent_50%)]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">
            🎮 Game Space
          </h1>
          <p className="text-gray-300 text-lg">Share your itch.io games and discover amazing indie creations!</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  placeholder="🔍 Search games..."
                  className="w-full bg-gray-800/50 backdrop-blur-sm border border-orange-500/30 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400 transition-all duration-300"
                />
              </div>
              <select
                value={searchFilter}
                onChange={(e) => handleFilterChange(e.target.value as 'all' | 'title' | 'tags' | 'genre' | 'author')}
                className="bg-gray-800/50 backdrop-blur-sm border border-orange-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-400 transition-all duration-300 min-w-[120px]"
              >
                <option value="all">All Fields</option>
                <option value="title">Title</option>
                <option value="tags">Tags</option>
                <option value="genre">Genre</option>
                <option value="author">Author</option>
              </select>
            </div>

            {searchQuery && (
              <div className="text-center">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchFilter('all');
                    loadGames();
                  }}
                  className="text-orange-400 hover:text-orange-300 text-sm underline"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Post Game Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowPostForm(!showPostForm)}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-6 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold text-lg shadow-lg hover:shadow-orange-500/25"
          >
            {showPostForm ? '❌ Cancel Posting' : '🎮 Post Your Game'}
          </button>
        </div>

        {/* Post Game Form */}
        {showPostForm && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Post Your Game</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Game Title *</label>
                <input
                  type="text"
                  value={newGame.title}
                  onChange={(e) => setNewGame(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-gray-700/50 border border-orange-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                  placeholder="Enter your game title"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Description *</label>
                <textarea
                  value={newGame.description}
                  onChange={(e) => setNewGame(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-gray-700/50 border border-orange-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400 h-32 resize-none"
                  placeholder="Describe your game..."
                  maxLength={1000}
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">itch.io URL *</label>
                <input
                  type="url"
                  value={newGame.itchIoUrl}
                  onChange={(e) => setNewGame(prev => ({ ...prev, itchIoUrl: e.target.value }))}
                  className="w-full bg-gray-700/50 border border-orange-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                  placeholder="https://yourname.itch.io/yourgame"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-2">Genre</label>
                  <input
                    type="text"
                    value={newGame.genre}
                    onChange={(e) => setNewGame(prev => ({ ...prev, genre: e.target.value }))}
                    className="w-full bg-gray-700/50 border border-orange-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                    placeholder="e.g., Action, RPG, Puzzle"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={newGame.tags}
                    onChange={(e) => setNewGame(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full bg-gray-700/50 border border-orange-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                    placeholder="indie, pixel-art, horror"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Thumbnail URL (optional)</label>
                <input
                  type="url"
                  value={newGame.thumbnailUrl}
                  onChange={(e) => setNewGame(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                  className="w-full bg-gray-700/50 border border-orange-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                  placeholder="https://..."
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handlePostGame}
                  disabled={posting}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 disabled:bg-gray-500 text-white px-6 py-3 rounded-lg transition-all duration-300 font-semibold"
                >
                  {posting ? 'Posting...' : '🎮 Post Game'}
                </button>
                <button
                  onClick={() => setShowPostForm(false)}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Games Feed */}
        <div className="space-y-6">
          {games.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎮</div>
              <h3 className="text-2xl font-bold text-white mb-2">No Games Yet</h3>
              <p className="text-gray-400">Be the first to share your itch.io game!</p>
            </div>
          ) : (
            games.map((game) => {
              const isLiked = game.likes.some(like => like.userId === ((session?.user as any)?.id || session?.user?.email));
              const commentsVisible = showComments[game._id];
              const gameColor = game.color || '#F97316';
              const userId = (session?.user as any)?.id || (session?.user as any)?.sub || session?.user?.email;
              const adminCheck = isAdmin(userId);

              return (
                <div key={game._id} className="backdrop-blur-sm rounded-2xl border-2 p-6 relative" style={{ backgroundColor: gameColor + '20', borderColor: gameColor + '40' }}>
                  {/* Game Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={game.author.avatar || `https://cdn.discordapp.com/embed/avatars/0.png`}
                        alt={game.author.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <div className="text-white font-semibold">{game.author.nickname || game.author.username}</div>
                        <div className="text-gray-400 text-sm">{new Date(game.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>

                    {/* Admin Controls */}
                    <div className="flex items-center space-x-2">
                      {adminCheck && (
                        <>
                          {game.priority > 0 && (
                            <div className="flex items-center space-x-1 bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full text-xs">
                              <span>⭐</span>
                              <span>Priority: {game.priority}</span>
                            </div>
                          )}

                          <button
                            onClick={() => {
                              setShowAdminControls(prev => ({ ...prev, [game._id]: !prev[game._id] }));
                              if (!adminColor[game._id]) {
                                setAdminColor(prev => ({ ...prev, [game._id]: game.color || '#8B5CF6' }));
                              }
                              if (adminPriority[game._id] === undefined) {
                                setAdminPriority(prev => ({ ...prev, [game._id]: game.priority || 0 }));
                              }
                            }}
                            className="text-gray-400 hover:text-blue-400 transition-all duration-300"
                            title="Admin Controls"
                          >
                            <span className="text-lg">⚙️</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Game Content */}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-white mb-2">{game.title}</h3>
                    <p className="text-gray-300 mb-4">{game.description}</p>

                    {/* Thumbnail */}
                    {game.thumbnailUrl && (
                      <img
                        src={game.thumbnailUrl}
                        alt={game.title}
                        className="w-full max-w-md mx-auto rounded-lg mb-4"
                      />
                    )}

                    {/* Game Link */}
                    <div className="bg-orange-900/30 border border-orange-500/30 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-orange-300 font-semibold">🎮 Play on itch.io</div>
                          <div className="text-gray-400 text-sm">{game.itchIoUrl}</div>
                        </div>
                        <button
                          onClick={() => handlePlayClick(game._id, game.itchIoUrl)}
                          className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg transition-all duration-300"
                        >
                          Play Now →
                        </button>
                      </div>
                    </div>

                    {/* Tags and Genre */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {game.genre && (
                        <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm">
                          {game.genre}
                        </span>
                      )}
                      {game.tags.map((tag, index) => (
                        <span key={index} className="bg-gray-600/50 text-gray-300 px-3 py-1 rounded-full text-sm">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Admin Controls Panel */}
                  {showAdminControls[game._id] && adminCheck && (
                    <div className="mb-4 p-4 bg-gray-700/50 rounded-lg border border-orange-500/30">
                      <h4 className="text-white font-semibold mb-3">Admin Controls</h4>

                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Color Control */}
                        <div>
                          <label className="block text-gray-300 text-sm mb-2">Post Color</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={adminColor[game._id] || game.color || '#8B5CF6'}
                              onChange={(e) => setAdminColor(prev => ({ ...prev, [game._id]: e.target.value }))}
                              className="w-12 h-8 rounded border border-gray-600"
                            />
                            <input
                              type="text"
                              value={adminColor[game._id] || game.color || '#8B5CF6'}
                              onChange={(e) => setAdminColor(prev => ({ ...prev, [game._id]: e.target.value }))}
                              className="flex-1 bg-gray-600/50 border border-gray-600 rounded px-3 py-1 text-white text-sm"
                              placeholder="#8B5CF6"
                              pattern="^#[0-9A-Fa-f]{6}$"
                            />
                          </div>
                        </div>

                        {/* Priority Control */}
                        <div>
                          <label className="block text-gray-300 text-sm mb-2">Priority (0-100)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={adminPriority[game._id] ?? game.priority ?? 0}
                            onChange={(e) => setAdminPriority(prev => ({ ...prev, [game._id]: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-gray-600/50 border border-gray-600 rounded px-3 py-1 text-white text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleUpdateColor(game._id)}
                          disabled={adminUpdating === game._id}
                          className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg transition-all duration-300 text-sm"
                        >
                          {adminUpdating === game._id ? 'Updating...' : 'Update Color'}
                        </button>
                        <button
                          onClick={() => handleUpdatePriority(game._id)}
                          disabled={adminUpdating === game._id}
                          className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg transition-all duration-300 text-sm"
                        >
                          {adminUpdating === game._id ? 'Updating...' : 'Update Priority'}
                        </button>
                        <button
                          onClick={() => setShowAdminControls(prev => ({ ...prev, [game._id]: false }))}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-all duration-300 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between border-t border-gray-600 pt-4">
                    <div className="flex items-center space-x-6">
                      <button
                        onClick={() => handleLike(game._id)}
                        className={`flex items-center space-x-2 transition-all duration-300 ${
                          isLiked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'
                        }`}
                      >
                        <span className="text-lg">{isLiked ? '❤️' : '🤍'}</span>
                        <span>{game.likes.length}</span>
                      </button>

                      <button
                        onClick={() => setShowComments(prev => ({ ...prev, [game._id]: !prev[game._id] }))}
                        className="flex items-center space-x-2 text-gray-400 hover:text-orange-400 transition-all duration-300"
                      >
                        <span className="text-lg">💬</span>
                        <span>{game.comments.length}</span>
                      </button>

                      {/* Admin Delete Button */}
                      {(() => {
                        const userId = (session?.user as any)?.id ||
                                     (session?.user as any)?.sub ||
                                     session?.user?.email;

                        const adminCheck = isAdmin(userId);

                        return session?.user && adminCheck && (
                          <button
                            onClick={() => handleDeleteGame(game._id)}
                            className="flex items-center space-x-2 text-gray-400 hover:text-red-500 transition-all duration-300"
                            title="Delete game (Admin only)"
                          >
                            <span className="text-lg">🗑️</span>
                            <span className="text-sm">Delete</span>
                          </button>
                        );
                      })()}
                    </div>

                    <div className="text-gray-400 text-sm">
                      👁️ {game.views}
                    </div>
                  </div>

                  {/* Comments Section */}
                  {commentsVisible && (
                    <div className="border-t border-gray-600 pt-4 mt-4">
                      <h4 className="text-white font-semibold mb-4">Comments</h4>

                      {/* Add Comment */}
                      <div className="mb-4">
                        <div className="flex gap-3">
                          <Image
                            src={session?.user?.image || `https://cdn.discordapp.com/embed/avatars/0.png`}
                            alt={(session?.user as any)?.nickname || session?.user?.name || 'User'}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full"
                          />
                          <div className="flex-1">
                            <textarea
                              value={newComment[game._id] || ''}
                              onChange={(e) => setNewComment(prev => ({ ...prev, [game._id]: e.target.value }))}
                              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400 resize-none"
                              placeholder="Write a comment..."
                              rows={2}
                              maxLength={500}
                            />
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-gray-400 text-sm">
                                {(newComment[game._id] || '').length}/500
                              </span>
                              <button
                                onClick={() => handleAddComment(game._id)}
                                disabled={!newComment[game._id]?.trim() || commentingOn === game._id}
                                className="bg-orange-600 hover:bg-orange-500 disabled:bg-gray-500 text-white px-4 py-1 rounded-lg transition-all duration-300 text-sm"
                              >
                                {commentingOn === game._id ? 'Posting...' : 'Comment'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Comments List */}
                      <div className="space-y-3">
                        {game.comments.map((comment) => (
                          <div key={comment._id} className="flex gap-3">
                            <Image
                              src={comment.avatar || `https://cdn.discordapp.com/embed/avatars/0.png`}
                              alt={comment.username}
                              width={32}
                              height={32}
                              className="w-8 h-8 rounded-full"
                            />
                            <div className="flex-1 bg-gray-700/30 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-white font-semibold text-sm">{comment.username}</span>
                                <span className="text-gray-400 text-xs">{new Date(comment.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="text-gray-300 text-sm">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default GameSpace;
