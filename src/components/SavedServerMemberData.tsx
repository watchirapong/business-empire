'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface SavedServerData {
  userId: string;
  serverId: string;
  serverData: {
    member: any;
    guild: any;
    user: any;
    serverInfo: {
      guildId: string;
      userId: string;
      joinedAt: string;
      roles: string[];
      nick: string | null;
      avatar: string | null;
      guildName: string | null;
      guildIcon: string | null;
    };
  };
  lastUpdated: string;
}

export default function SavedServerMemberData() {
  const { data: session } = useSession();
  const [serverData, setServerData] = useState<SavedServerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedServerData = useCallback(async () => {
    if (!session?.user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/save-server-data?userId=${(session.user as any).id}&serverId=874924600306335794`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('No server member data found for this user');
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to fetch server data');
        }
        setServerData(null);
        return;
      }

      const data = await response.json();
      setServerData(data.data);
    } catch (error) {
      setError('Failed to fetch server data');
      setServerData(null);
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    if (session?.user) {
      fetchSavedServerData();
    }
  }, [session, fetchSavedServerData]);

  const getDiscordAvatarUrl = (userId: string, avatar: string | null, guildId: string) => {
    if (avatar) {
      return `https://cdn.discordapp.com/guilds/${guildId}/users/${userId}/avatars/${avatar}.png`;
    }
    return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
  };

  const getGuildIconUrl = (guildId: string, icon: string | null) => {
    if (icon) {
      return `https://cdn.discordapp.com/icons/${guildId}/${icon}.png`;
    }
    return null;
  };

  if (!session) {
    return (
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-8">
        <div className="text-center">
          <div className="text-2xl mb-4">🔐</div>
          <h3 className="text-xl font-bold text-white mb-2">Authentication Required</h3>
          <p className="text-gray-400">Please log in with Discord to view server member data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <span className="text-2xl">💾</span>
          <span>Saved Discord Server Data</span>
        </h3>
        
        <div className="flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            Server ID: 874924600306335794
          </div>
          <button
            onClick={fetchSavedServerData}
            disabled={loading}
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}
      </div>

      {/* Data Display */}
      {serverData && (
        <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
            <span className="text-2xl">✅</span>
            <span>Server Member Information</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Server Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-orange-400">Server Info</h4>
              
              {serverData.serverData.serverInfo.guildIcon && (
                <div className="flex items-center space-x-3">
                  <img
                    src={getGuildIconUrl(serverData.serverData.serverInfo.guildId, serverData.serverData.serverInfo.guildIcon) || ''}
                    alt="Server Icon"
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <div className="text-white font-semibold">{serverData.serverData.serverInfo.guildName}</div>
                    <div className="text-gray-400 text-sm">Server ID: {serverData.serverData.serverInfo.guildId}</div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Joined Server:</span>
                  <span className="text-white">
                    {new Date(serverData.serverData.serverInfo.joinedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Roles:</span>
                  <span className="text-white">{serverData.serverData.serverInfo.roles.length}</span>
                </div>
                {serverData.serverData.serverInfo.nick && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Nickname:</span>
                    <span className="text-white">{serverData.serverData.serverInfo.nick}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Last Updated:</span>
                  <span className="text-white">
                    {new Date(serverData.lastUpdated).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* User Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-orange-400">User Info</h4>
              
              <div className="flex items-center space-x-3">
                <img
                  src={getDiscordAvatarUrl(
                    serverData.serverData.serverInfo.userId,
                    serverData.serverData.serverInfo.avatar,
                    serverData.serverData.serverInfo.guildId
                  )}
                  alt="User Avatar"
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <div className="text-white font-semibold">
                    {serverData.serverData.serverInfo.nick || (session.user as any).username}
                  </div>
                  <div className="text-gray-400 text-sm">
                    User ID: {serverData.serverData.serverInfo.userId}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Username:</span>
                  <span className="text-white">{(session.user as any).username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Discriminator:</span>
                  <span className="text-white">#{(session.user as any).discriminator}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Roles List */}
          {serverData.serverData.serverInfo.roles.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-orange-400 mb-3">Roles</h4>
              <div className="flex flex-wrap gap-2">
                {serverData.serverData.serverInfo.roles.map((roleId: string) => (
                  <span
                    key={roleId}
                    className="bg-orange-500/20 border border-orange-500/30 text-orange-300 px-3 py-1 rounded-full text-sm"
                  >
                    {roleId}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Raw Data (for debugging) */}
          <details className="mt-6">
            <summary className="text-orange-400 cursor-pointer font-semibold">
              View Raw Data
            </summary>
            <pre className="mt-2 p-4 bg-black/20 rounded-lg text-xs text-gray-300 overflow-x-auto">
              {JSON.stringify(serverData, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
