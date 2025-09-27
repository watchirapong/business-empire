'use client';

import { useState, useEffect } from 'react';

interface MissionApproval {
  _id: string;
  id: string;
  userId: string;
  ownerId: string;
  missionId: string;
  username?: string;
  missionName?: string;
  currentStatus: 'pending' | 'approved' | 'rejected';
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  reward?: {
    skills: any[];
    items: any[];
    coin: number;
    assetPoint: number;
  };
  nickname?: string;
  profile?: {
    username: string;
    globalName?: string;
    discriminator?: string;
    avatar?: string;
    rank?: string;
    house?: string;
  };
}

interface ApiResponse {
  success: boolean;
  data?: MissionApproval[];
  error?: string;
}

export default function HamsterMapAdminPage() {
  const [missions, setMissions] = useState<MissionApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [nicknames, setNicknames] = useState<Record<string, any>>({});
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [showAssetPointModal, setShowAssetPointModal] = useState(false);
  const [selectedMission, setSelectedMission] = useState<MissionApproval | null>(null);
  const [assetPointAmount, setAssetPointAmount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'missions' | 'add-assetpoint' | 'update-nickname'>('missions');
  const [addAssetPointUserId, setAddAssetPointUserId] = useState<string>('');
  const [addAssetPointAmount, setAddAssetPointAmount] = useState<number>(0);
  const [addAssetPointLoading, setAddAssetPointLoading] = useState(false);
  const [updateNicknameUserId, setUpdateNicknameUserId] = useState<string>('');
  const [updateNicknameNewNickname, setUpdateNicknameNewNickname] = useState<string>('');
  const [updateNicknameLoading, setUpdateNicknameLoading] = useState(false);

  const fetchNicknames = async (ownerIds: string[]) => {
    if (ownerIds.length === 0) return {};
    
    try {
      const response = await fetch('/api/users/nicknames', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: ownerIds })
      });
      
      const data = await response.json();
      
      if (response.ok && data.nicknames) {
        // Convert the response format to match our expected format
        const nicknameMap: Record<string, any> = {};
        Object.entries(data.nicknames).forEach(([userId, nickname]) => {
          nicknameMap[userId] = { nickname };
        });
        return nicknameMap;
      } else {
        console.error('Failed to fetch nicknames:', data.error);
        return {};
      }
    } catch (error) {
      console.error('Error fetching nicknames:', error);
      return {};
    }
  };

  const fetchDiscordProfiles = async (ownerIds: string[]) => {
    if (ownerIds.length === 0) return {};
    
    const profileMap: Record<string, any> = {};
    
    // Fetch profiles for each user ID
    for (const userId of ownerIds) {
      try {
        // Fetch user profile
        const profileResponse = await fetch(`/api/users/profile/${userId}`);
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (profileData.success && profileData.user) {
            profileMap[userId] = {
              username: profileData.user.username,
              globalName: profileData.user.globalName,
              discriminator: profileData.user.discriminator,
              avatar: profileData.user.avatar,
              nickname: profileData.nickname
            };
          }
        }

        // Fetch user rank
        const rankResponse = await fetch(`/api/users/get-rank?userId=${userId}`);
        if (rankResponse.ok) {
          const rankData = await rankResponse.json();
          if (profileMap[userId]) {
            profileMap[userId].rank = rankData.rank;
            
            // Determine house from roles
            const getHouseFromRoles = (roles: string[]): string => {
              if (roles.includes('1407921062808785017')) return 'Selene';
              if (roles.includes('1407921679757344888')) return 'Pleiades';
              if (roles.includes('1407921686526824478')) return 'Ophira';
              return 'None';
            };
            
            profileMap[userId].house = getHouseFromRoles(rankData.roles || []);
          }
        }
      } catch (error) {
        console.error(`Error fetching profile for user ${userId}:`, error);
      }
    }
    
    return profileMap;
  };

  const fetchMissions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/mission-approvals');
      const data: ApiResponse = await response.json();

      if (response.ok) {
        // Handle the API response structure: { items: [...] }
        const responseData = data as any;
        let missionData: any[] = [];
        
        if (responseData.items) {
          missionData = responseData.items.map((item: any) => ({
            ...item,
            id: item._id,
            status: item.currentStatus,
            requestedAt: item.createdAt
          }));
        } else if (data.data) {
          missionData = data.data || [];
        }
        
        setMissions(missionData);
        
        // Fetch nicknames and profiles for all owner IDs
        const ownerIds = missionData.map(mission => mission.ownerId || mission.userId).filter(Boolean);
        if (ownerIds.length > 0) {
          const [nicknameData, profileData] = await Promise.all([
            fetchNicknames(ownerIds),
            fetchDiscordProfiles(ownerIds)
          ]);
          setNicknames(nicknameData);
          setProfiles(profileData);
        }
        
        // For demonstration purposes, add a mock mission if no missions exist
        if (missionData.length === 0) {
          const mockMission: MissionApproval = {
            _id: "mock-123",
            id: "mock-123",
            ownerId: "802006915394961498",
            userId: "802006915394961498",
            missionId: "100027",
            currentStatus: "pending" as const,
            status: "pending" as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            requestedAt: new Date().toISOString(),
            reward: {
              skills: [],
              items: [],
              coin: 1,
              assetPoint: 0
            }
          };
          
          setMissions([mockMission]);
          
          // Fetch nickname and profile for the mock mission
          const [mockNicknameData, mockProfileData] = await Promise.all([
            fetchNicknames(["802006915394961498"]),
            fetchDiscordProfiles(["802006915394961498"])
          ]);
          setNicknames(mockNicknameData);
          setProfiles(mockProfileData);
        }
      } else {
        setError(data.error || 'Failed to fetch mission approvals');
      }
    } catch (error) {
      setError('Network error occurred while fetching missions');
      console.error('Error fetching missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAssetPointModal = (mission: MissionApproval) => {
    setSelectedMission(mission);
    setAssetPointAmount(mission.reward?.assetPoint || 0);
    setShowAssetPointModal(true);
  };

  const approveMission = async () => {
    if (!selectedMission) return;
    
    setApproving(selectedMission.id);
    setError(null);
    setSuccess(null);

    try {
      // First, approve the mission
      const response = await fetch(`/api/admin/mission-approvals/${selectedMission.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let data: ApiResponse;
      try {
        data = await response.json();
      } catch (_error) {
        // If response is not JSON, get text
        const text = await response.text();
        data = { success: false, error: text };
      }

      if (response.ok && data.success) {
        // Send assetPoint reward to user if amount > 0
        if (assetPointAmount > 0) {
          try {
            const assetPointResponse = await fetch(`https://cartoon-christmas-function-compromise.trycloudflare.com/api/users/${selectedMission.ownerId || selectedMission.userId}/assetPoint`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                assetPointReward: {
                  amount: assetPointAmount
                }
              })
            });

            if (assetPointResponse.ok) {
              setSuccess(`Mission ${selectedMission.id} approved successfully! AssetPoint reward (${assetPointAmount}) sent to user.`);
            } else {
              setSuccess(`Mission ${selectedMission.id} approved successfully! (Note: AssetPoint reward failed to send)`);
            }
          } catch (assetPointError) {
            console.error('Error sending assetPoint reward:', assetPointError);
            setSuccess(`Mission ${selectedMission.id} approved successfully! (Note: AssetPoint reward failed to send)`);
          }
        } else {
          setSuccess(`Mission ${selectedMission.id} approved successfully!`);
        }
        
        // Close modal and refresh the missions list
        setShowAssetPointModal(false);
        setSelectedMission(null);
        setAssetPointAmount(0);
        await fetchMissions();
      } else {
        const errorMsg = data.error || `HTTP ${response.status}: ${response.statusText}`;
        setError(`Failed to approve mission ${selectedMission.id}: ${errorMsg}`);
        console.error('API Response:', response.status, data);
      }
    } catch (error) {
      setError(`Network error while approving mission ${selectedMission.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Error approving mission:', error);
    } finally {
      setApproving(null);
    }
  };

  const addAssetPointToUser = async () => {
    if (!addAssetPointUserId || addAssetPointAmount <= 0) {
      setError('กรุณากรอก User ID และจำนวน AssetPoint ที่ถูกต้อง');
      return;
    }

    setAddAssetPointLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`https://cartoon-christmas-function-compromise.trycloudflare.com/api/users/${addAssetPointUserId}/assetPoint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assetPointReward: {
            amount: addAssetPointAmount
          }
        })
      });

      if (response.ok) {
        setSuccess(`AssetPoint (${addAssetPointAmount}) ส่งให้ User ID: ${addAssetPointUserId} เรียบร้อยแล้ว!`);
        setAddAssetPointUserId('');
        setAddAssetPointAmount(0);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setError(`ไม่สามารถส่ง AssetPoint ได้: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      setError(`เกิดข้อผิดพลาดในการส่ง AssetPoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Error adding asset point:', error);
    } finally {
      setAddAssetPointLoading(false);
    }
  };

  const updateUserNickname = async () => {
    if (!updateNicknameUserId || !updateNicknameNewNickname.trim()) {
      setError('กรุณากรอก User ID และ Nickname ที่ถูกต้อง');
      return;
    }

    setUpdateNicknameLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Create a script to update nickname in database
      const script = `
        const { MongoClient } = require('mongodb');
        
        async function updateNickname() {
          const client = new MongoClient('mongodb://82.26.104.66:27017');
          
          try {
            await client.connect();
            const db = client.db('business-empire');
            
            // Update in usernamehistories collection
            const usernameResult = await db.collection('usernamehistories').updateOne(
              { userId: '${updateNicknameUserId}' },
              { 
                $set: { 
                  currentNickname: '${updateNicknameNewNickname.trim()}',
                  lastUpdated: new Date()
                } 
              },
              { upsert: true }
            );
            
            // Update in serverdatas collection
            const serverResult = await db.collection('serverdatas').updateOne(
              { userId: '${updateNicknameUserId}' },
              { 
                $set: { 
                  nickname: '${updateNicknameNewNickname.trim()}',
                  updatedAt: new Date()
                } 
              },
              { upsert: true }
            );
            
            console.log('Username histories updated:', usernameResult.modifiedCount);
            console.log('Server data updated:', serverResult.modifiedCount);
            
            return { success: true, message: 'Nickname updated successfully' };
          } finally {
            await client.close();
          }
        }
        
        updateNickname().catch(console.error);
      `;

      // Execute the script via API
      const response = await fetch('/api/admin/execute-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: script,
          type: 'update-nickname'
        })
      });

      if (response.ok) {
        setSuccess(`Nickname อัปเดตเป็น "${updateNicknameNewNickname}" สำหรับ User ID: ${updateNicknameUserId} เรียบร้อยแล้ว!`);
        setUpdateNicknameUserId('');
        setUpdateNicknameNewNickname('');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setError(`ไม่สามารถอัปเดต Nickname ได้: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      setError(`เกิดข้อผิดพลาดในการอัปเดต Nickname: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Error updating nickname:', error);
    } finally {
      setUpdateNicknameLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, []);


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">🐹 Hamster Map Admin Panel</h1>
          <p className="text-blue-200 text-lg">จัดการการอนุมัติมิชชั่นในเกม Hamster Map</p>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto mb-6">
          <div className="bg-white/5 rounded-xl p-2 border border-white/10">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('missions')}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  activeTab === 'missions'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'bg-white/5 text-blue-200 hover:bg-white/10'
                }`}
              >
                📋 จัดการมิชชั่น
              </button>
              <button
                onClick={() => setActiveTab('add-assetpoint')}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  activeTab === 'add-assetpoint'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'bg-white/5 text-blue-200 hover:bg-white/10'
                }`}
              >
                💎 เพิ่ม AssetPoint
              </button>
              <button
                onClick={() => setActiveTab('update-nickname')}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  activeTab === 'update-nickname'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'bg-white/5 text-blue-200 hover:bg-white/10'
                }`}
              >
                🏷️ อัปเดต Nickname
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Add AssetPoint Tab Content */}
          {activeTab === 'add-assetpoint' && (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
              <h2 className="text-2xl font-bold text-white mb-4">💎 เพิ่ม AssetPoint ให้ผู้เล่น</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white font-medium mb-2">
                    👤 User ID (Discord ID)
                  </label>
                  <input
                    type="text"
                    value={addAssetPointUserId}
                    onChange={(e) => setAddAssetPointUserId(e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:border-blue-400"
                    placeholder="กรอก Discord User ID"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">
                    💎 จำนวน AssetPoint
                  </label>
                  <input
                    type="number"
                    value={addAssetPointAmount}
                    onChange={(e) => setAddAssetPointAmount(parseInt(e.target.value) || 0)}
                    min="1"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:border-blue-400"
                    placeholder="กรอกจำนวน AssetPoint ที่จะให้"
                  />
                </div>

                <button
                  onClick={addAssetPointToUser}
                  disabled={addAssetPointLoading || !addAssetPointUserId || addAssetPointAmount <= 0}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                >
                  {addAssetPointLoading ? '🔄 กำลังส่ง AssetPoint...' : '💎 ส่ง AssetPoint'}
                </button>
              </div>

              <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <p className="text-blue-200 text-sm">
                  💡 <strong>หมายเหตุ:</strong> ระบบจะส่ง AssetPoint ไปให้ผู้เล่นทันทีเมื่อกดปุ่มส่ง
                </p>
              </div>
            </div>
          )}

          {/* Update Nickname Tab Content */}
          {activeTab === 'update-nickname' && (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
              <h2 className="text-2xl font-bold text-white mb-4">🏷️ อัปเดต Nickname ผู้เล่น</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white font-medium mb-2">
                    👤 User ID (Discord ID)
                  </label>
                  <input
                    type="text"
                    value={updateNicknameUserId}
                    onChange={(e) => setUpdateNicknameUserId(e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:border-blue-400"
                    placeholder="กรอก Discord User ID"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">
                    🏷️ Nickname ใหม่
                  </label>
                  <input
                    type="text"
                    value={updateNicknameNewNickname}
                    onChange={(e) => setUpdateNicknameNewNickname(e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:border-blue-400"
                    placeholder="กรอก Nickname ใหม่"
                  />
                </div>

                <button
                  onClick={updateUserNickname}
                  disabled={updateNicknameLoading || !updateNicknameUserId || !updateNicknameNewNickname.trim()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                >
                  {updateNicknameLoading ? '🔄 กำลังอัปเดต...' : '🏷️ อัปเดต Nickname'}
                </button>
              </div>

              <div className="mt-4 p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg">
                <p className="text-orange-200 text-sm">
                  💡 <strong>หมายเหตุ:</strong> ระบบจะอัปเดต Nickname ในฐานข้อมูล usernamehistories และ serverdatas โดยตรง
                </p>
              </div>
            </div>
          )}

          {/* Control Panel */}
          {activeTab === 'missions' && (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
              <h2 className="text-2xl font-bold text-white mb-4">🎮 Control Panel</h2>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={fetchMissions}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
              >
                {loading ? '🔄 กำลังโหลด...' : '📋 โหลดรายการมิชชั่น'}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-200 mb-2">📊 สถิติ</h3>
                <p className="text-blue-200">📋 มิชชั่นทั้งหมด: {missions.length}</p>
                <p className="text-blue-200">⏳ รอการอนุมัติ: {missions.filter(m => m.currentStatus === 'pending').length}</p>
                <p className="text-blue-200">✅ อนุมัติแล้ว: {missions.filter(m => m.currentStatus === 'approved').length}</p>
                <p className="text-blue-200">❌ ถูกปฏิเสธ: {missions.filter(m => m.currentStatus === 'rejected').length}</p>
              </div>

              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-200 mb-2">💎 AssetPoint</h3>
                <p className="text-green-200">🎯 ใช้แท็บ &quot;เพิ่ม AssetPoint&quot; เพื่อส่ง AssetPoint ให้ผู้เล่นโดยตรง</p>
                <p className="text-green-200">📝 กรอก User ID และจำนวน AssetPoint ที่ต้องการ</p>
              </div>

              <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-orange-200 mb-2">🏷️ Nickname</h3>
                <p className="text-orange-200">🎯 ใช้แท็บ &quot;อัปเดต Nickname&quot; เพื่อเปลี่ยน Nickname ของผู้เล่น</p>
                <p className="text-orange-200">📝 กรอก User ID และ Nickname ใหม่ที่ต้องการ</p>
                <p className="text-orange-200">⚡ อัปเดตโดยตรงในฐานข้อมูล</p>
              </div>
            </div>
            </div>
          )}

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

          {/* Missions List */}
          {activeTab === 'missions' && (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4">📋 รายการมิชชั่น</h2>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-blue-200">กำลังโหลดข้อมูล...</p>
              </div>
            ) : missions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-blue-200">ไม่มีมิชชั่นที่รอการอนุมัติ</p>
              </div>
            ) : (
              <div className="space-y-4">
                {missions.map((mission) => (
                  <div key={mission.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg font-semibold text-white">
                            Mission: {mission.missionName || mission.missionId}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            mission.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                            mission.status === 'approved' ? 'bg-green-500/20 text-green-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                            {mission.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="text-sm text-blue-200 space-y-1">
                          <p>👤 User ID: {mission.ownerId || mission.userId}</p>
                          
                          {/* Discord Profile Information */}
                          {profiles[mission.ownerId || mission.userId] && (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-2">
                              <h4 className="text-blue-300 font-semibold mb-2">🎭 Discord Profile</h4>
                              <div className="space-y-1">
                                {profiles[mission.ownerId || mission.userId].avatar && (
                                  <div className="flex items-center gap-2">
                                    <img 
                                      src={`https://cdn.discordapp.com/avatars/${mission.ownerId || mission.userId}/${profiles[mission.ownerId || mission.userId].avatar}.png?size=32`}
                                      alt="Avatar"
                                      className="w-8 h-8 rounded-full"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                    <span className="text-blue-200">Avatar</span>
                                  </div>
                                )}
                                <p className="text-white font-medium">
                                  👤 Username: {profiles[mission.ownerId || mission.userId].username}
                                  {profiles[mission.ownerId || mission.userId].discriminator && 
                                    profiles[mission.ownerId || mission.userId].discriminator !== '0' && 
                                    `#${profiles[mission.ownerId || mission.userId].discriminator}`
                                  }
                                </p>
                                {profiles[mission.ownerId || mission.userId].globalName && (
                                  <p className="text-green-300">
                                    🌍 Global Name: {profiles[mission.ownerId || mission.userId].globalName}
                                  </p>
                                )}
                                <p className="text-yellow-300 font-medium">
                                  🏷️ Server Nickname: {profiles[mission.ownerId || mission.userId].nickname || 'ไม่มี Nickname'}
                                </p>
                                {profiles[mission.ownerId || mission.userId].rank && (
                                  <p className="text-purple-300">
                                    🏆 Rank: {profiles[mission.ownerId || mission.userId].rank}
                                  </p>
                                )}
                                {profiles[mission.ownerId || mission.userId].house && 
                                 profiles[mission.ownerId || mission.userId].house !== 'None' && (
                                  <p className="text-orange-300">
                                    🏠 House: {profiles[mission.ownerId || mission.userId].house}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Fallback for nickname only if no full profile */}
                          {!profiles[mission.ownerId || mission.userId] && nicknames[mission.ownerId || mission.userId] && (
                            <p className="text-yellow-300 font-medium">
                              🏷️ Nickname: {nicknames[mission.ownerId || mission.userId].nickname}
                            </p>
                          )}
                          
                          <p>🎯 Mission ID: {mission.missionId}</p>
                          <p>🆔 Internal ID: {mission._id}</p>
                          {mission.reward && (
                            <p>💰 Reward: {mission.reward.coin} coins, {mission.reward.assetPoint} asset points</p>
                          )}
                          <p>🕐 Created: {new Date(mission.createdAt).toLocaleString('th-TH')}</p>
                          <p>📅 Updated: {new Date(mission.updatedAt).toLocaleString('th-TH')}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {mission.status === 'pending' && (
                          <button
                            onClick={() => openAssetPointModal(mission)}
                            disabled={approving === mission.id}
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                          >
                            {approving === mission.id ? '🔄 กำลังอนุมัติ...' : '✅ อนุมัติ'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          )}

          {/* Information Panel */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10 mt-6">
            <h2 className="text-2xl font-bold text-white mb-4">ℹ️ วิธีการใช้งาน</h2>

            <div className="space-y-4 text-blue-200">
              <div>
                <h3 className="font-semibold text-white mb-2">📋 แท็บจัดการมิชชั่น</h3>
                <p>ใช้แท็บ &quot;จัดการมิชชั่น&quot; เพื่อดูและอนุมัติมิชชั่นที่รอการอนุมัติ</p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">💎 แท็บเพิ่ม AssetPoint</h3>
                <p>ใช้แท็บ &quot;เพิ่ม AssetPoint&quot; เพื่อส่ง AssetPoint ให้ผู้เล่นโดยตรงด้วย User ID</p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">🔄 การโหลดข้อมูล</h3>
                <p>คลิกปุ่ม &quot;โหลดรายการมิชชั่น&quot; เพื่อดึงข้อมูลล่าสุดจากเซิร์ฟเวอร์</p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">✅ การอนุมัติมิชชั่น</h3>
                <p>คลิกปุ่ม &quot;อนุมัติ&quot; ที่มิชชั่นที่ต้องการอนุมัติ ผู้เล่นจะสามารถผ่านด่านนั้นได้</p>
                <div className="mt-2 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <p className="text-green-200 text-sm">✅ <strong>API Endpoint Fixed:</strong> Endpoint สำหรับอนุมัติมิชชั่นได้ถูกสร้างแล้วและใช้งานได้</p>
                </div>
                <div className="mt-2 p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                  <p className="text-purple-200 text-sm">🎁 <strong>AssetPoint Reward:</strong> ระบบจะแสดงช่องให้กรอกจำนวน AssetPoint ที่จะให้ผู้เล่นเมื่ออนุมัติมิชชั่น</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">📊 สถานะมิชชั่น</h3>
                <p>
                  <span className="text-yellow-300">Pending</span> - รอการอนุมัติ<br />
                  <span className="text-green-300">Approved</span> - อนุมัติแล้ว<br />
                  <span className="text-red-300">Rejected</span> - ถูกปฏิเสธ
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">🌐 การเข้าถึง</h3>
                <p>หน้านี้สามารถเข้าถึงได้โดยทุกคน</p>
              </div>

              <div>
                <h3 className="font-semibold text-white mb-2">🎭 การแสดงข้อมูล Discord Profile</h3>
                <p>ระบบจะแสดงข้อมูลโปรไฟล์ Discord ครบถ้วน รวมถึง:</p>
                <ul className="list-disc list-inside text-blue-200 mt-2 space-y-1">
                  <li>Avatar และ Username</li>
                  <li>Global Name และ Discriminator</li>
                  <li>Server Nickname</li>
                  <li>Rank และ House</li>
                </ul>
                <div className="mt-2 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-200 text-sm">✅ <strong>Enhanced Profile Display:</strong> แสดงข้อมูล Discord ครบถ้วนเพื่อให้ Admin ระบุตัวตนผู้เล่นได้ง่ายขึ้น</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AssetPoint Modal */}
      {showAssetPointModal && selectedMission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-white mb-4">🎁 อนุมัติมิชชั่น</h3>
            
            <div className="mb-4">
              <p className="text-blue-200 mb-2">Mission ID: {selectedMission.missionId}</p>
              <p className="text-blue-200 mb-2">User: {profiles[selectedMission.ownerId || selectedMission.userId]?.username || selectedMission.ownerId}</p>
              {profiles[selectedMission.ownerId || selectedMission.userId]?.globalName && (
                <p className="text-blue-200 mb-4">Global Name: {profiles[selectedMission.ownerId || selectedMission.userId].globalName}</p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-white font-medium mb-2">
                💎 AssetPoint Reward
              </label>
              <input
                type="number"
                value={assetPointAmount}
                onChange={(e) => setAssetPointAmount(parseInt(e.target.value) || 0)}
                min="0"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:border-blue-400"
                placeholder="กรอกจำนวน AssetPoint ที่จะให้"
              />
              <p className="text-blue-200 text-sm mt-1">ใส่ 0 หากไม่ต้องการให้ AssetPoint</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAssetPointModal(false);
                  setSelectedMission(null);
                  setAssetPointAmount(0);
                }}
                className="flex-1 px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-white rounded-lg font-medium transition-all duration-200"
              >
                ยกเลิก
              </button>
              <button
                onClick={approveMission}
                disabled={approving === selectedMission.id}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {approving === selectedMission.id ? '🔄 กำลังอนุมัติ...' : '✅ อนุมัติ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
