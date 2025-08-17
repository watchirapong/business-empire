'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface ServerMemberData {
  member: any;
  guild: any;
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
}

export default function DiscordServerMember() {
  const { data: session } = useSession();
  const [guildId, setGuildId] = useState('');
  const [memberData, setMemberData] = useState<ServerMemberData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServerMember = async () => {
    if (!guildId.trim()) {
      setError('Please enter a server ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/discord/server-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guildId: guildId.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setError('You are not a member of this server');
        } else {
          setError(data.error || 'Failed to fetch server member data');
        }
        setMemberData(null);
        return;
      }

      setMemberData(data);
    } catch (error) {
      setError('Failed to fetch server member data');
      setMemberData(null);
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-gray-400">Please log in with Discord to access server member information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <span className="text-2xl">🏠</span>
          <span>Discord Server Member Lookup</span>
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            value={guildId}
            onChange={(e) => setGuildId(e.target.value)}
            placeholder="Enter Discord Server ID"
            className="flex-1 bg-white/10 border border-orange-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400 transition-colors"
          />
          <button
            onClick={fetchServerMember}
            disabled={loading}
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Lookup Member'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}
      </div>

      {/* Results Section */}
      {memberData && (
        <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
            <span className="text-2xl">✅</span>
            <span>Server Member Information</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Server Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-orange-400">Server Info</h4>
              
              {memberData.serverInfo.guildIcon && (
                <div className="flex items-center space-x-3">
                  <img
                    src={getGuildIconUrl(memberData.serverInfo.guildId, memberData.serverInfo.guildIcon) || ''}
                    alt="Server Icon"
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <div className="text-white font-semibold">{memberData.serverInfo.guildName}</div>
                    <div className="text-gray-400 text-sm">Server ID: {memberData.serverInfo.guildId}</div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Joined Server:</span>
                  <span className="text-white">
                    {new Date(memberData.serverInfo.joinedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Roles:</span>
                  <span className="text-white">{memberData.serverInfo.roles.length}</span>
                </div>
                {memberData.serverInfo.nick && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Nickname:</span>
                    <span className="text-white">{memberData.serverInfo.nick}</span>
                  </div>
                )}
              </div>
            </div>

            {/* User Information */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-orange-400">User Info</h4>
              
              <div className="flex items-center space-x-3">
                <img
                  src={getDiscordAvatarUrl(
                    memberData.serverInfo.userId,
                    memberData.serverInfo.avatar,
                    memberData.serverInfo.guildId
                  )}
                  alt="User Avatar"
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <div className="text-white font-semibold">
                    {memberData.serverInfo.nick || (session.user as any).username}
                  </div>
                  <div className="text-gray-400 text-sm">
                    User ID: {memberData.serverInfo.userId}
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
          {memberData.serverInfo.roles.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-orange-400 mb-3">Roles</h4>
              <div className="flex flex-wrap gap-2">
                {memberData.serverInfo.roles.map((roleId: string) => (
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
        </div>
      )}
    </div>
  );
}
