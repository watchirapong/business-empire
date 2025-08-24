'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function ServerNicknameTest() {
  const { data: session } = useSession();
  const [nicknameData, setNicknameData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [updatingHistory, setUpdatingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  const fetchServerNickname = async () => {
    if (!session?.user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/get-server-nickname');
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to fetch server nickname');
        setNicknameData(null);
        return;
      }

      setNicknameData(data);
    } catch (error) {
      setError('Failed to fetch server nickname');
      setNicknameData(null);
      console.error('Error fetching server nickname:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUsernameHistory = async () => {
    if (!session?.user) return;

    setUpdatingHistory(true);
    setUpdateMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/users/force-update-nickname', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update username history');
        return;
      }

      setUpdateMessage('✅ Username history updated successfully! Your nickname is now saved.');
      
      // Refresh the page after a short delay to show updated data
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }, 2000);

    } catch (error) {
      setError('Failed to update username history');
      console.error('Error updating username history:', error);
    } finally {
      setUpdatingHistory(false);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-blue-400 font-semibold text-lg">🔍 Server Nickname Test</h4>
        <button
          onClick={fetchServerNickname}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? 'Testing...' : 'Test Server Nickname'}
        </button>
      </div>

      {error && (
        <div className="bg-red-600/20 border border-red-500/30 rounded-lg p-4 mb-4">
          <h5 className="text-red-400 font-semibold mb-2">Error:</h5>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {updateMessage && (
        <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4 mb-4">
          <h5 className="text-green-400 font-semibold mb-2">Success:</h5>
          <p className="text-green-300 text-sm">{updateMessage}</p>
        </div>
      )}

      {nicknameData && (
        <div className="bg-white/5 rounded-lg p-4 border border-blue-500/20">
          <h5 className="text-blue-400 font-semibold mb-3">Server Member Data:</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Server Name:</span>
              <span className="text-white font-semibold text-lg">{nicknameData.guildName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">User ID:</span>
              <span className="text-white">{nicknameData.userId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Server ID:</span>
              <span className="text-white">{nicknameData.guildId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Nickname:</span>
              <span className={`font-semibold ${nicknameData.nickname ? 'text-green-400' : 'text-red-400'}`}>
                {nicknameData.nickname || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Joined At:</span>
              <span className="text-white">{new Date(nicknameData.joinedAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Roles:</span>
              <span className="text-white">{nicknameData.roles.length} roles</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Server Avatar:</span>
              <span className="text-white">{nicknameData.avatar ? 'Yes' : 'No'}</span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-green-600/20 border border-green-500/30 rounded-lg">
            <p className="text-green-400 text-sm">{nicknameData.message}</p>
          </div>
          
          {/* Update Username History Button */}
          <div className="mt-4">
            <button
              onClick={updateUsernameHistory}
              disabled={updatingHistory}
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2"
            >
              <span className="text-lg">{updatingHistory ? '⏳' : '💾'}</span>
              <span>{updatingHistory ? 'Updating...' : 'Save Nickname to History'}</span>
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-600/10 border border-blue-500/20 rounded-lg">
        <h5 className="text-blue-400 font-semibold mb-2">About This Test:</h5>
        <p className="text-gray-300 text-sm">
          This test directly fetches your server member data from Discord to check if your nickname is properly set and accessible.
          If the nickname shows as &quot;Not set&quot;, it means either you don&apos;t have a nickname in the server, or there&apos;s an issue with the bot permissions.
        </p>
      </div>
    </div>
  );
}
