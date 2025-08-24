'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface VoiceActivity {
  userId: string;
  username: string;
  globalName?: string;
  avatar?: string;
  voiceJoinCount: number;
  totalVoiceTime: number;
  lastVoiceJoin?: string;
  lastVoiceLeave?: string;
  userType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VoiceSession {
  _id: string;
  userId: string;
  username: string;
  globalName?: string;
  channelId: string;
  channelName: string;
  joinTime: string;
  leaveTime?: string;
  duration?: number;
  createdAt: string;
}

interface VoiceStatistics {
  totalSessions: number;
  totalDuration: number;
  avgSessionDuration: number;
  longestSession: number;
  mostActiveChannel: string;
}

interface ServerInfo {
  guildId: string;
  guildName: string;
  description: string;
}

export default function VoiceActivityPage() {
  const { data: session } = useSession();
  const [voiceActivity, setVoiceActivity] = useState<VoiceActivity | null>(null);
  const [voiceSessions, setVoiceSessions] = useState<VoiceSession[]>([]);
  const [statistics, setStatistics] = useState<VoiceStatistics | null>(null);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchVoiceActivity();
    }
  }, [session]);

  const fetchVoiceActivity = async () => {
    if (!session?.user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/voice-activity');
      const data = await response.json();

      if (response.ok && data.success) {
        setVoiceActivity(data.data.voiceActivity);
        setVoiceSessions(data.data.voiceSessions);
        setStatistics(data.data.statistics);
        setServerInfo(data.data.serverInfo);
      } else {
        setError(data.error || 'Failed to fetch voice activity');
      }
    } catch (error) {
      setError('Network error occurred');
      console.error('Error fetching voice activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">🎤 Voice Activity</h1>
          <p className="text-blue-200 text-lg">Track your voice chat activity in Discord</p>
          
          {serverInfo && (
            <div className="mt-4 bg-white/5 rounded-xl p-4 border border-white/10 inline-block">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-orange-400 text-lg">🏠</span>
                <span className="text-white font-semibold">{serverInfo.guildName}</span>
                <span className="text-gray-400 text-sm">({serverInfo.guildId})</span>
              </div>
              <p className="text-blue-200 text-sm mt-1">{serverInfo.description}</p>
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-blue-200">Loading voice activity data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-6">
            <h3 className="text-red-400 font-semibold mb-2">❌ Error</h3>
            <p className="text-red-300">{error}</p>
            <button
              onClick={fetchVoiceActivity}
              className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && voiceActivity && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                <div className="text-3xl font-bold text-blue-300 mb-2">
                  {voiceActivity.voiceJoinCount}
                </div>
                <div className="text-blue-200">Total Joins</div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                <div className="text-3xl font-bold text-green-300 mb-2">
                  {formatDuration(voiceActivity.totalVoiceTime)}
                </div>
                <div className="text-green-200">Total Time</div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                <div className="text-3xl font-bold text-purple-300 mb-2">
                  {voiceActivity.lastVoiceJoin ? formatDate(voiceActivity.lastVoiceJoin) : 'Never'}
                </div>
                <div className="text-purple-200">Last Join</div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                <div className="text-3xl font-bold text-yellow-300 mb-2">
                  {voiceActivity.lastVoiceLeave ? formatDate(voiceActivity.lastVoiceLeave) : 'Never'}
                </div>
                <div className="text-yellow-200">Last Leave</div>
              </div>
            </div>

            {/* Detailed Statistics */}
            {statistics && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h2 className="text-2xl font-bold text-white mb-4">📊 Detailed Statistics</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-300">{statistics.totalSessions}</div>
                    <div className="text-blue-200 text-sm">Total Sessions</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-300">{formatDuration(statistics.totalDuration)}</div>
                    <div className="text-green-200 text-sm">Total Duration</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-300">{formatDuration(statistics.avgSessionDuration)}</div>
                    <div className="text-purple-200 text-sm">Avg Session</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-300">{formatDuration(statistics.longestSession)}</div>
                    <div className="text-yellow-200 text-sm">Longest Session</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-300 truncate">{statistics.mostActiveChannel}</div>
                    <div className="text-orange-200 text-sm">Most Active Channel</div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Voice Sessions */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4">🕐 Recent Voice Sessions</h2>
              
              {voiceSessions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🎤</div>
                  <p className="text-blue-200 text-lg">No voice sessions found</p>
                  <p className="text-blue-300 text-sm">Join a voice channel to start tracking your activity!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-3 px-4 text-blue-300 font-semibold">Channel</th>
                        <th className="py-3 px-4 text-blue-300 font-semibold">Join Time</th>
                        <th className="py-3 px-4 text-blue-300 font-semibold">Leave Time</th>
                        <th className="py-3 px-4 text-blue-300 font-semibold">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voiceSessions.map((session) => (
                        <tr key={session._id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-4 text-white">
                            <div className="flex items-center">
                              <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                              {session.channelName}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-blue-200">{formatDate(session.joinTime)}</td>
                          <td className="py-3 px-4 text-blue-200">
                            {session.leaveTime ? formatDate(session.leaveTime) : 'Active'}
                          </td>
                          <td className="py-3 px-4 text-green-300">
                            {session.duration ? formatDuration(session.duration) : 'In Progress'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4">👤 User Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-blue-300 mb-2">Basic Info</h3>
                  <div className="space-y-2 text-blue-200">
                    <div><span className="font-semibold">Username:</span> {voiceActivity.username}</div>
                    {voiceActivity.globalName && (
                      <div><span className="font-semibold">Display Name:</span> {voiceActivity.globalName}</div>
                    )}
                    <div><span className="font-semibold">User Type:</span> {voiceActivity.userType}</div>
                    <div><span className="font-semibold">Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${voiceActivity.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {voiceActivity.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-blue-300 mb-2">Activity Dates</h3>
                  <div className="space-y-2 text-blue-200">
                    <div><span className="font-semibold">First Activity:</span> {formatDate(voiceActivity.createdAt)}</div>
                    <div><span className="font-semibold">Last Updated:</span> {formatDate(voiceActivity.updatedAt)}</div>
                    {voiceActivity.lastVoiceJoin && (
                      <div><span className="font-semibold">Last Voice Join:</span> {formatDate(voiceActivity.lastVoiceJoin)}</div>
                    )}
                    {voiceActivity.lastVoiceLeave && (
                      <div><span className="font-semibold">Last Voice Leave:</span> {formatDate(voiceActivity.lastVoiceLeave)}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
