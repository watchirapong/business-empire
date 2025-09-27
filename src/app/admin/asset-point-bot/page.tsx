'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface TrackingData {
  lastRun: string | null;
  dailyCounts: { [date: string]: number };
}

interface LogEntry {
  timestamp: string;
  message: string;
}

export default function AssetPointBotAdminPage() {
  const { data: session } = useSession();
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = session?.user && ['898059066537029692', '664458019442262018', '547402456363958273', '535471828525776917', '315548736388333568'].includes((session.user as any).id);

  const fetchTrackingData = async () => {
    try {
      const response = await fetch('/api/admin/asset-point-bot/tracking');
      const data = await response.json();

      if (response.ok) {
        setTrackingData(data);
      } else {
        setError('Failed to fetch tracking data');
      }
    } catch (error) {
      setError('Network error while fetching tracking data');
      console.error('Error fetching tracking data:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/admin/asset-point-bot/logs');
      const data = await response.json();

      if (response.ok) {
        setLogs(data.logs || []);
      } else {
        setError('Failed to fetch logs');
      }
    } catch (error) {
      setError('Network error while fetching logs');
      console.error('Error fetching logs:', error);
    }
  };

  const runBot = async () => {
    setRunning(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/asset-point-bot/run', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Bot executed successfully');
        // Refresh data
        await fetchTrackingData();
        await fetchLogs();
      } else {
        setError(data.error || 'Failed to run bot');
      }
    } catch (error) {
      setError('Network error while running bot');
      console.error('Error running bot:', error);
    } finally {
      setRunning(false);
    }
  };

  const resetDailyCount = async () => {
    try {
      const response = await fetch('/api/admin/asset-point-bot/reset', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Daily count reset successfully');
        await fetchTrackingData();
      } else {
        setError(data.error || 'Failed to reset daily count');
      }
    } catch (error) {
      setError('Network error while resetting daily count');
      console.error('Error resetting daily count:', error);
    }
  };

  useEffect(() => {
    if (session && isAdmin) {
      fetchTrackingData();
      fetchLogs();
      setLoading(false);
    }
  }, [session, isAdmin]);

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

  const today = new Date().toISOString().split('T')[0];
  const todayCount = trackingData?.dailyCounts[today] || 0;
  const lastRun = trackingData?.lastRun ? new Date(trackingData.lastRun) : null;
  const hoursSinceLastRun = lastRun ? (new Date().getTime() - lastRun.getTime()) / (1000 * 60 * 60) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">💰 Asset Point Bot Admin</h1>
          <p className="text-blue-200 text-lg">จัดการบอทให้ AssetPoint อัตโนมัติ</p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Success Message */}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
              <h3 className="text-green-400 font-semibold mb-2">✅ สำเร็จ</h3>
              <p className="text-green-300">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <h3 className="text-red-400 font-semibold mb-2">❌ เกิดข้อผิดพลาด</h3>
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Control Panel */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">🎮 Control Panel</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <button
                onClick={runBot}
                disabled={running}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
              >
                {running ? '🔄 กำลังรัน...' : '▶️ รันบอท'}
              </button>

              <button
                onClick={() => { fetchTrackingData(); fetchLogs(); }}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
              >
                {loading ? '🔄 กำลังโหลด...' : '📊 รีเฟรชข้อมูล'}
              </button>

              <button
                onClick={resetDailyCount}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105"
              >
                🔄 รีเซ็ตจำนวนรายวัน
              </button>
            </div>

            {/* Status Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-blue-500/20 rounded-lg p-4">
                <div className="text-blue-300 font-semibold mb-1">จำนวนวันนี้</div>
                <div className="text-2xl font-bold text-blue-200">{todayCount}/2</div>
              </div>

              <div className="bg-green-500/20 rounded-lg p-4">
                <div className="text-green-300 font-semibold mb-1">รันครั้งล่าสุด</div>
                <div className="text-lg font-bold text-green-200">
                  {lastRun ? lastRun.toLocaleString('th-TH') : 'ไม่เคยรัน'}
                </div>
              </div>

              <div className="bg-purple-500/20 rounded-lg p-4">
                <div className="text-purple-300 font-semibold mb-1">เวลาที่ผ่านไป</div>
                <div className="text-lg font-bold text-purple-200">
                  {hoursSinceLastRun ? `${hoursSinceLastRun.toFixed(1)} ชั่วโมง` : 'N/A'}
                </div>
              </div>

              <div className="bg-orange-500/20 rounded-lg p-4">
                <div className="text-orange-300 font-semibold mb-1">ต้องการ Voice Time</div>
                <div className="text-lg font-bold text-orange-200">
                  120 นาที/วัน
                </div>
              </div>
            </div>
          </div>

          {/* Tracking Data */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">📊 ข้อมูลการติดตาม</h2>

            {trackingData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">จำนวนรายวัน</h3>
                    <div className="space-y-2">
                      {Object.entries(trackingData.dailyCounts)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .slice(0, 7)
                        .map(([date, count]) => (
                          <div key={date} className="flex justify-between bg-white/5 rounded p-2">
                            <span className="text-blue-200">{date}</span>
                            <span className="text-white font-medium">{count}/2</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">ข้อมูลเพิ่มเติม</h3>
                    <div className="space-y-2 text-blue-200">
                      <p>🎯 User ID: 547402456363958273</p>
                      <p>⏰ ช่วงเวลา: ทุก 2 ชั่วโมง</p>
                      <p>📈 สูงสุดต่อวัน: 2 แต้ม</p>
                      <p>🎤 ต้องการ Voice Time: 120 นาที/วัน</p>
                      <p>🔄 สถานะ: {hoursSinceLastRun && hoursSinceLastRun >= 2 ? 'พร้อมรัน' : 'รอเวลา'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-blue-200">ไม่พบข้อมูลการติดตาม</p>
              </div>
            )}
          </div>

          {/* Logs */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-4">📋 Logs</h2>

            <div className="bg-black/30 rounded-lg p-4 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-blue-300">ไม่มี logs</p>
                </div>
              ) : (
                <div className="space-y-1 font-mono text-sm">
                  {logs.slice(-50).map((log, index) => (
                    <div key={index} className="text-blue-200">
                      <span className="text-gray-400">{log.timestamp}</span> {log.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Information Panel */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10 mt-6">
            <h2 className="text-2xl font-bold text-white mb-4">ℹ️ วิธีการใช้งาน</h2>

            <div className="space-y-4 text-blue-200">
              <div>
                <h3 className="font-semibold text-white mb-2">▶️ การรันบอท</h3>
                <p>คลิกปุ่ม &quot;รันบอท&quot; เพื่อให้ AssetPoint ทันที (จะตรวจสอบเงื่อนไข voice time และเวลา 2 ชั่วโมงอัตโนมัติ)</p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">🎤 Voice Time Requirement</h3>
                <p>ผู้ใช้ต้องมีเวลาอยู่ใน voice channel รวม 120 นาที (2 ชั่วโมง) ต่อวันก่อนที่จะได้รับ AssetPoint</p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">📊 การตรวจสอบสถานะ</h3>
                <p>ดูจำนวนที่ให้ไปแล้วในวันนี้และเวลาที่รันครั้งล่าสุด รวมถึง voice time ของผู้ใช้</p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">🔄 การรีเซ็ต</h3>
                <p>ใช้ปุ่ม &quot;รีเซ็ตจำนวนรายวัน&quot; เพื่อรีเซ็ตเคาน์เตอร์รายวัน (สำหรับการทดสอบ)</p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">📋 Logs</h3>
                <p>ดูประวัติการทำงานของบอท รวมถึงการตรวจสอบ voice time และการให้แต้ม</p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">⏰ การทำงานอัตโนมัติ</h3>
                <p>บอทจะรันอัตโนมัติทุก 2 ชั่วโมงผ่าน cron job แต่จะให้ AssetPoint เฉพาะเมื่อผู้ใช้มี voice time 120 นาทีขึ้นไป (สูงสุด 2 แต้มต่อวัน)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
