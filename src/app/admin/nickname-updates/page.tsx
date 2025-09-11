'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface UpdateResults {
  total: number;
  updated: number;
  noChange: number;
  notInServer: number;
  noNickname: number;
  failed: number;
  errors: string[];
}

export default function NicknameUpdatesPage() {
  const { data: session } = useSession();
  const [isUpdating, setIsUpdating] = useState(false);
  const [results, setResults] = useState<UpdateResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = session?.user && ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917', '315548736388333568'].includes((session.user as any).id);

  const triggerNicknameUpdate = async () => {
    if (!isAdmin) return;

    setIsUpdating(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/cron/update-nicknames', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'test-secret'}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results);
        setLastUpdate(data.timestamp);
      } else {
        setError(data.error || 'Failed to update nicknames');
      }
    } catch (error) {
      setError('Network error occurred');
      console.error('Error updating nicknames:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const testEndpoint = async () => {
    if (!isAdmin) return;

    setIsUpdating(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/cron/update-nicknames?test=true');

      const data = await response.json();

      if (response.ok) {
        setResults(data.results);
        setLastUpdate(data.timestamp);
      } else {
        setError(data.error || 'Failed to test endpoint');
      }
    } catch (error) {
      setError('Network error occurred');
      console.error('Error testing endpoint:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-white mb-4">กำลังโหลด...</h1>
            <p className="text-blue-200">กรุณารอสักครู่</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-4">🚫 Access Denied</h1>
            <p className="text-blue-200">You don&apos;t have permission to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">🔄 Nickname Updates</h1>
          <p className="text-blue-200 text-lg">Manage automatic nickname updates for all users</p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Control Panel */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Control Panel</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={triggerNicknameUpdate}
                disabled={isUpdating}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
              >
                {isUpdating ? '🔄 Updating...' : '🚀 Trigger Nickname Update'}
              </button>

              <button
                onClick={testEndpoint}
                disabled={isUpdating}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
              >
                {isUpdating ? '🔄 Testing...' : '🧪 Test Endpoint'}
              </button>
            </div>

            {lastUpdate && (
              <div className="text-sm text-blue-300">
                Last update: {new Date(lastUpdate).toLocaleString()}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <h3 className="text-red-400 font-semibold mb-2">❌ Error</h3>
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Results Display */}
          {results && (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4">📊 Update Results</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-300">{results.total}</div>
                  <div className="text-sm text-blue-200">Total Users</div>
                </div>
                
                <div className="bg-green-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-300">{results.updated}</div>
                  <div className="text-sm text-green-200">Updated</div>
                </div>
                
                <div className="bg-yellow-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-300">{results.noChange}</div>
                  <div className="text-sm text-yellow-200">No Change</div>
                </div>
                
                <div className="bg-red-500/20 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-300">{results.failed}</div>
                  <div className="text-sm text-red-200">Failed</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-orange-500/20 rounded-lg p-4">
                  <div className="text-lg font-bold text-orange-300 mb-2">Not in Server</div>
                  <div className="text-2xl font-bold text-orange-200">{results.notInServer}</div>
                  <div className="text-sm text-orange-300">Users not found in Discord server</div>
                </div>
                
                <div className="bg-purple-500/20 rounded-lg p-4">
                  <div className="text-lg font-bold text-purple-300 mb-2">No Nickname</div>
                  <div className="text-2xl font-bold text-purple-200">{results.noNickname}</div>
                  <div className="text-sm text-purple-300">Users without server nicknames</div>
                </div>
              </div>

              {/* Error Details */}
              {results.errors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <h3 className="text-red-400 font-semibold mb-2">❌ Errors ({results.errors.length})</h3>
                  <div className="max-h-40 overflow-y-auto">
                    {results.errors.map((error, index) => (
                      <div key={index} className="text-red-300 text-sm mb-1">
                        • {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Information Panel */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-4">ℹ️ Information</h2>
            
            <div className="space-y-4 text-blue-200">
              <div>
                <h3 className="font-semibold text-white mb-2">🕐 Automatic Updates</h3>
                <p>Nicknames are automatically updated daily via cron job at 2:00 AM.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-white mb-2">🔒 Security</h3>
                <p>This endpoint is protected by Bearer token authentication. Only authorized cron jobs should access it.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-white mb-2">📈 Performance</h3>
                <p>The system processes users sequentially with 100ms delays to respect Discord API rate limits.</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-white mb-2">📊 Tracking</h3>
                <p>All nickname changes are tracked in the UsernameHistory collection for audit purposes.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
