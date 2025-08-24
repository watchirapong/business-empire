'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import UpdateExistingData from './UpdateExistingData';

interface UsernameHistoryEntry {
  username: string;
  globalName?: string;
  discriminator?: string;
  nickname?: string;
  changedAt: string;
}

interface UsernameHistoryData {
  userId: string;
  usernameHistory: UsernameHistoryEntry[];
  currentUsername: string;
  currentGlobalName?: string;
  currentDiscriminator?: string;
  currentNickname?: string;
  lastUpdated: string;
}

export default function UsernameHistory() {
  const { data: session } = useSession();
  const [history, setHistory] = useState<UsernameHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsernameHistory = async () => {
    if (!session?.user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/username-history?userId=${(session.user as any).id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch username history');
        return;
      }

      const data = await response.json();
      setHistory(data.history);
    } catch (error) {
      setError('Failed to fetch username history');
      console.error('Error fetching username history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchUsernameHistory();
    }
  }, [session]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!session) {
    return (
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
        <div className="text-center">
          <div className="text-2xl mb-4">🔐</div>
          <h3 className="text-xl font-bold text-white mb-2">Authentication Required</h3>
          <p className="text-gray-400">Please log in to view your username history.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
        <div className="text-center">
          <div className="text-2xl mb-4">⏳</div>
          <h3 className="text-xl font-bold text-white mb-2">Loading...</h3>
          <p className="text-gray-400">Fetching your username history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-red-500/20 p-6">
        <div className="text-center">
          <div className="text-2xl mb-4">❌</div>
          <h3 className="text-xl font-bold text-white mb-2">Error</h3>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={fetchUsernameHistory}
            className="mt-4 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">📝 Username History</h3>
        <button
          onClick={fetchUsernameHistory}
          className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1 rounded text-sm transition-colors"
        >
          Refresh
        </button>
      </div>

      {history && (
        <div className="space-y-4">
          {/* Current Display Name (Priority: Nickname > Global Name > Username) */}
          <div className="bg-white/5 rounded-lg p-4 border border-orange-500/20">
            <h4 className="text-lg font-semibold text-orange-400 mb-2">Current Display Name</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Server Nickname:</span>
                <span className="text-white font-semibold text-lg">
                  {history.currentNickname || 'Not set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Global Name:</span>
                <span className="text-white">{history.currentGlobalName || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Username:</span>
                <span className="text-white">{history.currentUsername}</span>
              </div>
              {history.currentDiscriminator && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Discriminator:</span>
                  <span className="text-white">#{history.currentDiscriminator}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Last Updated:</span>
                <span className="text-white text-sm">{formatDate(history.lastUpdated)}</span>
              </div>
            </div>
          </div>

          {/* Username History */}
          {history.usernameHistory.length > 1 ? (
            <div className="bg-white/5 rounded-lg p-4 border border-orange-500/20">
              <h4 className="text-lg font-semibold text-orange-400 mb-4">Previous Usernames</h4>
              <div className="space-y-3">
                {history.usernameHistory.slice(0, -1).reverse().map((entry, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                                             <div className="flex-1">
                         <div className="text-white font-semibold">{entry.username}</div>
                         {entry.nickname && (
                           <div className="text-orange-400 text-sm font-semibold">Nickname: {entry.nickname}</div>
                         )}
                         {entry.globalName && (
                           <div className="text-gray-300 text-sm">Global: {entry.globalName}</div>
                         )}
                         {entry.discriminator && (
                           <div className="text-gray-300 text-sm">#{entry.discriminator}</div>
                         )}
                       </div>
                      <div className="text-gray-400 text-sm text-right">
                        {formatDate(entry.changedAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white/5 rounded-lg p-4 border border-orange-500/20">
              <div className="text-center">
                <div className="text-2xl mb-2">📝</div>
                <h4 className="text-lg font-semibold text-orange-400 mb-2">No Username History</h4>
                <p className="text-gray-400 mb-4">No username history has been tracked yet. This could be because:</p>
                <ul className="text-gray-400 text-sm mb-4 text-left">
                  <li>• You haven&apos;t accessed server member data before</li>
                  <li>• Your existing data doesn&apos;t include username tracking</li>
                  <li>• You haven&apos;t changed your username since tracking started</li>
                </ul>
                <UpdateExistingData />
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-600/10 rounded-lg p-4 border border-blue-500/20">
            <div className="flex items-start space-x-3">
              <div className="text-blue-400 text-lg">ℹ️</div>
              <div>
                <h4 className="text-blue-400 font-semibold mb-1">About Username History</h4>
                <p className="text-gray-300 text-sm">
                  This history is automatically tracked when you access server member data. 
                  Discord&apos;s API doesn&apos;t provide username history by default, so we track changes 
                  when we detect them. The history starts from when you first used this system.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
