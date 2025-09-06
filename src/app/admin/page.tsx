'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAdmin } from '@/lib/admin-config';
import HouseManager from '@/components/admin/HouseManager';
import StardustCoinManager from '@/components/admin/StardustCoinManager';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';

interface UserData {
  _id: string;
  discordId: string;
  username: string;
  email: string;
  globalName?: string;
  avatar: string;
  createdAt: string;
  source?: 'users' | 'voice_activity';
  hasVoiceActivity?: boolean;
  voiceJoinCount?: number;
  totalVoiceTime?: number;
  currentNickname?: string;
}

interface CurrencyData {
  _id: string;
  userId: string;
  hamsterCoins: number;
  totalEarned: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

interface VoiceActivityData {
  _id: string;
  userId: string;
  username: string;
  globalName?: string;
  avatar: string;
  voiceJoinCount: number;
  totalVoiceTime: number;
  lastVoiceJoin: string;
  lastVoiceLeave: string;
  userType: 'real_user' | 'suspicious_user';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VoiceSessionData {
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

interface VoiceStats {
  totalUsers: number;
  realUsers: number;
  suspiciousUsers: number;
  breakdown: Array<{
    _id: string;
    count: number;
    totalJoins: number;
    totalTime: number;
    avgJoins: number;
    avgTime: number;
  }>;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Track admin visits
  const { trackBehavior } = useBehaviorTracking({
    behaviorType: 'admin_visit',
    section: 'admin',
    action: 'view_admin_panel'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [searchResults, setSearchResults] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userCurrency, setUserCurrency] = useState<CurrencyData | null>(null);
  const [userVoiceActivity, setUserVoiceActivity] = useState<VoiceActivityData | null>(null);
  const [userVoiceSessions, setUserVoiceSessions] = useState<VoiceSessionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [expandedUsers, setExpandedUsers] = useState(new Set<string>());
  const [isCurrencyManagementExpanded, setIsCurrencyManagementExpanded] = useState(true);
  const [isVoiceActivityExpanded, setIsVoiceActivityExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'voice-activity' | 'purchases' | 'gacha' | 'achievements' | 'houses' | 'stardustcoin' | 'analytics'>('users');
  // Removed unused voice activity states since we moved to dedicated dashboard
  const [voiceFilter, setVoiceFilter] = useState<'all' | 'real_user' | 'suspicious_user'>('all');
  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchaseFilter, setPurchaseFilter] = useState<string>('');
  const [gachaItems, setGachaItems] = useState<any[]>([]);
  const [showGachaForm, setShowGachaForm] = useState(false);
  const [editingGachaItem, setEditingGachaItem] = useState<any>(null);
  const [newGachaItem, setNewGachaItem] = useState({
    name: '',
    description: '',
    image: '',
    rarity: 'common',
    dropRate: 10,
    isActive: true
  });
  
  // Achievement management states
  const [achievements, setAchievements] = useState<any[]>([]);
  const [showAchievementForm, setShowAchievementForm] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<any>(null);
  const [newAchievement, setNewAchievement] = useState({
    title: '',
    description: '',
    icon: '🏆',
    rarity: 50,
    category: 'Goal',
    coinReward: 100
  });
  const [achievementSearchTerm, setAchievementSearchTerm] = useState('');
  const [selectedUserForAchievement, setSelectedUserForAchievement] = useState<any>(null);
  const [achievementSearchResults, setAchievementSearchResults] = useState<any[]>([]);
  
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkUpdateMessage, setBulkUpdateMessage] = useState<string | null>(null);
  const [bulkUpdateDetails, setBulkUpdateDetails] = useState<any>(null);
  const [userNicknames, setUserNicknames] = useState<{[key: string]: string}>({});
  const [uploadingImage, setUploadingImage] = useState(false);

  // Using centralized admin config

  // Helper function to get display name (nickname > globalName > username)
  const getDisplayName = (user: UserData) => {
    if (userNicknames[user.discordId]) {
      return userNicknames[user.discordId];
    }
    if (user.globalName) {
      return user.globalName;
    }
    return user.username;
  };

  // Helper function to get display name for any user ID
  const getDisplayNameById = (userId: string) => {
    const user = allUsers.find(u => u.discordId === userId);
    if (user) {
      return getDisplayName(user);
    }
    return userId; // Fallback to user ID if user not found
  };

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/');
      return;
    }

    if (!isAdmin((session.user as any)?.id)) {
      router.push('/');
      return;
    }

    // Load all users when component mounts
    loadAllUsers();
    loadPurchaseHistory();
    loadGachaItems();
    loadAchievements();
  }, [session, status, router]);

  const loadAllUsers = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/search-users');
      
      if (!response.ok) {
        throw new Error('Failed to load users');
      }
      
      const data = await response.json();
      setAllUsers(data.users || []);
      setSearchResults(data.users || []);
      
      if (data.users.length === 0) {
        setMessage('No users found in the system.');
      } else {
        // Load nicknames for all users
        await loadUserNicknames(data.users);
      }
    } catch (error) {
      setMessage('Error loading users. Please try again.');
      console.error('Load users error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Removed loadVoiceActivity function since we moved to dedicated dashboard

  const loadPurchaseHistory = async () => {
    try {
      const response = await fetch('/api/shop/purchase-history');
      if (response.ok) {
        const data = await response.json();
        setPurchases(data.purchases);
      }
    } catch (error) {
      console.error('Error loading purchase history:', error);
    }
  };

  const loadGachaItems = async () => {
    try {
      const response = await fetch('/api/gacha/items?admin=true');
      if (response.ok) {
        const data = await response.json();
        setGachaItems(data.items);
      }
    } catch (error) {
      console.error('Error loading gacha items:', error);
    }
  };

  const loadUserNicknames = async (users: UserData[]) => {
    try {
      const nicknameMap: {[key: string]: string} = {};
      
      // Process users sequentially with delay to avoid rate limiting
      for (const user of users) {
        try {
          // Add delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // First try to get from username history
          const historyResponse = await fetch(`/api/users/username-history?userId=${user.discordId}`);
          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            if (historyData.currentNickname) {
              nicknameMap[user.discordId] = historyData.currentNickname;
              continue; // Skip server request if we have history
            }
          }
          
          // If no history or no nickname, try to get directly from server
          const serverResponse = await fetch(`/api/users/get-server-nickname?userId=${user.discordId}`);
          if (serverResponse.ok) {
            const serverData = await serverResponse.json();
            if (serverData.nickname) {
              nicknameMap[user.discordId] = serverData.nickname;
            }
          }
        } catch (error) {
          console.error(`Error fetching nickname for user ${user.discordId}:`, error);
          // Continue with next user even if one fails
        }
      }

      setUserNicknames(nicknameMap);
    } catch (error) {
      console.error('Error loading user nicknames:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim()) {
      setSearchResults(allUsers);
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`/api/admin/search-users?q=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        throw new Error('Failed to search users');
      }
      
      const data = await response.json();
      setSearchResults(data.users || []);
      
      if (data.users.length === 0) {
        setMessage('No users found with that username.');
      }
    } catch (error) {
      setMessage('Error searching users. Please try again.');
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserCurrency = async (userId: string) => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`/api/admin/user-currency?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to get user currency');
      }
      
      const data = await response.json();
      setUserCurrency(data.currency);
      
      if (!data.currency) {
        setMessage('No currency data found for this user.');
      }
    } catch (error) {
      setMessage('Error getting user currency. Please try again.');
      console.error('Currency error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserVoiceActivity = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/user-voice-activity?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to get user voice activity');
      }
      
      const data = await response.json();
      setUserVoiceActivity(data.data.voiceActivity);
      setUserVoiceSessions(data.data.voiceSessions || []);
    } catch (error) {
      console.error('Get user voice activity error:', error);
    }
  };

  const updateUserCurrency = async (userId: string, newBalance: number) => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/update-currency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          hamsterCoins: newBalance
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update currency');
      }
      
      const data = await response.json();
      setUserCurrency(data.currency);
      setMessage('Currency updated successfully!');
      
      // Refresh the currency data
      await getUserCurrency(userId);
    } catch (error) {
      setMessage('Error updating currency. Please try again.');
      console.error('Update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectUser = async (user: UserData) => {
    setSelectedUser(user);
    await getUserCurrency(user.discordId);
    await getUserVoiceActivity(user.discordId);
    // Auto-expand sections when user is selected
    setIsCurrencyManagementExpanded(true);
    setIsVoiceActivityExpanded(true);
  };

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const expandAllUsers = () => {
    const allUserIds = searchResults.map(user => user._id);
    setExpandedUsers(new Set(allUserIds));
  };

  const collapseAllUsers = () => {
    setExpandedUsers(new Set());
  };

  // Removed unused voice filter handler since we moved to dedicated dashboard

  const deleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone and will delete all user data including currency and voice activity.`)) {
      return;
    }

    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`/api/admin/delete-user?userId=${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete user');
      }
      
      await response.json();
      setMessage(`User "${username}" deleted successfully!`);
      
      // Clear selected user if it was the deleted user
      if (selectedUser && selectedUser.discordId === userId) {
        setSelectedUser(null);
        setUserCurrency(null);
        setUserVoiceActivity(null);
        setUserVoiceSessions([]);
      }
      
      // Refresh the user list
      await loadAllUsers();
      
    } catch (error) {
      setMessage('Error deleting user. Please try again.');
      console.error('Delete user error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');

  const bulkUpdateNicknames = async () => {
    if (!confirm('This will update nicknames for all users in the database. This may take a while. Continue?')) {
      return;
    }

    setBulkUpdating(true);
    setBulkUpdateMessage('Starting bulk nickname update in background...');
    setJobStatus('running');
    
    try {
      const response = await fetch('/api/users/bulk-update-nicknames', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          // Job already running
          setBulkUpdateMessage(`⏳ ${errorData.error}`);
          if (errorData.jobId) {
            setCurrentJobId(errorData.jobId);
            // Start polling for status
            pollJobStatus(errorData.jobId);
          } else {
            setBulkUpdateMessage(`⏳ ${errorData.error} (No job ID available)`);
            setJobStatus('failed');
          }
        } else {
          throw new Error(errorData.error || 'Failed to start bulk update');
        }
        return;
      }
      
      const data = await response.json();
      setCurrentJobId(data.jobId);
      setBulkUpdateMessage(`🔄 Bulk update started! Job ID: ${data.jobId}`);
      
      // Start polling for status
      pollJobStatus(data.jobId);
      
    } catch (error) {
      setBulkUpdateMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Bulk update error:', error);
      setJobStatus('failed');
    } finally {
      setBulkUpdating(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    if (!jobId) {
      setBulkUpdateMessage('❌ No job ID available for polling');
      setJobStatus('failed');
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/users/bulk-update-nicknames?jobId=${jobId}`);
        
        if (!response.ok) {
          throw new Error('Failed to check job status');
        }
        
        const data = await response.json();
        
        if (data.status === 'running') {
          setBulkUpdateMessage(`🔄 Processing... ${data.progress}% complete`);
        } else if (data.status === 'completed') {
          clearInterval(pollInterval);
          setJobStatus('completed');
          const summary = data.summary;
          setBulkUpdateMessage(
            `✅ Bulk update completed! ` +
            `${summary.updated} users updated, ` +
            `${summary.failed} failed, ` +
            `${summary.notInServer} not in server, ` +
            `${summary.noNickname} have no nickname. ` +
            `Success rate: ${summary.successRate}`
          );
          setBulkUpdateDetails(data.results);
          setCurrentJobId(null);
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          setJobStatus('failed');
          setBulkUpdateMessage(`❌ Job failed: ${data.error}`);
          setCurrentJobId(null);
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        clearInterval(pollInterval);
        setJobStatus('failed');
        setBulkUpdateMessage(`❌ Error checking job status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setCurrentJobId(null);
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup interval after 10 minutes (in case job gets stuck)
    setTimeout(() => {
      clearInterval(pollInterval);
      if (jobStatus === 'running') {
        setJobStatus('failed');
        setBulkUpdateMessage('❌ Job polling timeout - please check manually');
        setCurrentJobId(null);
      }
    }, 600000);
  };

  const uploadGachaImage = async (file: File) => {
    setUploadingImage(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/shop/upload-image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      const data = await response.json();
      setNewGachaItem({...newGachaItem, image: data.imageUrl});
      setMessage('Image uploaded successfully!');
      
    } catch (error) {
      setMessage(`Error uploading image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Image upload error:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  // Achievement management functions
  const loadAchievements = async () => {
    try {
      const response = await fetch('/api/achievements');
      if (response.ok) {
        const data = await response.json();
        setAchievements(data.achievements);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const handleSaveAchievement = async () => {
    try {
      const url = editingAchievement 
        ? `/api/achievements?id=${editingAchievement._id}` 
        : '/api/achievements';
      
      const method = editingAchievement ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAchievement),
      });
      
      if (response.ok) {
        setMessage(editingAchievement ? 'Achievement updated successfully!' : 'Achievement created successfully!');
        setShowAchievementForm(false);
        setEditingAchievement(null);
        setNewAchievement({
          title: '',
          description: '',
          icon: '🏆',
          rarity: 50,
          category: 'Goal',
          coinReward: 100
        });
        loadAchievements();
      } else {
        const errorData = await response.json();
        setMessage(`Error: ${errorData.error}`);
      }
    } catch (error) {
      setMessage('Error saving achievement');
      console.error('Save achievement error:', error);
    }
  };

  const handleDeleteAchievement = async (achievementId: string) => {
    if (confirm('Are you sure you want to delete this achievement?')) {
      try {
        const response = await fetch(`/api/achievements?id=${achievementId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          setMessage('Achievement deleted successfully!');
          loadAchievements();
        } else {
          const errorData = await response.json();
          setMessage(`Error: ${errorData.error}`);
        }
      } catch (error) {
        setMessage('Error deleting achievement');
        console.error('Delete achievement error:', error);
      }
    }
  };

  const handleUpdateUserAchievement = async (achievementId: string, progress: number) => {
    if (!selectedUserForAchievement) return;
    
    try {
      const response = await fetch('/api/achievements/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUserForAchievement.discordId,
          achievementId,
          progress
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessage(data.message);
      } else {
        const errorData = await response.json();
        setMessage(`Error: ${errorData.error}`);
      }
    } catch (error) {
      setMessage('Error updating user achievement');
      console.error('Update user achievement error:', error);
    }
  };

  // User search functions for achievements
  const searchUserForAchievement = async () => {
    if (!achievementSearchTerm.trim()) {
      setMessage('Please enter a search term');
      return;
    }
    
    try {
      const searchTerm = achievementSearchTerm.trim();
      const results = allUsers.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.discordId.includes(searchTerm)
      );
      
      setAchievementSearchResults(results);
      
      if (results.length === 0) {
        setMessage('No users found matching your search');
      } else {
        setMessage(`Found ${results.length} user(s)`);
      }
    } catch (error) {
      setMessage('Error searching for users');
      console.error('User search error:', error);
    }
  };

  const selectUserForAchievement = (user: any) => {
    setSelectedUserForAchievement(user);
    setAchievementSearchResults([]);
    setAchievementSearchTerm('');
    setMessage(`Selected user: ${user.username}`);
  };

  const getDiscordAvatarUrl = (userId: string, avatar: string) => {
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
  };

  // Show loading or unauthorized
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

      if (!session || !isAdmin((session.user as any)?.id)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Unauthorized Access</div>
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
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <div className="text-4xl">👑</div>
            <div className="text-white text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              HamsterCoin Admin Panel
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-6 py-2 rounded-lg transition-all duration-300"
          >
            Back to Home
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              activeTab === 'users'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            👥 User Management
          </button>
          <button
            onClick={() => router.push('/admin/voice-dashboard')}
            className="px-6 py-3 rounded-lg font-medium transition-all duration-300 bg-blue-600 text-white hover:bg-blue-700"
          >
            🎤 Voice Dashboard
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              activeTab === 'purchases'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            🛒 Purchase History
          </button>
          <button
            onClick={() => setActiveTab('gacha')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              activeTab === 'gacha'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            🎰 Gacha Management
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              activeTab === 'achievements'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            🏆 Achievement Management
          </button>
          <button
            onClick={() => setActiveTab('houses')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              activeTab === 'houses'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            🏠 House Management
          </button>
          <button
            onClick={() => setActiveTab('stardustcoin')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              activeTab === 'stardustcoin'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            ✨ StardustCoin Management
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              activeTab === 'analytics'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            📊 Analytics Dashboard
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.includes('Error') ? 'bg-red-500/20 border border-red-500/30' : 'bg-green-500/20 border border-green-500/30'
          }`}>
            <p className="text-white">{message}</p>
          </div>
        )}

        {/* Bulk Update Nicknames */}
        <div className="bg-gradient-to-br from-blue-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-blue-500/20 p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">🔄 Bulk Update Nicknames</h2>
          <p className="text-gray-300 mb-4">
            Update nicknames for all users in the database by fetching their current server data from Discord.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={bulkUpdateNicknames}
              disabled={bulkUpdating || jobStatus === 'running'}
              className={`${
                jobStatus === 'running' 
                  ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 cursor-not-allowed' 
                  : jobStatus === 'completed'
                  ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400'
                  : jobStatus === 'failed'
                  ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400'
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400'
              } disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-all duration-300 flex items-center space-x-2`}
            >
              <span className="text-lg">
                {jobStatus === 'running' ? '⏳' : 
                 jobStatus === 'completed' ? '✅' : 
                 jobStatus === 'failed' ? '❌' : '🔄'}
              </span>
              <span>
                {jobStatus === 'running' ? 'Processing...' : 
                 jobStatus === 'completed' ? 'Completed' : 
                 jobStatus === 'failed' ? 'Failed - Retry' : 
                 bulkUpdating ? 'Starting...' : 'Update All Nicknames'}
              </span>
            </button>
            {bulkUpdateMessage && (
              <div className={`flex-1 p-3 rounded-lg ${
                bulkUpdateMessage.includes('✅') ? 'bg-green-500/20 border border-green-500/30' : 
                bulkUpdateMessage.includes('❌') ? 'bg-red-500/20 border border-red-500/30' :
                bulkUpdateMessage.includes('⏳') ? 'bg-yellow-500/20 border border-yellow-500/30' :
                'bg-blue-500/20 border border-blue-500/30'
              }`}>
                <p className="text-white text-sm">{bulkUpdateMessage}</p>
                {currentJobId && (
                  <p className="text-gray-400 text-xs mt-1">Job ID: {currentJobId}</p>
                )}
                {jobStatus === 'running' && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${bulkUpdateMessage.includes('%') ? 
                          parseInt(bulkUpdateMessage.match(/(\d+)%/)?.[1] || '0') : 0}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Detailed Results */}
          {bulkUpdateDetails && (
            <div className="mt-4 bg-gray-800/30 rounded-lg p-4 border border-gray-600">
              <h4 className="text-lg font-semibold text-white mb-3">📊 Detailed Results</h4>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-green-500/20 rounded-lg p-3 border border-green-500/30">
                  <div className="text-green-400 font-bold text-xl">{bulkUpdateDetails.updated}</div>
                  <div className="text-green-300 text-sm">Updated</div>
                </div>
                <div className="bg-red-500/20 rounded-lg p-3 border border-red-500/30">
                  <div className="text-red-400 font-bold text-xl">{bulkUpdateDetails.failed}</div>
                  <div className="text-red-300 text-sm">Failed</div>
                </div>
                <div className="bg-yellow-500/20 rounded-lg p-3 border border-yellow-500/30">
                  <div className="text-yellow-400 font-bold text-xl">{bulkUpdateDetails.notInServer}</div>
                  <div className="text-yellow-300 text-sm">Not in Server</div>
                </div>
                <div className="bg-blue-500/20 rounded-lg p-3 border border-blue-500/30">
                  <div className="text-blue-400 font-bold text-xl">{bulkUpdateDetails.noNickname}</div>
                  <div className="text-blue-300 text-sm">No Nickname</div>
                </div>
              </div>
              
              {/* Error Details */}
              {bulkUpdateDetails.errors && bulkUpdateDetails.errors.length > 0 && (
                <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
                  <h5 className="text-red-400 font-semibold mb-2">❌ Error Details:</h5>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {bulkUpdateDetails.errors.map((error: string, index: number) => (
                      <div key={index} className="text-red-300 text-sm font-mono">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <>
            {/* Search Section */}
            <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6 mb-8">
              <h2 className="text-2xl font-bold text-white mb-4"> Search Users</h2>
              <div className="flex gap-4">
                <input
                  type="text"
                                      placeholder="Search by username, global name, or nickname... (leave empty to show all)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                  className="flex-1 bg-gray-800/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                />
                <button
                  onClick={searchUsers}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-6 py-2 rounded-lg transition-all duration-300 disabled:opacity-50"
                >
                  {isLoading ? 'Searching...' : 'Search'}
                </button>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSearchResults(allUsers);
                  }}
                  className="bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-white px-6 py-2 rounded-lg transition-all duration-300"
                >
                  Show All
                </button>
              </div>
            </div>

            {/* Users List */}
            {searchResults.length > 0 && (
              <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">
                    👥 Users ({searchResults.length} found)
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={expandAllUsers}
                      className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-4 py-2 rounded-lg transition-all duration-300 text-sm"
                    >
                      Expand All
                    </button>
                    <button
                      onClick={collapseAllUsers}
                      className="bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-white px-4 py-2 rounded-lg transition-all duration-300 text-sm"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>
                <div className="grid gap-4 max-h-[800px] overflow-y-auto">
                  {searchResults.map((user) => {
                    const isExpanded = expandedUsers.has(user._id);
                    const isSelected = selectedUser?._id === user._id;
                    
                    return (
                      <div
                        key={user._id}
                        className={`rounded-lg border transition-all duration-300 ${
                          isSelected
                            ? 'bg-orange-500/20 border-orange-400'
                            : 'bg-gray-800/30 border-gray-600 hover:bg-gray-700/30'
                        }`}
                      >
                        {/* User Header - Always Visible */}
                        <div 
                          className="p-4 cursor-pointer"
                          onClick={() => toggleUserExpansion(user._id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <img
                                src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`}
                                alt={user.username}
                                className="w-12 h-12 rounded-full"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                }}
                              />
                              <div className="flex-1">
                                <div className="text-white font-semibold">{getDisplayName(user)}</div>
                                <div className="text-gray-300 text-sm">
                                  @{user.username} • {user.email || 'No email'}
                                </div>
                                
                                {/* Show current nickname if available */}
                                {(user.currentNickname || userNicknames[user.discordId]) && (
                                  <div className="text-orange-400 text-sm font-semibold">
                                    🏷️ Server Nickname: {user.currentNickname || userNicknames[user.discordId]}
                                  </div>
                                )}
                                
                                {/* Show source and voice activity status */}
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="text-gray-400 text-xs">
                                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                                  </div>
                                  
                                  {/* Source indicator */}
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    user.source === 'voice_activity' 
                                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  }`}>
                                    {user.source === 'voice_activity' ? '🎤 Voice Only' : '👤 Full User'}
                                  </span>
                                  
                                  {/* Voice activity indicator */}
                                  {user.hasVoiceActivity && (
                                    <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded-full text-xs font-medium">
                                      🔊 {user.voiceJoinCount || 0} joins • {Math.round((user.totalVoiceTime || 0) / 60)}h voice
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-orange-400 text-sm">
                                {isExpanded ? 'Click to collapse' : 'Click to expand'}
                              </span>
                              <svg
                                className={`w-5 h-5 text-orange-400 transition-transform duration-300 ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="border-t border-gray-600 bg-gray-800/20 p-4">
                            <div className="grid md:grid-cols-2 gap-6">
                              {/* User Details */}
                              <div className="bg-gray-800/30 rounded-lg p-4">
                                <h4 className="text-lg font-semibold text-white mb-3"> User Details</h4>
                                <div className="space-y-2 text-gray-300">
                                  <div><span className="font-medium">Display Name:</span> <span className="text-white font-semibold">{getDisplayName(user)}</span></div>
                                  <div><span className="font-medium">Username:</span> @{user.username}</div>
                                  {user.globalName && (
                                    <div><span className="font-medium">Global Name:</span> {user.globalName}</div>
                                  )}
                                  {userNicknames[user.discordId] && (
                                    <div><span className="font-medium text-orange-400">Server Nickname:</span> <span className="text-orange-400 font-semibold">{userNicknames[user.discordId]}</span></div>
                                  )}
                                  <div><span className="font-medium">Email:</span> {user.email}</div>
                                  <div><span className="font-medium">Discord ID:</span> <span className="text-gray-400 text-xs">{user.discordId}</span></div>
                                  <div><span className="font-medium">Joined:</span> {new Date(user.createdAt).toLocaleString()}</div>
                                </div>
                              </div>

                              {/* Quick Actions */}
                              <div className="bg-gray-800/30 rounded-lg p-4">
                                <h4 className="text-lg font-semibold text-white mb-3">⚡ Quick Actions</h4>
                                <div className="space-y-3">
                                  <button
                                    onClick={() => selectUser(user)}
                                    className={`w-full py-2 px-4 rounded-lg transition-all duration-300 ${
                                      isSelected
                                        ? 'bg-orange-600 text-white'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                                    }`}
                                  >
                                    {isSelected ? '✓ Selected' : 'Select for Management'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(user.discordId);
                                      setMessage('Discord ID copied to clipboard!');
                                      setTimeout(() => setMessage(''), 2000);
                                    }}
                                    className="w-full bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded-lg transition-all duration-300"
                                  >
                                    Copy Discord ID
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(user.email);
                                      setMessage('Email copied to clipboard!');
                                      setTimeout(() => setMessage(''), 2000);
                                    }}
                                    className="w-full bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded-lg transition-all duration-300"
                                  >
                                    Copy Email
                                  </button>
                                  <button
                                    onClick={() => deleteUser(user.discordId, user.username)}
                                    className="w-full bg-red-600 hover:bg-red-500 text-white py-2 px-4 rounded-lg transition-all duration-300"
                                  >
                                    🗑️ Delete User
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* User Management Sections */}
            {selectedUser && (
              <>
                {/* Currency Management */}
                {userCurrency && (
                  <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6 mb-8">
                    {/* Currency Management Header - Clickable */}
                    <div 
                      className="flex items-center justify-between cursor-pointer mb-4"
                      onClick={() => setIsCurrencyManagementExpanded(!isCurrencyManagementExpanded)}
                    >
                      <div className="flex items-center space-x-3">
                        <h3 className="text-xl font-bold text-white">🪙 Currency Management</h3>
                        <span className="text-orange-400 text-sm">
                          {isCurrencyManagementExpanded ? 'Click to collapse' : 'Click to expand'}
                        </span>
                      </div>
                      <svg
                        className={`w-6 h-6 text-orange-400 transition-transform duration-300 ${
                          isCurrencyManagementExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Currency Management Content - Collapsible */}
                    {isCurrencyManagementExpanded && (
                      <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* User Info */}
                          <div className="bg-gray-800/30 rounded-lg p-4">
                            <h4 className="text-lg font-semibold text-white mb-3">User Information</h4>
                            <div className="space-y-2 text-gray-300">
                              <div><span className="font-medium">Display Name:</span> <span className="text-white font-semibold">{getDisplayName(selectedUser)}</span></div>
                              <div><span className="font-medium">Username:</span> @{selectedUser.username}</div>
                              {selectedUser.globalName && (
                                <div><span className="font-medium">Global Name:</span> {selectedUser.globalName}</div>
                              )}
                              {userNicknames[selectedUser.discordId] && (
                                <div><span className="font-medium text-orange-400">Server Nickname:</span> <span className="text-orange-400 font-semibold">{userNicknames[selectedUser.discordId]}</span></div>
                              )}
                              <div><span className="font-medium">Email:</span> {selectedUser.email}</div>
                              <div><span className="font-medium">Discord ID:</span> <span className="text-gray-400 text-xs">{selectedUser.discordId}</span></div>
                            </div>
                          </div>

                          {/* Currency Info */}
                          <div className="bg-gray-800/30 rounded-lg p-4">
                            <h4 className="text-lg font-semibold text-white mb-3">Currency Information</h4>
                            <div className="space-y-2 text-gray-300">
                              <div><span className="font-medium">Current Balance:</span> {userCurrency.hamsterCoins.toLocaleString()} 🪙</div>
                              <div><span className="font-medium">Total Earned:</span> {userCurrency.totalEarned.toLocaleString()} 🪙</div>
                              <div><span className="font-medium">Total Spent:</span> {userCurrency.totalSpent.toLocaleString()} 🪙</div>
                              <div><span className="font-medium">Created:</span> {new Date(userCurrency.createdAt).toLocaleDateString()}</div>
                              <div><span className="font-medium">Updated:</span> {new Date(userCurrency.updatedAt).toLocaleDateString()}</div>
                            </div>
                          </div>
                        </div>

                        {/* Update Currency */}
                        <div className="bg-gray-800/30 rounded-lg p-4">
                          <h4 className="text-lg font-semibold text-white mb-3">Update Currency Balance</h4>
                          <div className="flex gap-4 items-end">
                            <div className="flex-1">
                              <label className="block text-gray-300 text-sm mb-2">New Balance (Hamster Shop)</label>
                              <input
                                type="number"
                                min="0"
                                value={userCurrency.hamsterCoins}
                                onChange={(e) => setUserCurrency({
                                  ...userCurrency,
                                  hamsterCoins: parseInt(e.target.value) || 0
                                })}
                                className="w-full bg-gray-700/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-400"
                              />
                            </div>
                            <button
                              onClick={() => updateUserCurrency(selectedUser.discordId, userCurrency.hamsterCoins)}
                              disabled={isLoading}
                              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white px-6 py-2 rounded-lg transition-all duration-300 disabled:opacity-50"
                            >
                              {isLoading ? 'Updating...' : 'Update Balance'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Voice Activity Management */}
                {userVoiceActivity && (
                  <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6 mb-8">
                    {/* Voice Activity Header - Clickable */}
                    <div 
                      className="flex items-center justify-between cursor-pointer mb-4"
                      onClick={() => setIsVoiceActivityExpanded(!isVoiceActivityExpanded)}
                    >
                      <div className="flex items-center space-x-3">
                        <h3 className="text-xl font-bold text-white">🎤 Voice Activity</h3>
                        <span className="text-orange-400 text-sm">
                          {isVoiceActivityExpanded ? 'Click to collapse' : 'Click to expand'}
                        </span>
                      </div>
                      <svg
                        className={`w-6 h-6 text-orange-400 transition-transform duration-300 ${
                          isVoiceActivityExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Voice Activity Content - Collapsible */}
                    {isVoiceActivityExpanded && (
                      <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Voice Stats */}
                          <div className="bg-gray-800/30 rounded-lg p-4">
                            <h4 className="text-lg font-semibold text-white mb-3">Voice Statistics</h4>
                            <div className="space-y-2 text-gray-300">
                              <div><span className="font-medium">User Type:</span> 
                                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                                  userVoiceActivity.userType === 'real_user' 
                                    ? 'bg-green-600 text-white' 
                                    : 'bg-yellow-600 text-white'
                                }`}>
                                  {userVoiceActivity.userType === 'real_user' ? 'Real User' : 'Suspicious User'}
                                </span>
                              </div>
                              <div><span className="font-medium">Voice Join Count:</span> {userVoiceActivity.voiceJoinCount}</div>
                              <div><span className="font-medium">Total Voice Time:</span> {userVoiceActivity.totalVoiceTime} minutes</div>
                              <div><span className="font-medium">Last Voice Join:</span> {userVoiceActivity.lastVoiceJoin ? new Date(userVoiceActivity.lastVoiceJoin).toLocaleString() : 'Never'}</div>
                              <div><span className="font-medium">Last Voice Leave:</span> {userVoiceActivity.lastVoiceLeave ? new Date(userVoiceActivity.lastVoiceLeave).toLocaleString() : 'Never'}</div>
                            </div>
                          </div>

                          {/* Recent Voice Sessions */}
                          <div className="bg-gray-800/30 rounded-lg p-4">
                            <h4 className="text-lg font-semibold text-white mb-3">Recent Voice Sessions</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {userVoiceSessions.slice(0, 5).map((session) => (
                                <div key={session._id} className="bg-gray-700/30 rounded p-2 text-sm">
                                  <div className="text-gray-300">
                                    <div><span className="font-medium">Channel:</span> {session.channelName}</div>
                                    <div><span className="font-medium">Duration:</span> {session.duration || 0} minutes</div>
                                    <div><span className="font-medium">Joined:</span> {new Date(session.joinTime).toLocaleString()}</div>
                                  </div>
                                </div>
                              ))}
                              {userVoiceSessions.length === 0 && (
                                <div className="text-gray-400 text-sm">No voice sessions found</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Delete User Section */}
                <div className="bg-gradient-to-br from-red-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-red-500/20 p-6 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-xl font-bold text-white">⚠️ Danger Zone</h3>
                    </div>
                  </div>
                  
                  <div className="bg-red-800/20 rounded-lg p-4 border border-red-500/30">
                    <h4 className="text-lg font-semibold text-red-300 mb-3">Delete User Account</h4>
                    <div className="space-y-3">
                      <div className="text-red-200 text-sm">
                        <p><strong>Warning:</strong> This action will permanently delete:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>User account data</li>
                          <li>All currency and balance information</li>
                          <li>Voice activity records</li>
                          <li>Voice session history</li>
                        </ul>
                        <p className="mt-2"><strong>This action cannot be undone!</strong></p>
                      </div>
                      <button
                        onClick={() => deleteUser(selectedUser.discordId, selectedUser.username)}
                        disabled={isLoading}
                        className="w-full bg-red-600 hover:bg-red-500 text-white py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 font-semibold"
                      >
                        {isLoading ? 'Deleting...' : '🗑️ Delete User Permanently'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}



        {/* Purchase History Tab */}
        {activeTab === 'purchases' && (
          <>
            {/* Purchase History Filter */}
            <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6 mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">🛒 Purchase History Filter</h2>
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Filter by user ID..."
                  value={purchaseFilter}
                  onChange={(e) => setPurchaseFilter(e.target.value)}
                  className="flex-1 bg-gray-800/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                />
                <button
                  onClick={() => setPurchaseFilter('')}
                  className="bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-white px-6 py-2 rounded-lg transition-all duration-300"
                >
                  Clear Filter
                </button>
              </div>
            </div>

            {/* Purchase History List */}
            {purchases.length > 0 && (
              <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
                <h3 className="text-xl font-bold text-white mb-4">
                  🛒 Purchase History ({purchases.filter(p => !purchaseFilter || p.userId.includes(purchaseFilter)).length} purchases)
                </h3>
                <div className="grid gap-4 max-h-96 overflow-y-auto">
                  {purchases
                    .filter(purchase => !purchaseFilter || purchase.userId.includes(purchaseFilter))
                    .map((purchase) => (
                      <div
                        key={purchase.id}
                        className="p-4 rounded-lg border bg-blue-600/10 border-blue-500/30 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="text-white font-semibold">
                              Purchase #{purchase.id.slice(-8)}
                            </div>
                            <div className="text-gray-300 text-sm">
                              User: {getDisplayNameById(purchase.userId)}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {new Date(purchase.purchaseDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-orange-400">
                              {purchase.totalAmount} 🪙
                            </div>
                            <div className={`text-sm px-2 py-1 rounded-full inline-block ${
                              purchase.status === 'completed' 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {purchase.status}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {purchase.items.map((item: any, index: number) => (
                            <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                              <div className="flex items-center space-x-2">
                                <div className="text-lg">📦</div>
                                <div>
                                  <div className="text-white text-sm font-medium">{item.name}</div>
                                  <div className="text-gray-400 text-xs">Qty: {item.quantity}</div>
                                </div>
                              </div>
                              <div className="text-orange-400 text-sm font-semibold">
                                {item.price} 🪙
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {purchases.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <h2 className="text-2xl font-bold text-white mb-2">No Purchases Yet</h2>
                <p className="text-gray-400">No purchases have been made by any users.</p>
              </div>
            )}
          </>
        )}

        {/* Gacha Management Tab */}
        {activeTab === 'gacha' && (
          <>
            {/* Add New Gacha Item */}
            <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">🎰 Gacha Item Management</h2>
                <button
                  onClick={() => {
                    setShowGachaForm(!showGachaForm);
                    setEditingGachaItem(null);
                    setNewGachaItem({
                      name: '',
                      description: '',
                      image: '',
                      rarity: 'common',
                      dropRate: 10,
                      isActive: true
                    });
                  }}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-4 py-2 rounded-lg transition-all duration-300"
                >
                  {showGachaForm ? 'Cancel' : 'Add New Item'}
                </button>
              </div>

              {showGachaForm && (
                <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                  <h3 className="text-xl font-bold text-white mb-4">
                    {editingGachaItem ? 'Edit Gacha Item' : 'Add New Gacha Item'}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Name</label>
                      <input
                        type="text"
                        value={newGachaItem.name}
                        onChange={(e) => setNewGachaItem({...newGachaItem, name: e.target.value})}
                        className="w-full bg-gray-800/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                        placeholder="Item name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Description</label>
                      <input
                        type="text"
                        value={newGachaItem.description}
                        onChange={(e) => setNewGachaItem({...newGachaItem, description: e.target.value})}
                        className="w-full bg-gray-800/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                        placeholder="Item description"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Image</label>
                      <div className="space-y-2">
                        {/* Image Preview */}
                        {newGachaItem.image && (
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="text-2xl">
                              {newGachaItem.image.startsWith('/') ? (
                                <img 
                                  src={newGachaItem.image} 
                                  alt="Preview"
                                  className="w-8 h-8 object-cover rounded"
                                />
                              ) : (
                                newGachaItem.image
                              )}
                            </div>
                            <button
                              onClick={() => setNewGachaItem({...newGachaItem, image: ''})}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                        
                        {/* Upload Button */}
                        <div className="flex items-center space-x-2">
                          <label className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-4 py-2 rounded-lg transition-all duration-300 cursor-pointer text-sm">
                            {uploadingImage ? '⏳ Uploading...' : '📁 Upload Image'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  uploadGachaImage(file);
                                }
                              }}
                              className="hidden"
                              disabled={uploadingImage}
                            />
                          </label>
                          
                          <span className="text-gray-400 text-sm">or</span>
                          
                          <input
                            type="text"
                            value={newGachaItem.image}
                            onChange={(e) => setNewGachaItem({...newGachaItem, image: e.target.value})}
                            className="flex-1 bg-gray-800/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400 text-sm"
                            placeholder="URL or emoji (e.g., 🗡️)"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Rarity</label>
                      <select
                        value={newGachaItem.rarity}
                        onChange={(e) => setNewGachaItem({...newGachaItem, rarity: e.target.value})}
                        className="w-full bg-gray-800/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-400"
                      >
                        <option value="common">Common</option>
                        <option value="rare">Rare</option>
                        <option value="epic">Epic</option>
                        <option value="legendary">Legendary</option>
                        <option value="mythic">Mythic</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Drop Rate (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={newGachaItem.dropRate}
                        onChange={(e) => setNewGachaItem({...newGachaItem, dropRate: parseFloat(e.target.value) || 0})}
                        className="w-full bg-gray-800/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                        placeholder="Drop rate percentage"
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <label className="flex items-center text-white text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={newGachaItem.isActive}
                          onChange={(e) => setNewGachaItem({...newGachaItem, isActive: e.target.checked})}
                          className="mr-2 rounded"
                        />
                        Active
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <button
                      onClick={async () => {
                        try {
                          const url = editingGachaItem 
                            ? `/api/gacha/items` 
                            : `/api/gacha/items`;
                          const method = editingGachaItem ? 'PUT' : 'POST';
                          const body = editingGachaItem 
                            ? { id: editingGachaItem.id, ...newGachaItem }
                            : newGachaItem;
                          
                          const response = await fetch(url, {
                            method,
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body)
                          });
                          
                          if (response.ok) {
                            setShowGachaForm(false);
                            setEditingGachaItem(null);
                            setNewGachaItem({
                              name: '',
                              description: '',
                              image: '',
                              rarity: 'common',
                              dropRate: 10,
                              isActive: true
                            });
                            loadGachaItems();
                            setMessage(editingGachaItem ? 'Gacha item updated successfully!' : 'Gacha item added successfully!');
                          } else {
                            const errorData = await response.json();
                            setMessage(`Error: ${errorData.error}`);
                          }
                        } catch (error) {
                          setMessage('Error saving gacha item');
                        }
                      }}
                      className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white px-6 py-2 rounded-lg transition-all duration-300"
                    >
                      {editingGachaItem ? 'Update Item' : 'Add Item'}
                    </button>
                    
                    {editingGachaItem && (
                      <button
                        onClick={() => {
                          setShowGachaForm(false);
                          setEditingGachaItem(null);
                          setNewGachaItem({
                            name: '',
                            description: '',
                            image: '',
                            rarity: 'common',
                            dropRate: 10,
                            isActive: true
                          });
                        }}
                        className="bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-white px-6 py-2 rounded-lg transition-all duration-300"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Gacha Items List */}
            {gachaItems.length > 0 && (
              <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
                <h3 className="text-xl font-bold text-white mb-4">
                  🎰 Gacha Items ({gachaItems.length} items)
                </h3>
                <div className="grid gap-4 max-h-96 overflow-y-auto">
                  {gachaItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border transition-all duration-300 ${
                        item.isActive 
                          ? 'bg-green-600/10 border-green-500/30' 
                          : 'bg-red-600/10 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-3xl">
                            {item.image.startsWith('/') ? (
                              <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                            ) : (
                              item.image
                            )}
                          </div>
                          <div>
                            <div className="text-white font-semibold">{item.name}</div>
                            <div className="text-gray-300 text-sm">{item.description}</div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`px-2 py-1 rounded text-xs font-semibold text-white ${
                                item.rarity === 'common' ? 'bg-gray-500' :
                                item.rarity === 'rare' ? 'bg-blue-500' :
                                item.rarity === 'epic' ? 'bg-purple-500' :
                                item.rarity === 'legendary' ? 'bg-orange-500' :
                                'bg-red-500'
                              }`}>
                                {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                              </span>
                              <span className="text-orange-400 text-sm font-semibold">
                                {item.dropRate.toFixed(2)}%
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-semibold text-white ${
                                item.isActive ? 'bg-green-500' : 'bg-red-500'
                              }`}>
                                {item.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingGachaItem(item);
                              setNewGachaItem({
                                name: item.name,
                                description: item.description,
                                image: item.image,
                                rarity: item.rarity,
                                dropRate: item.dropRate,
                                isActive: item.isActive
                              });
                              setShowGachaForm(true);
                            }}
                            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-3 py-1 rounded text-sm transition-all duration-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this gacha item?')) {
                                try {
                                  const response = await fetch(`/api/gacha/items?id=${item.id}`, {
                                    method: 'DELETE'
                                  });
                                  
                                  if (response.ok) {
                                    loadGachaItems();
                                    setMessage('Gacha item deleted successfully!');
                                  } else {
                                    const errorData = await response.json();
                                    setMessage(`Error: ${errorData.error}`);
                                  }
                                } catch (error) {
                                  setMessage('Error deleting gacha item');
                                }
                              }
                            }}
                            className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-3 py-1 rounded text-sm transition-all duration-300"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {gachaItems.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎰</div>
                <h2 className="text-2xl font-bold text-white mb-2">No Gacha Items</h2>
                <p className="text-gray-400">No gacha items have been created yet.</p>
              </div>
            )}
          </>
        )}

        {/* Achievement Management Tab */}
        {activeTab === 'achievements' && (
          <>
            {/* Add New Achievement */}
            <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">🏆 Achievement Management</h2>
                <button
                  onClick={() => {
                    setShowAchievementForm(!showAchievementForm);
                    setEditingAchievement(null);
                    setNewAchievement({
                      title: '',
                      description: '',
                      icon: '🏆',
                      rarity: 50,
                      category: 'Goal',
                      coinReward: 100
                    });
                  }}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg transition-all duration-300"
                >
                  {showAchievementForm ? 'Cancel' : 'Add New Achievement'}
                </button>
              </div>

              {showAchievementForm && (
                <div className="bg-white/5 rounded-xl p-6 border border-white/20">
                  <h3 className="text-xl font-bold text-white mb-4">
                    {editingAchievement ? 'Edit Achievement' : 'Add New Achievement'}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Title</label>
                      <input
                        type="text"
                        value={newAchievement.title}
                        onChange={(e) => setNewAchievement({...newAchievement, title: e.target.value})}
                        className="w-full bg-gray-800/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                        placeholder="Achievement title"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Description</label>
                      <input
                        type="text"
                        value={newAchievement.description}
                        onChange={(e) => setNewAchievement({...newAchievement, description: e.target.value})}
                        className="w-full bg-gray-800/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                        placeholder="Achievement description"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Icon (Emoji)</label>
                      <input
                        type="text"
                        value={newAchievement.icon}
                        onChange={(e) => setNewAchievement({...newAchievement, icon: e.target.value})}
                        className="w-full bg-gray-800/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                        placeholder="🏆"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Category</label>
                      <select
                        value={newAchievement.category}
                        onChange={(e) => setNewAchievement({...newAchievement, category: e.target.value})}
                        className="w-full bg-gray-800/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-400"
                      >
                        <option value="Task">Task</option>
                        <option value="Goal">Goal</option>
                        <option value="Quest">Quest</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Coin Reward</label>
                      <input
                        type="number"
                        min="0"
                        value={newAchievement.coinReward}
                        onChange={(e) => setNewAchievement({...newAchievement, coinReward: parseInt(e.target.value)})}
                        className="w-full bg-gray-800/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                        placeholder="100"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Rarity (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newAchievement.rarity}
                        onChange={(e) => setNewAchievement({...newAchievement, rarity: parseInt(e.target.value)})}
                        className="w-full bg-gray-800/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                        placeholder="50"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowAchievementForm(false)}
                      className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-all duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAchievement}
                      className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg transition-all duration-300"
                    >
                      {editingAchievement ? 'Update Achievement' : 'Create Achievement'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Manage User Achievements */}
            <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6 mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">👤 Manage User Achievements</h2>
              
              <div className="mb-4">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    placeholder="Search user by username or Discord ID..."
                    value={achievementSearchTerm}
                    onChange={(e) => setAchievementSearchTerm(e.target.value)}
                    className="flex-1 bg-gray-800/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                  />
                  <button
                    onClick={searchUserForAchievement}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-all duration-300"
                  >
                    Search User
                  </button>
                </div>
                
                {/* Search Results */}
                {achievementSearchResults.length > 0 && (
                  <div className="mt-3 bg-gray-800/50 rounded-lg border border-gray-700 max-h-40 overflow-y-auto">
                    {achievementSearchResults.map((user) => (
                      <div
                        key={user.discordId}
                        className="flex items-center justify-between p-3 hover:bg-gray-700/50 cursor-pointer border-b border-gray-700 last:border-b-0"
                        onClick={() => selectUserForAchievement(user)}
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            src={getDiscordAvatarUrl(user.discordId, user.avatar)}
                            alt="Avatar"
                            className="w-8 h-8 rounded-full"
                          />
                          <div>
                            <div className="text-white font-medium">{user.username}</div>
                            <div className="text-gray-400 text-sm">ID: {user.discordId}</div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectUserForAchievement(user);
                          }}
                          className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-sm transition-all duration-300"
                        >
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedUserForAchievement && (
                <div className="bg-white/5 rounded-xl p-6 border border-white/20 mb-4">
                  <h3 className="text-xl font-bold text-white mb-4">
                    Managing achievements for: {selectedUserForAchievement.username}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {achievements.map((achievement) => (
                      <div key={achievement._id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <div className="text-3xl mb-2">{achievement.icon}</div>
                        <h4 className="font-bold text-white mb-2">{achievement.title}</h4>
                        <p className="text-gray-300 text-sm mb-3">{achievement.description}</p>
                        
                        <div className="space-y-2">
                          <div className="text-xs text-gray-400">
                            Category: {achievement.category}
                          </div>
                          <div className="text-xs text-gray-400">
                            Rarity: {achievement.rarity}%
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="Progress %"
                              className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                            />
                            <button
                              onClick={() => handleUpdateUserAchievement(achievement._id, 100)}
                              className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs transition-all duration-300"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => handleUpdateUserAchievement(achievement._id, 0)}
                              className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs transition-all duration-300"
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* All Achievements List */}
            <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
              <h2 className="text-2xl font-bold text-white mb-4">📋 All Achievements</h2>
              
              {achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.map((achievement) => (
                    <div key={achievement._id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-3xl">{achievement.icon}</div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingAchievement(achievement);
                              setNewAchievement({
                                title: achievement.title,
                                description: achievement.description,
                                icon: achievement.icon,
                                rarity: achievement.rarity,
                                category: achievement.category,
                                coinReward: achievement.coinReward || 100
                              });
                              setShowAchievementForm(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs transition-all duration-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAchievement(achievement._id)}
                            className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs transition-all duration-300"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      
                      <h4 className="font-bold text-white mb-2">{achievement.title}</h4>
                      <p className="text-gray-300 text-sm mb-3">{achievement.description}</p>
                      
                      <div className="space-y-2">
                        <div className="text-xs text-gray-400">
                          Category: {achievement.category}
                        </div>
                        <div className="text-xs text-gray-400">
                          Rarity: {achievement.rarity}%
                        </div>
                        <div className="text-xs text-gray-400">
                          Created: {new Date(achievement.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏆</div>
                  <h2 className="text-2xl font-bold text-white mb-2">No Achievements</h2>
                  <p className="text-gray-400">No achievements have been created yet.</p>
                </div>
              )}
            </div>

          </>
        )}

        {/* House Management Tab */}
        {activeTab === 'houses' && (
          <>
            <HouseManager />
          </>
        )}

        {/* StardustCoin Management Tab */}
        {activeTab === 'stardustcoin' && (
          <>
            <StardustCoinManager />
          </>
        )}

        {/* Analytics Dashboard Tab */}
        {activeTab === 'analytics' && (
          <>
            <AnalyticsDashboard />
          </>
        )}
      </div>
    </div>
  );
}
