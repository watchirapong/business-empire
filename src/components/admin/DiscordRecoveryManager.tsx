'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface DiscordUser {
  discordId: string;
  username: string;
  globalName: string;
  nickname: string | null;
  displayName: string;
  roles: string[];
  joinedAt: string;
}

interface RecoveryResults {
  success: boolean;
  discordUsers?: number;
  saveResults?: {
    created: number;
    updated: number;
    errorCount: number;
    currencyCreated: number;
    errors: Array<{
      username: string;
      discordId: string;
      error: string;
    }>;
  };
  migrationResults?: {
    migrated: number;
    migrationErrors: number;
    errorDetails: Array<{
      username: string;
      discordId: string;
      error: string;
    }>;
  };
  serverDataResults?: {
    updated: number;
    serverDataErrors: number;
    errorDetails: Array<{
      username: string;
      discordId: string;
      error: string;
    }>;
  };
  message?: string;
  error?: string;
}

export default function DiscordRecoveryManager() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [previewUsers, setPreviewUsers] = useState<DiscordUser[]>([]);
  const [recoveryResults, setRecoveryResults] = useState<RecoveryResults | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const fetchPreview = async () => {
    try {
      setIsPreviewLoading(true);
      setMessage('');
      
      const response = await fetch('/api/admin/discord-recovery');
      const data = await response.json();
      
      if (response.ok) {
        setPreviewUsers(data.users || []);
        setMessage(`Found ${data.userCount} users with role 1397111512619028551`);
        setShowPreview(true);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error fetching preview:', error);
      setMessage('Failed to fetch Discord users');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const performRecovery = async () => {
    try {
      setIsLoading(true);
      setMessage('');
      
      const response = await fetch('/api/admin/discord-recovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setRecoveryResults(data.results);
        setMessage(data.results.message || 'Recovery completed successfully!');
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error performing recovery:', error);
      setMessage('Failed to perform recovery');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleDisplay = (roles: string[]) => {
    const roleMap: { [key: string]: string } = {
      '1397111512619028551': '🎯 Target Role',
      '1376806398649700402': '⭐ Special Role',
      '1408421183409356800': '🔥 Fire Role',
      '1410273271588585567': '💎 Diamond Role',
      '1170819248038346814': '👑 Crown Role',
      '1170800265566367775': '🌟 Star Role',
      '1392710209608351806': '🚀 Rocket Role',
      '1413435124955217930': '🎨 Artist Role',
      '1170814048229670932': '💻 Developer Role'
    };

    return roles.map(roleId => roleMap[roleId] || `Role ${roleId}`).join(', ');
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          🔄 Discord User Recovery
        </h2>
        <div className="text-sm text-gray-400">
          Role: 1397111512619028551
        </div>
      </div>

      <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="text-yellow-400 text-xl">⚠️</div>
          <div>
            <h3 className="text-yellow-400 font-semibold mb-2">MongoDB Recovery Process</h3>
            <p className="text-gray-300 text-sm mb-2">
              This tool will recover user data from Discord and create new accounts with 100 hamstercoins each.
            </p>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Fetches all users with role 1397111512619028551 from Discord</li>
              <li>• Creates/updates user accounts in MongoDB</li>
              <li>• Gives 100 hamstercoins to each user</li>
              <li>• Creates enhanced user model with Discord server data</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={fetchPreview}
          disabled={isPreviewLoading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white px-4 py-2 rounded-lg transition-all duration-300"
        >
          {isPreviewLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Loading Preview...
            </>
          ) : (
            <>
              👁️ Preview Users
            </>
          )}
        </button>

        <button
          onClick={performRecovery}
          disabled={isLoading || previewUsers.length === 0}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white px-4 py-2 rounded-lg transition-all duration-300"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Recovering...
            </>
          ) : (
            <>
              🚀 Start Recovery
            </>
          )}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.includes('Error') || message.includes('Failed') 
            ? 'bg-red-900/20 border border-red-500/30 text-red-300' 
            : 'bg-green-900/20 border border-green-500/30 text-green-300'
        }`}>
          {message}
        </div>
      )}

      {showPreview && previewUsers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            👥 Users Found ({previewUsers.length})
          </h3>
          <div className="bg-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto">
            <div className="grid gap-3">
              {previewUsers.map((user) => (
                <div key={user.discordId} className="bg-gray-600 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">
                        {user.displayName}
                      </div>
                      <div className="text-sm text-gray-300">
                        @{user.username}
                        {user.nickname && (
                          <span className="ml-2 text-blue-300">
                            (Server Nickname: {user.nickname})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        ID: {user.discordId}
                        {user.globalName && user.globalName !== user.username && (
                          <span className="ml-2 text-green-300">
                            • Global: {user.globalName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">
                        Joined: {formatDate(user.joinedAt)}
                      </div>
                      <div className="text-xs text-yellow-300 mt-1">
                        {getRoleDisplay(user.roles)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {recoveryResults && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">📊 Recovery Results</h3>
          
          {recoveryResults.saveResults && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3">💾 User Data Recovery</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {recoveryResults.saveResults.created}
                  </div>
                  <div className="text-gray-300">Users Created</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {recoveryResults.saveResults.updated}
                  </div>
                  <div className="text-gray-300">Users Updated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {recoveryResults.saveResults.currencyCreated}
                  </div>
                  <div className="text-gray-300">Currency Accounts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {recoveryResults.saveResults.errorCount}
                  </div>
                  <div className="text-gray-300">Errors</div>
                </div>
              </div>
            </div>
          )}

          {recoveryResults.migrationResults && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3">🔄 Enhanced Model Migration</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {recoveryResults.migrationResults.migrated}
                  </div>
                  <div className="text-gray-300">Users Migrated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {recoveryResults.migrationResults.migrationErrors}
                  </div>
                  <div className="text-gray-300">Migration Errors</div>
                </div>
              </div>
            </div>
          )}

          {recoveryResults.serverDataResults && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3">🏷️ Discord Server Data (Nicknames & Roles)</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {recoveryResults.serverDataResults.updated}
                  </div>
                  <div className="text-gray-300">Users Updated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {recoveryResults.serverDataResults.serverDataErrors}
                  </div>
                  <div className="text-gray-300">Update Errors</div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-300">
              <span className="text-xl">✅</span>
              <span className="font-semibold">Recovery Complete!</span>
            </div>
            <p className="text-gray-300 text-sm mt-2">
              All users with role 1397111512619028551 have been recovered with their Discord nicknames, roles, and given 100 hamstercoins each.
              The enhanced user management system with full Discord server data is now ready to use.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
