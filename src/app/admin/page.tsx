'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { isAdmin, isAdminWithDB } from '@/lib/admin-config';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';

// Lazy load heavy components to improve initial load time
const HouseManager = lazy(() => import('@/components/admin/HouseManager'));
const AnalyticsDashboard = lazy(() => import('@/components/admin/AnalyticsDashboard'));
const ShopAnalytics = lazy(() => import('@/components/admin/ShopAnalytics'));
const UserPurchaseAnalytics = lazy(() => import('@/components/admin/UserPurchaseAnalytics'));
const AdminManagement = lazy(() => import('@/components/admin/AdminManagement'));
const LobbyManagement = lazy(() => import('@/components/admin/LobbyManagement'));
const ClassManagementDashboard = lazy(() => import('@/components/ClassManagementDashboard'));

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
  isCurrentlyInVoice?: boolean;
  wasInVoiceToday?: boolean;
  currentVoiceChannel?: string;
  currentVoiceJoinTime?: string;
  timeInCurrentVoice?: number;
  roles?: string[];
  roleCount?: number;
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
  const [activeTab, setActiveTab] = useState<'users' | 'voice-activity' | 'gacha' | 'achievements' | 'houses' | 'analytics' | 'shop' | 'shop-analytics' | 'assessment' | 'assessment-create' | 'assessment-users' | 'assessment-recent' | 'assessment-settings' | 'admin-management' | 'lobby-management' | 'remind' | 'class-management'>('users');
  const [shopAnalyticsData, setShopAnalyticsData] = useState<any>(null);
  const [shopSubTab, setShopSubTab] = useState<'management' | 'analytics'>('management');
  // Voice tracking filters for user management
  const [voiceFilter, setVoiceFilter] = useState<'all' | 'real_user' | 'suspicious_user'>('all');
  const [voiceStatusFilter, setVoiceStatusFilter] = useState<'all' | 'currently_in_voice' | 'was_in_voice_today' | 'not_in_voice_today'>('all');
  
  
  const [sortBy, setSortBy] = useState<'default' | 'username' | 'join_date' | 'voice_activity' | 'role'>('default');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [gachaItems, setGachaItems] = useState<any[]>([]);
  const [showGachaForm, setShowGachaForm] = useState(false);
  const [editingGachaItem, setEditingGachaItem] = useState<any>(null);
  
  // Full-screen image viewer state
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Super admin state and current admin list
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentAdmins, setCurrentAdmins] = useState<string[]>([]);
  const [hasAdminAccess, setHasAdminAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const userId = (session?.user as any)?.id as string | undefined;
    if (userId === '898059066537029692') {
      setIsSuperAdmin(true);
      fetch('/api/admin/admin-users')
        .then(res => (res.ok ? res.json() : Promise.reject()))
        .then(data => setCurrentAdmins((data.admins || []).map((a: any) => a.userId as string)))
        .catch(() => {});
    } else {
      setIsSuperAdmin(false);
      setCurrentAdmins([]);
    }
  }, [session]);

  // Handle ESC key to close full-screen image
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && fullscreenImage) {
        setFullscreenImage(null);
      }
    };

    if (fullscreenImage) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [fullscreenImage]);
  
  // Assessment states
  const [assessmentQuestions, setAssessmentQuestions] = useState<any[]>([]);
  const [assessmentAnswers, setAssessmentAnswers] = useState<any[]>([]);
  const [assessmentUsers, setAssessmentUsers] = useState<any[]>([]);
  const [assessmentSettings, setAssessmentSettings] = useState<any>(null);
  const [assessmentNicknames, setAssessmentNicknames] = useState<{[key: string]: string}>({});
  const [selectedAssessmentUser, setSelectedAssessmentUser] = useState<any>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [questionForm, setQuestionForm] = useState({
    phase: 1,
    path: '',
    questionText: '',
    questionImage: '',
    questionImages: [] as string[],
    requiresImageUpload: false,
    timeLimitMinutes: null as number | null,
    skillCategories: {
      selfLearning: 0,
      creative: 0,
      algorithm: 0,
      logic: 0,
      communication: 0,
      presentation: 0,
      leadership: 0,
      careerKnowledge: 0
    },
    // New field to define which categories this question awards points in
    awardsCategories: {
      selfLearning: false,
      creative: false,
      algorithm: false,
      logic: false,
      communication: false,
      presentation: false,
      leadership: false,
      careerKnowledge: false
    },
    order: 1
  });

  // Shop management states
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [showShopForm, setShowShopForm] = useState(false);
  const [editingShopItem, setEditingShopItem] = useState<any>(null);
  const [newShopItem, setNewShopItem] = useState({
    name: '',
    description: '',
    price: '',
    image: '',
    category: 'cosmetic',
    contentType: 'none',
    textContent: '',
    linkUrl: '',
    youtubeUrl: '',
    inStock: true,
    allowMultiplePurchases: false,
    requiresRole: false,
    requiredRoleId: '',
    requiredRoleName: ''
  });
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
  const [addCoinsAmount, setAddCoinsAmount] = useState<number>(0);
  const [setCoinsAmount, setSetCoinsAmount] = useState<number>(0);
  const [decreaseCoinsAmount, setDecreaseCoinsAmount] = useState<number>(0);

  // Using centralized admin config

  // Helper function to get display name (nickname > globalName > username)
  const getDisplayName = (user: UserData) => {
    // Prioritize currentNickname from API data
    if (user.currentNickname) {
      return user.currentNickname;
    }
    // Fallback to userNicknames from separate API calls
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

    // Check admin access with database lookup
    const checkAdminAccess = async () => {
      const userId = (session.user as any)?.id;
      console.log('🔍 Admin Panel Debug - User ID:', userId);
      console.log('🔍 Admin Panel Debug - Session:', session);
      
      if (!userId) {
        console.log('❌ Admin Panel Debug - No user ID found');
        setHasAdminAccess(false);
        router.push('/');
        return;
      }

      console.log('🔍 Admin Panel Debug - Checking admin access for:', userId);
      const adminAccess = await isAdminWithDB(userId);
      console.log('🔍 Admin Panel Debug - Admin access result:', adminAccess);
      setHasAdminAccess(adminAccess);
      
      if (!adminAccess) {
        router.push('/');
        return;
      }

      // Load all users when component mounts
      loadAllUsers();
      loadGachaItems();
      loadAchievements();
    };

    checkAdminAccess();
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

  // Separate useEffect to load assessment data when switching to assessment tabs
  useEffect(() => {
    if (activeTab === 'assessment' || activeTab.startsWith('assessment-')) {
      console.log('Admin Panel - Loading assessment data for tab:', activeTab);
      loadAssessmentQuestions();
      loadAssessmentAnswers();
      loadAssessmentUsers();
      loadAssessmentSettings();
    }
  }, [activeTab]);

  // Assessment loading functions
  const loadAssessmentQuestions = async () => {
    try {
      console.log('Admin Panel - Loading assessment questions...');
      const response = await fetch('/api/assessment/questions?admin=true');
      console.log('Admin Panel - API Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Admin Panel - API Response data:', data);
        setAssessmentQuestions(data.questions || []);
        console.log('Admin Panel - Set questions:', data.questions?.length || 0);
      } else {
        const errorData = await response.json();
        console.error('Admin Panel - API Error:', errorData);
      }
    } catch (error) {
      console.error('Admin Panel - Error loading assessment questions:', error);
    }
  };

  const loadAssessmentAnswers = async () => {
    try {
      const response = await fetch('/api/assessment/answers?admin=true');
      if (response.ok) {
        const data = await response.json();
        setAssessmentAnswers(data.answers || []);
        
        // Fetch nicknames for all unique user IDs
        const userIds = [...new Set(data.answers?.map((answer: any) => answer.userId) || [])] as string[];
        if (userIds.length > 0) {
          await fetchAssessmentNicknames(userIds);
        }
      }
    } catch (error) {
      console.error('Error loading assessment answers:', error);
    }
  };

  const loadAssessmentUsers = async () => {
    try {
      const response = await fetch('/api/assessment/users');
      if (response.ok) {
        const data = await response.json();
        setAssessmentUsers(data.users || []);
        
        // Fetch nicknames for all unique user IDs
        const userIds = [...new Set(data.users?.map((user: any) => user.userId) || [])] as string[];
        if (userIds.length > 0) {
          await fetchAssessmentNicknames(userIds);
        }
      }
    } catch (error) {
      console.error('Error loading assessment users:', error);
    }
  };

  const loadAssessmentSettings = async () => {
    try {
      const response = await fetch('/api/assessment/settings');
      if (response.ok) {
        const data = await response.json();
        setAssessmentSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading assessment settings:', error);
    }
  };

  const fetchAssessmentNicknames = async (userIds: string[]) => {
    try {
      const response = await fetch('/api/users/nicknames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds })
      });
      const data = await response.json();
      if (response.ok) {
        setAssessmentNicknames(data.nicknames);
      }
    } catch (error) {
      console.error('Error fetching assessment nicknames:', error);
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

  // Filter users based on voice status and role modules
  const getFilteredUsers = () => {
    let filtered = searchResults;

    // Apply voice status filter
    if (voiceStatusFilter === 'currently_in_voice') {
      filtered = filtered.filter(user => user.isCurrentlyInVoice);
    } else if (voiceStatusFilter === 'was_in_voice_today') {
      filtered = filtered.filter(user => user.wasInVoiceToday);
    } else if (voiceStatusFilter === 'not_in_voice_today') {
      filtered = filtered.filter(user => !user.wasInVoiceToday);
    }


    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'username':
          const nameA = (a.globalName || a.username).toLowerCase();
          const nameB = (b.globalName || b.username).toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        case 'join_date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'voice_activity':
          const voiceA = a.voiceJoinCount || 0;
          const voiceB = b.voiceJoinCount || 0;
          comparison = voiceA - voiceB;
          break;
        case 'role':
          const roleCountA = a.roleCount || 0;
          const roleCountB = b.roleCount || 0;
          comparison = roleCountA - roleCountB;
          break;
        default:
          // Default sorting by creation date
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
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

  const addUserCoins = async (userId: string, amountToAdd: number) => {
    if (!userCurrency) return;

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
          hamsterCoins: amountToAdd,
          operation: 'add'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add coins');
      }

      const data = await response.json();
      setUserCurrency(data.currency);
      setMessage(`Successfully added ${amountToAdd.toLocaleString()} coins!`);

      // Refresh the currency data
      await getUserCurrency(userId);
    } catch (error) {
      setMessage('Error adding coins. Please try again.');
      console.error('Add coins error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const decreaseUserCoins = async (userId: string, amountToDecrease: number) => {
    if (!userCurrency) return;

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
          hamsterCoins: amountToDecrease,
          operation: 'decrease'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to decrease coins');
      }

      const data = await response.json();
      setUserCurrency(data.currency);
      setMessage(`Successfully decreased ${amountToDecrease.toLocaleString()} coins!`);

      // Refresh the currency data
      await getUserCurrency(userId);
    } catch (error) {
      setMessage('Error decreasing coins. Please try again.');
      console.error('Decrease coins error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setUserCoins = async (userId: string, exactAmount: number) => {
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
          hamsterCoins: exactAmount,
          operation: 'set'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to set coins');
      }

      const data = await response.json();
      setUserCurrency(data.currency);
      setMessage(`Successfully set balance to ${exactAmount.toLocaleString()} coins!`);

      // Refresh the currency data
      await getUserCurrency(userId);
    } catch (error) {
      setMessage('Error setting coins. Please try again.');
      console.error('Set coins error:', error);
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
    // Reset coin management input values
    setAddCoinsAmount(0);
    setSetCoinsAmount(0);
    setDecreaseCoinsAmount(0);
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

  const uploadQuestionImage = async (file: File) => {
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
      setQuestionForm({...questionForm, questionImages: [...questionForm.questionImages, data.imageUrl]});
      setMessage('Question image uploaded successfully!');
      
    } catch (error) {
      setMessage(`Error uploading question image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Question image upload error:', error);
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

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/assessment/users?userId=${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        alert(`User assessment data deleted successfully!\nDeleted ${result.deletedAnswers} answers and ${result.deletedProgress} progress records.`);
        
        // Reload the assessment users data
        loadAssessmentUsers();
      } else {
        const error = await response.json();
        alert(`Failed to delete user: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user assessment data');
    }
  };

  // Debounce timer for auto-save
  const autoSaveTimers: { [key: string]: NodeJS.Timeout } = {};

  const handleAutoSaveSkillScores = async (answerId: string) => {
    // Clear existing timer for this answer
    if (autoSaveTimers[answerId]) {
      clearTimeout(autoSaveTimers[answerId]);
    }

    // Set new timer to save after 1 second of no changes
    autoSaveTimers[answerId] = setTimeout(async () => {
      try {
        // Collect all skill scores from the input fields
        const skillScores: { [key: string]: number } = {};
        const skills = ['selfLearning', 'creative', 'algorithm', 'logic', 'communication', 'presentation', 'leadership', 'careerKnowledge'];
        
        skills.forEach(skill => {
          const input = document.getElementById(`${skill}-${answerId}`) as HTMLInputElement;
          if (input) {
            skillScores[skill] = parseFloat(input.value) || 0;
          }
        });

        // Send the update to the API
        const response = await fetch('/api/assessment/answers', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            answerId,
            skillScores,
            status: 'approved' // Auto-approve when scores are set
          }),
        });

        if (response.ok) {
          console.log('✅ Skill scores auto-saved successfully!');
          // Reload the assessment users data to show updated scores
          loadAssessmentUsers();
        } else {
          const error = await response.json();
          console.error(`❌ Failed to auto-save scores: ${error.error}`);
        }
      } catch (error) {
        console.error('Error auto-saving skill scores:', error);
      }
    }, 1000); // Wait 1 second after last change
  };

  const handleSaveSkillScores = async (answerId: string) => {
    try {
      // Collect all skill scores from the input fields
      const skillScores: { [key: string]: number } = {};
      const skills = ['selfLearning', 'creative', 'algorithm', 'logic', 'communication', 'presentation', 'leadership', 'careerKnowledge'];
      
      skills.forEach(skill => {
        const input = document.getElementById(`${skill}-${answerId}`) as HTMLInputElement;
        if (input) {
          skillScores[skill] = parseFloat(input.value) || 0;
        }
      });

      // Send the update to the API
      const response = await fetch('/api/assessment/answers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answerId,
          skillScores,
          status: 'approved' // Auto-approve when scores are set
        }),
      });

      if (response.ok) {
        alert('✅ Skill scores saved successfully!');
        // Reload the assessment users data to show updated scores
        loadAssessmentUsers();
      } else {
        const error = await response.json();
        alert(`❌ Failed to save scores: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving skill scores:', error);
      alert('❌ Error saving skill scores');
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
  if (status === 'loading' || hasAdminAccess === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!session || !hasAdminAccess) {
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
        <div className="mb-8">
          {/* Main Navigation */}
          <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
              activeTab === 'users'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            👥 Users
          </button>
          <button
            onClick={() => router.push('/admin/voice-dashboard')}
            className="px-4 py-2 rounded-lg font-medium transition-all duration-300 bg-blue-600 text-white hover:bg-blue-700 text-sm"
          >
            🎤 Voice
          </button>
          <button
            onClick={() => setActiveTab('gacha')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
              activeTab === 'gacha'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            🎰 Gacha
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
              activeTab === 'achievements'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            🏆 Achievements
          </button>
          <button
            onClick={() => setActiveTab('houses')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
              activeTab === 'houses'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            🏠 Houses
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
              activeTab === 'analytics'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            📊 Analytics
          </button>
          <button
            onClick={() => setActiveTab('shop')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
              activeTab === 'shop'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            🛒 Shop
          </button>
          <button
            onClick={() => setActiveTab('shop-analytics')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
              activeTab === 'shop-analytics'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            📊 Shop Analytics
          </button>
          <button
            onClick={() => {
              if (activeTab === 'assessment' || activeTab.startsWith('assessment-')) {
                setActiveTab('assessment');
              } else {
                setActiveTab('assessment-create');
              }
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
              activeTab === 'assessment' || activeTab.startsWith('assessment-')
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            📝 Assessment Management
          </button>
          <button
            onClick={() => setActiveTab('admin-management')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
              activeTab === 'admin-management'
                ? 'bg-red-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            👑 Admin Management
          </button>
          <button
            onClick={() => setActiveTab('lobby-management')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
              activeTab === 'lobby-management'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            🏛️ Lobby Management
          </button>
          <button
            onClick={() => setActiveTab('remind')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
              activeTab === 'remind'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            📨 Remind
          </button>
          <button
            onClick={() => setActiveTab('class-management')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
              activeTab === 'class-management'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            🎓 Class Management
          </button>
          </div>
        </div>

        {/* Assessment Sub-tabs */}
        {(activeTab === 'assessment' || activeTab.startsWith('assessment-')) && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('assessment-create')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
                  activeTab === 'assessment-create'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
              >
                📝 Create Question
              </button>
              <button
                onClick={() => setActiveTab('assessment-users')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
                  activeTab === 'assessment-users'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
              >
                👥 Users
              </button>
              <button
                onClick={() => setActiveTab('assessment-recent')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
                  activeTab === 'assessment-recent'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
              >
                📋 Recent
              </button>
              <button
                onClick={() => setActiveTab('assessment-settings')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
                  activeTab === 'assessment-settings'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
              >
                ⚙️ Settings
              </button>
            </div>
          </div>
        )}

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
                                      placeholder="Search by username, global name, nickname, or username history... (leave empty to show all)"
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
              <div className="mt-3 text-sm text-gray-400">
                💡 <strong>Search Tips:</strong> You can search by current username, global name, server nickname, or any previous username from their history. 
                The search will find users even if they&apos;ve changed their username multiple times.
              </div>
            </div>

            {/* Role Filter Modules & Sorting */}
            <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6 mb-8">

              {/* Quick Voice Status Filter */}
              <div className="flex gap-4 flex-wrap mb-4">
                <select
                  value={voiceStatusFilter}
                  onChange={(e) => setVoiceStatusFilter(e.target.value as any)}
                  className="bg-gray-800/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-400"
                >
                  <option value="all">All Users</option>
                  <option value="currently_in_voice">Currently in Voice</option>
                  <option value="was_in_voice_today">Was in Voice Today</option>
                  <option value="not_in_voice_today">Not in Voice Today</option>
                </select>
                
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                  <span>Currently in Voice</span>
                  <span className="w-3 h-3 bg-green-500 rounded-full ml-4"></span>
                  <span>Was in Voice Today</span>
                  <span className="w-3 h-3 bg-red-500 rounded-full ml-4"></span>
                  <span>Not in Voice Today</span>
                </div>
              </div>

              {/* Sorting Controls */}
              <div className="flex gap-4 flex-wrap mb-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-gray-800/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-400"
                >
                  <option value="default">Sort by Join Date</option>
                  <option value="username">Sort by Username</option>
                  <option value="join_date">Sort by Join Date</option>
                  <option value="voice_activity">Sort by Voice Activity</option>
                  <option value="role">Sort by Role</option>
                </select>
                
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="bg-gray-800/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-400"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>

              {/* Role Filter Module Manager */}

            </div>

            {/* Users List */}
            {searchResults.length > 0 && (
              <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      👥 Users ({getFilteredUsers().length} found)
                    </h3>
                    {voiceStatusFilter !== 'all' && (
                      <div className="text-sm text-gray-400 mt-1">
                        Active filters: Voice Status
                      </div>
                    )}
                  </div>
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
                  {getFilteredUsers().map((user) => {
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
                              <Image
                                src={`https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`}
                                alt={user.username}
                                width={48}
                                height={48}
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
                                
                                {/* Show if user has a different display name than username */}
                                {getDisplayName(user) !== user.username && !user.currentNickname && !userNicknames[user.discordId] && (
                                  <div className="text-blue-400 text-sm">
                                    📝 Display Name: {getDisplayName(user)}
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
                                  
                                  {/* Current voice status */}
                                  {user.isCurrentlyInVoice && (
                                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full text-xs font-medium">
                                      🎤 Live in {user.currentVoiceChannel} • {user.timeInCurrentVoice}m
                                    </span>
                                  )}
                                  
                                  {/* Today's voice activity */}
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    user.wasInVoiceToday 
                                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  }`}>
                                    {user.wasInVoiceToday ? '✓ Today' : '✗ Today'}
                                  </span>
                                  
                                  {/* Role information */}
                                  {user.roles && user.roles.length > 0 && (
                                    <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-1 rounded-full text-xs font-medium">
                                      🎭 {user.roleCount} role{user.roleCount !== 1 ? 's' : ''}
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
                                  {session?.user && (session.user as any).id === '898059066537029692' && (
                                    <div className="space-y-2">
                                      {!currentAdmins.includes(user.discordId) ? (
                                        <button
                                          onClick={async () => {
                                            const res = await fetch('/api/admin/admin-users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.discordId }) });
                                            if (res.ok) {
                                              setCurrentAdmins([...currentAdmins, user.discordId]);
                                              setMessage(`Granted admin to ${user.username}`);
                                              setTimeout(() => setMessage(''), 2000);
                                            }
                                          }}
                                          className="w-full bg-green-600 hover:bg-green-500 text-white py-2 px-4 rounded-lg transition-all duration-300"
                                        >
                                          👑 Grant Admin
                                        </button>
                                      ) : (
                                        <button
                                          onClick={async () => {
                                            const res = await fetch(`/api/admin/admin-users?userId=${user.discordId}`, { method: 'DELETE' });
                                            if (res.ok) {
                                              setCurrentAdmins(currentAdmins.filter(id => id !== user.discordId));
                                              setMessage(`Revoked admin from ${user.username}`);
                                              setTimeout(() => setMessage(''), 2000);
                                            }
                                          }}
                                          className="w-full bg-red-600 hover:bg-red-500 text-white py-2 px-4 rounded-lg transition-all duration-300"
                                        >
                                          🔒 Revoke Admin
                                        </button>
                                      )}
                                    </div>
                                  )}
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
                              <label className="block text-gray-300 text-sm mb-2">New Balance</label>
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

                        {/* Coin Management Actions */}
                        <div className="bg-gray-800/30 rounded-lg p-4">
                          <h4 className="text-lg font-semibold text-white mb-3">Coin Management Actions</h4>

                          {/* Add Coins */}
                          <div className="mb-4">
                            <label className="block text-gray-300 text-sm mb-2">Add Coins</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="0"
                                placeholder="Amount to add"
                                value={addCoinsAmount || ''}
                                onChange={(e) => setAddCoinsAmount(parseInt(e.target.value) || 0)}
                                className="flex-1 bg-gray-700/50 border border-green-500/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-green-400"
                              />
                              <button
                                onClick={() => addUserCoins(selectedUser.discordId, addCoinsAmount)}
                                disabled={isLoading || addCoinsAmount <= 0}
                                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-all duration-300 font-medium"
                              >
                                {isLoading ? '...' : '➕ Add'}
                              </button>
                            </div>
                          </div>

                          {/* Set Coins */}
                          <div className="mb-4">
                            <label className="block text-gray-300 text-sm mb-2">Set Coins (Exact Amount)</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="0"
                                placeholder="New balance"
                                value={setCoinsAmount || ''}
                                onChange={(e) => setSetCoinsAmount(parseInt(e.target.value) || 0)}
                                className="flex-1 bg-gray-700/50 border border-blue-500/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                              />
                              <button
                                onClick={() => setUserCoins(selectedUser.discordId, setCoinsAmount)}
                                disabled={isLoading || setCoinsAmount < 0}
                                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-all duration-300 font-medium"
                              >
                                {isLoading ? '...' : '🎯 Set'}
                              </button>
                            </div>
                          </div>

                          {/* Decrease Coins */}
                          <div className="mb-4">
                            <label className="block text-gray-300 text-sm mb-2">Decrease Coins</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="0"
                                placeholder="Amount to decrease"
                                value={decreaseCoinsAmount || ''}
                                onChange={(e) => setDecreaseCoinsAmount(parseInt(e.target.value) || 0)}
                                className="flex-1 bg-gray-700/50 border border-red-500/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-red-400"
                              />
                              <button
                                onClick={() => decreaseUserCoins(selectedUser.discordId, decreaseCoinsAmount)}
                                disabled={isLoading || decreaseCoinsAmount <= 0}
                                className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-all duration-300 font-medium"
                              >
                                {isLoading ? '...' : '➖ Decrease'}
                              </button>
                            </div>
                          </div>

                          {/* Current Balance Display */}
                          <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                            <div className="text-orange-300 text-sm font-medium">
                              Current Balance: {userCurrency?.hamsterCoins.toLocaleString() || 0} 🪙
                            </div>
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
                            <div className="text-2xl relative">
                              {newGachaItem.image.startsWith('/') ? (
                                <>
                                  <Image 
                                    src={newGachaItem.image} 
                                    alt="Preview"
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 object-cover rounded"
                                  />
                                  <button
                                    onClick={() => setFullscreenImage(newGachaItem.image)}
                                    className="absolute -top-1 -right-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold opacity-80 hover:opacity-100 transition-opacity"
                                    title="View full screen"
                                  >
                                    ⛶
                                  </button>
                                </>
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
                          <div className="text-3xl relative">
                            {item.image.startsWith('/') ? (
                              <>
                                <Image 
                                  src={item.image} 
                                  alt={item.name}
                                  width={48}
                                  height={48}
                                  className="w-12 h-12 object-cover rounded-lg"
                                />
                                <button
                                  onClick={() => setFullscreenImage(item.image)}
                                  className="absolute -top-1 -right-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold opacity-80 hover:opacity-100 transition-opacity"
                                  title="View full screen"
                                >
                                  ⛶
                                </button>
                              </>
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
                          <Image
                            src={getDiscordAvatarUrl(user.discordId, user.avatar)}
                            alt="Avatar"
                            width={32}
                            height={32}
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
          <Suspense fallback={<div className="text-center p-8">Loading House Manager...</div>}>
            <HouseManager />
          </Suspense>
        )}


        {/* Analytics Dashboard Tab */}
        {activeTab === 'analytics' && (
          <Suspense fallback={<div className="text-center p-8">Loading Analytics Dashboard...</div>}>
            <AnalyticsDashboard />
          </Suspense>
        )}

        {/* Shop Management Tab */}
        {activeTab === 'shop' && (
          <>
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">
                  🛒 Shop Management
                </h2>
                <p className="text-gray-300 text-lg">
                  Manage shop items, inventory, and sales
                </p>
              </div>

              {/* Add New Item Button */}
              <div className="bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-sm rounded-2xl border border-orange-500/20 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-white">Shop Items Management</h2>
                  <button
                    onClick={() => {
                      setShowShopForm(!showShopForm);
                      setEditingShopItem(null);
                      setNewShopItem({
                        name: '',
                        description: '',
                        price: '',
                        image: '',
                        category: 'cosmetic',
                        contentType: 'none',
                        textContent: '',
                        linkUrl: '',
                        youtubeUrl: '',
                        inStock: true,
                        allowMultiplePurchases: false,
                        requiresRole: false,
                        requiredRoleId: '',
                        requiredRoleName: ''
                      });
                    }}
                    className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-6 py-3 rounded-lg transition-all duration-300"
                  >
                    {showShopForm ? 'Cancel' : '➕ Add New Item'}
                  </button>
                </div>

                {/* Add/Edit Item Form */}
                {showShopForm && (
                  <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                    <h3 className="text-2xl font-bold text-white mb-4">
                      {editingShopItem ? 'Edit Item' : 'Add New Item'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Item Name"
                        value={editingShopItem ? editingShopItem.name : newShopItem.name}
                        onChange={(e) => {
                          if (editingShopItem) {
                            setEditingShopItem({...editingShopItem, name: e.target.value});
                          } else {
                            setNewShopItem({...newShopItem, name: e.target.value});
                          }
                        }}
                        className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={editingShopItem ? editingShopItem.description : newShopItem.description}
                        onChange={(e) => {
                          if (editingShopItem) {
                            setEditingShopItem({...editingShopItem, description: e.target.value});
                          } else {
                            setNewShopItem({...newShopItem, description: e.target.value});
                          }
                        }}
                        className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={editingShopItem ? editingShopItem.price : newShopItem.price}
                        onChange={(e) => {
                          if (editingShopItem) {
                            setEditingShopItem({...editingShopItem, price: e.target.value});
                          } else {
                            setNewShopItem({...newShopItem, price: e.target.value});
                          }
                        }}
                        className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                      />
                      <input
                        type="text"
                        placeholder="Image (emoji or URL)"
                        value={editingShopItem ? editingShopItem.image : newShopItem.image}
                        onChange={(e) => {
                          if (editingShopItem) {
                            setEditingShopItem({...editingShopItem, image: e.target.value});
                          } else {
                            setNewShopItem({...newShopItem, image: e.target.value});
                          }
                        }}
                        className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                      />

                      <select
                        value={editingShopItem ? editingShopItem.category : newShopItem.category}
                        onChange={(e) => {
                          if (editingShopItem) {
                            setEditingShopItem({...editingShopItem, category: e.target.value});
                          } else {
                            setNewShopItem({...newShopItem, category: e.target.value});
                          }
                        }}
                        className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                      >
                        <option value="cosmetic">Cosmetic</option>
                        <option value="gaming">Gaming</option>
                        <option value="other">Other</option>
                      </select>

                      <select
                        value={editingShopItem ? editingShopItem.contentType : newShopItem.contentType}
                        onChange={(e) => {
                          if (editingShopItem) {
                            setEditingShopItem({...editingShopItem, contentType: e.target.value});
                          } else {
                            setNewShopItem({...newShopItem, contentType: e.target.value});
                          }
                        }}
                        className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                      >
                        <option value="none">No Additional Content</option>
                        <option value="text">Text Content</option>
                        <option value="link">External Link</option>
                        <option value="file">File Download</option>
                        <option value="youtube">YouTube Video</option>
                      </select>

                      {/* Conditional content fields */}
                      {(editingShopItem ? editingShopItem.contentType : newShopItem.contentType) === 'text' && (
                        <div className="md:col-span-2">
                          <textarea
                            placeholder="Enter text content..."
                            value={editingShopItem ? editingShopItem.textContent : newShopItem.textContent}
                            onChange={(e) => {
                              if (editingShopItem) {
                                setEditingShopItem({...editingShopItem, textContent: e.target.value});
                              } else {
                                setNewShopItem({...newShopItem, textContent: e.target.value});
                              }
                            }}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 h-24"
                          />
                        </div>
                      )}

                      {(editingShopItem ? editingShopItem.contentType : newShopItem.contentType) === 'link' && (
                        <div className="md:col-span-2">
                          <input
                            type="url"
                            placeholder="https://example.com"
                            value={editingShopItem ? editingShopItem.linkUrl : newShopItem.linkUrl}
                            onChange={(e) => {
                              if (editingShopItem) {
                                setEditingShopItem({...editingShopItem, linkUrl: e.target.value});
                              } else {
                                setNewShopItem({...newShopItem, linkUrl: e.target.value});
                              }
                            }}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                          />
                        </div>
                      )}

                      {(editingShopItem ? editingShopItem.contentType : newShopItem.contentType) === 'youtube' && (
                        <div className="md:col-span-2">
                          <input
                            type="url"
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={editingShopItem ? editingShopItem.youtubeUrl : newShopItem.youtubeUrl}
                            onChange={(e) => {
                              if (editingShopItem) {
                                setEditingShopItem({...editingShopItem, youtubeUrl: e.target.value});
                              } else {
                                setNewShopItem({...newShopItem, youtubeUrl: e.target.value});
                              }
                            }}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                          />
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={editingShopItem ? editingShopItem.inStock : newShopItem.inStock}
                          onChange={(e) => {
                            if (editingShopItem) {
                              setEditingShopItem({...editingShopItem, inStock: e.target.checked});
                            } else {
                              setNewShopItem({...newShopItem, inStock: e.target.checked});
                            }
                          }}
                          className="bg-white/10 border border-white/20 rounded"
                        />
                        <label className="text-white">In Stock</label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={editingShopItem ? editingShopItem.allowMultiplePurchases : newShopItem.allowMultiplePurchases}
                          onChange={(e) => {
                            if (editingShopItem) {
                              setEditingShopItem({...editingShopItem, allowMultiplePurchases: e.target.checked});
                            } else {
                              setNewShopItem({...newShopItem, allowMultiplePurchases: e.target.checked});
                            }
                          }}
                          className="bg-white/10 border border-white/20 rounded"
                        />
                        <label className="text-white">Allow Multiple Purchases</label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={editingShopItem ? editingShopItem.requiresRole : newShopItem.requiresRole}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            if (editingShopItem) {
                              setEditingShopItem({
                                ...editingShopItem,
                                requiresRole: checked,
                                requiredRoleId: checked ? '1388546120912998554' : '',
                                requiredRoleName: checked ? 'Starway' : ''
                              });
                            } else {
                              setNewShopItem({
                                ...newShopItem,
                                requiresRole: checked,
                                requiredRoleId: checked ? '1388546120912998554' : '',
                                requiredRoleName: checked ? 'Starway' : ''
                              });
                            }
                          }}
                          className="bg-white/10 border border-white/20 rounded"
                        />
                        <label className="text-white">Require Discord Role</label>
                      </div>

                      {(editingShopItem ? editingShopItem.requiresRole : newShopItem.requiresRole) && (
                        <div className="md:col-span-2 space-y-3">
                          <input
                            type="text"
                            placeholder="Discord Role ID"
                            value={editingShopItem ? editingShopItem.requiredRoleId : newShopItem.requiredRoleId}
                            onChange={(e) => {
                              if (editingShopItem) {
                                setEditingShopItem({...editingShopItem, requiredRoleId: e.target.value});
                              } else {
                                setNewShopItem({...newShopItem, requiredRoleId: e.target.value});
                              }
                            }}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                          />
                          <input
                            type="text"
                            placeholder="Role Name"
                            value={editingShopItem ? editingShopItem.requiredRoleName : newShopItem.requiredRoleName}
                            onChange={(e) => {
                              if (editingShopItem) {
                                setEditingShopItem({...editingShopItem, requiredRoleName: e.target.value});
                              } else {
                                setNewShopItem({...newShopItem, requiredRoleName: e.target.value});
                              }
                            }}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex space-x-3">
                      <button
                        onClick={() => {
                          if (editingShopItem) {
                            // Update existing item
                            setShopItems(shopItems.map(item =>
                              item.id === editingShopItem.id ? editingShopItem : item
                            ));
                            setEditingShopItem(null);
                          } else {
                            // Add new item
                            const newItem = { ...newShopItem, id: Date.now().toString() };
                            setShopItems([...shopItems, newItem]);
                          }
                          setShowShopForm(false);
                        }}
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg transition-colors"
                      >
                        {editingShopItem ? 'Update Item' : 'Add Item'}
                      </button>
                      <button
                        onClick={() => {
                          setShowShopForm(false);
                          setEditingShopItem(null);
                        }}
                        className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Shop Items List */}
                <div className="grid gap-4">
                  {shopItems.map(item => (
                    <div
                      key={item.id}
                      className="bg-white/5 rounded-lg p-4 border border-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">{item.image}</div>
                          <div>
                            <h3 className="text-white font-semibold">{item.name}</h3>
                            <p className="text-gray-400 text-sm">{item.description}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-orange-400 font-bold">${item.price}</span>
                              <span className={`text-sm px-2 py-1 rounded-full ${
                                item.inStock
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {item.inStock ? 'In Stock' : 'Out of Stock'}
                              </span>
                              {item.requiresRole && (
                                <span className="text-sm px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">
                                  🔒 {item.requiredRoleName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingShopItem(item);
                              setShowShopForm(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg transition-colors"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => {
                              setShopItems(shopItems.filter(i => i.id !== item.id));
                            }}
                            className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-lg transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Shop Analytics Tab */}
        {activeTab === 'shop-analytics' && (
          <>
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">
                  📊 Shop Analytics Dashboard
                </h2>
                <p className="text-gray-300 text-lg">
                  Comprehensive analytics for shop performance and user behavior
                </p>
              </div>

              {/* Shop Analytics Component */}
              <Suspense fallback={<div className="text-center p-8">Loading Shop Analytics...</div>}>
                <ShopAnalytics />
              </Suspense>

              {/* User Purchase Analytics */}
              {shopAnalyticsData?.userPurchases && shopAnalyticsData.userPurchases.length > 0 && (
                <div className="mt-8">
                  <Suspense fallback={<div className="text-center p-8">Loading User Purchase Analytics...</div>}>
                    <UserPurchaseAnalytics userPurchases={shopAnalyticsData.userPurchases} />
                  </Suspense>
                </div>
              )}
            </div>
          </>
        )}

          {/* Assessment Management Main Tab */}
        {activeTab === 'assessment' && (
          <>
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">
                  📝 Assessment Management
                </h2>
                <p className="text-gray-400">Manage assessment questions, users, and settings</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 backdrop-blur-sm rounded-xl p-6 border border-orange-500/20 hover:border-orange-400/40 transition-all duration-300 cursor-pointer" onClick={() => setActiveTab('assessment-create')}>
                  <div className="text-center">
                    <div className="text-4xl mb-4">📝</div>
                    <h3 className="text-xl font-bold text-white mb-2">Create Question</h3>
                    <p className="text-gray-300 text-sm">Create new assessment questions</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 cursor-pointer" onClick={() => setActiveTab('assessment-users')}>
                  <div className="text-center">
                    <div className="text-4xl mb-4">👥</div>
                    <h3 className="text-xl font-bold text-white mb-2">Users</h3>
                    <p className="text-gray-300 text-sm">View user progress and scores</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 backdrop-blur-sm rounded-xl p-6 border border-green-500/20 hover:border-green-400/40 transition-all duration-300 cursor-pointer" onClick={() => setActiveTab('assessment-recent')}>
                  <div className="text-center">
                    <div className="text-4xl mb-4">📋</div>
                    <h3 className="text-xl font-bold text-white mb-2">Recent</h3>
                    <p className="text-gray-300 text-sm">View recent submissions</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 cursor-pointer" onClick={() => setActiveTab('assessment-settings')}>
                  <div className="text-center">
                    <div className="text-4xl mb-4">⚙️</div>
                    <h3 className="text-xl font-bold text-white mb-2">Settings</h3>
                    <p className="text-gray-300 text-sm">Configure assessment settings</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

          {/* Assessment Create Question Tab */}
        {activeTab === 'assessment-create' && (
          <>
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">
                  📝 Create Question
                </h2>
                <p className="text-gray-400">Create and manage assessment questions</p>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-white">Questions ({assessmentQuestions.length})</h3>
                  <button
                    onClick={() => setShowQuestionForm(!showQuestionForm)}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    {showQuestionForm ? 'Cancel' : '+ Add Question'}
                  </button>
                </div>

                {showQuestionForm && (
                  <div className="bg-gray-700/50 rounded-lg p-6 mb-6">
                    <h4 className="text-lg font-semibold text-white mb-4">
                      {editingQuestion ? 'Edit Question' : 'Create New Question'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white font-medium mb-2">Phase</label>
                        <select
                          value={questionForm.phase}
                          onChange={(e) => setQuestionForm({...questionForm, phase: parseInt(e.target.value)})}
                          className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg text-white"
                        >
                          <option value={1}>Phase 1</option>
                          <option value={2}>Phase 2</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-white font-medium mb-2">Path (Phase 2 only)</label>
                        <select
                          value={questionForm.path}
                          onChange={(e) => setQuestionForm({...questionForm, path: e.target.value})}
                          className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg text-white"
                          disabled={questionForm.phase === 1}
                        >
                          <option value="">Select Path</option>
                          <option value="health">Health Science</option>
                          <option value="creative">Creative & Design</option>
                          <option value="gamedev">Game Development</option>
                          <option value="engineering">Engineering & AI</option>
                          <option value="business">Business & Startup</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-white font-medium mb-2">Question Text</label>
                      <textarea
                        value={questionForm.questionText}
                        onChange={(e) => setQuestionForm({...questionForm, questionText: e.target.value})}
                        className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg text-white"
                        rows={4}
                        placeholder="Enter your question here..."
                      />
                    </div>
                    <div className="mt-4">
                      <label className="flex items-center text-white">
                        <input
                          type="checkbox"
                          checked={questionForm.requiresImageUpload}
                          onChange={(e) => setQuestionForm({...questionForm, requiresImageUpload: e.target.checked})}
                          className="mr-2"
                        />
                        Requires Image Upload
                      </label>
                    </div>
                    
                    {/* Question Images Upload */}
                    <div className="mt-4">
                      <label className="block text-white font-medium mb-2">Question Images (Optional)</label>
                      <div className="space-y-2">
                        {/* Images Preview */}
                        {questionForm.questionImages.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                            {questionForm.questionImages.map((imageUrl, index) => (
                              <div key={index} className="relative">
                                <Image 
                                  src={imageUrl} 
                                  alt={`Question image ${index + 1}`}
                                  width={100}
                                  height={100}
                                  className="w-full h-20 object-cover rounded border border-gray-500"
                                />
                                <button
                                  onClick={() => setFullscreenImage(imageUrl)}
                                  className="absolute top-1 right-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold opacity-80 hover:opacity-100 transition-opacity"
                                  title="View full screen"
                                >
                                  ⛶
                                </button>
                                <button
                                  onClick={() => {
                                    const newImages = questionForm.questionImages.filter((_, i) => i !== index);
                                    setQuestionForm({...questionForm, questionImages: newImages});
                                  }}
                                  className="absolute top-1 left-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold opacity-80 hover:opacity-100 transition-opacity"
                                  title="Remove image"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Upload Button */}
                        <div className="flex items-center space-x-2">
                          <label className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-4 py-2 rounded-lg transition-all duration-300 cursor-pointer text-sm">
                            {uploadingImage ? '⏳ Uploading...' : '📁 Upload Images'}
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                files.forEach(file => {
                                  uploadQuestionImage(file);
                                });
                              }}
                              className="hidden"
                            />
                          </label>
                          
                          <span className="text-gray-400 text-sm">or</span>
                          
                          <input
                            type="text"
                            placeholder="Enter image URL and press Enter"
                            className="flex-1 bg-gray-800/50 border border-orange-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400 text-sm"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                const input = e.target as HTMLInputElement;
                                const url = input.value.trim();
                                if (url && !questionForm.questionImages.includes(url)) {
                                  setQuestionForm({
                                    ...questionForm, 
                                    questionImages: [...questionForm.questionImages, url]
                                  });
                                  input.value = '';
                                }
                              }
                            }}
                          />
                        </div>
                        <p className="text-gray-400 text-xs">You can upload multiple images or add URLs one by one</p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <h5 className="text-white font-medium mb-3">This Question Awards Points In</h5>
                      <p className="text-gray-400 text-sm mb-4">Select which categories this question contributes to (1-3 categories recommended)</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(questionForm.awardsCategories).map(([key, isAwarded]) => (
                          <div key={key} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`award-${key}`}
                              checked={isAwarded}
                              onChange={(e) => {
                                const newAwardsCategories = {...questionForm.awardsCategories, [key]: e.target.checked};
                                // If unchecking, reset the score to 0
                                const newSkillCategories = {...questionForm.skillCategories};
                                if (!e.target.checked) {
                                  newSkillCategories[key as keyof typeof questionForm.skillCategories] = 0;
                                }
                                setQuestionForm({
                                  ...questionForm,
                                  awardsCategories: newAwardsCategories,
                                  skillCategories: newSkillCategories
                                });
                              }}
                              className="w-4 h-4 text-orange-600 bg-gray-600 border-gray-500 rounded focus:ring-orange-500"
                            />
                            <label htmlFor={`award-${key}`} className="text-gray-300 text-sm capitalize cursor-pointer">
                              {key.replace(/([A-Z])/g, ' $1')}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Points input for selected categories */}
                    <div className="mt-6">
                      <h5 className="text-white font-medium mb-3">Points for Selected Categories (0-10 points each)</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(questionForm.awardsCategories).map(([key, isAwarded]) => (
                          <div key={key}>
                            <label className="block text-gray-300 text-sm mb-1 capitalize">
                              {key.replace(/([A-Z])/g, ' $1')} {isAwarded ? '' : '(disabled)'}
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={questionForm.skillCategories[key as keyof typeof questionForm.skillCategories]}
                              onChange={(e) => setQuestionForm({
                                ...questionForm,
                                skillCategories: {...questionForm.skillCategories, [key]: parseInt(e.target.value) || 0}
                              })}
                              disabled={!isAwarded}
                              className={`w-full p-2 border rounded text-white ${
                                isAwarded 
                                  ? 'bg-gray-600 border-gray-500 focus:border-orange-500' 
                                  : 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 p-3 bg-blue-600/20 rounded-lg">
                        <p className="text-blue-300 text-sm">
                          Total points for this question: <span className="font-semibold text-white">
                            {Object.entries(questionForm.awardsCategories)
                              .filter(([_, isAwarded]) => isAwarded)
                              .reduce((total, [key, _]) => total + (questionForm.skillCategories[key as keyof typeof questionForm.skillCategories] || 0), 0)
                            } points
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <h5 className="text-white font-medium mb-3">Time Settings</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-white font-medium mb-2">Time Limit (minutes)</label>
                          <input
                            type="number"
                            value={questionForm.timeLimitMinutes || ''}
                            onChange={(e) => setQuestionForm({...questionForm, timeLimitMinutes: e.target.value ? parseInt(e.target.value) : null})}
                            className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none"
                            min="1"
                            max="120"
                            placeholder="No time limit"
                          />
                          <p className="text-gray-400 text-xs mt-1">Leave empty for no time limit (1-120 minutes)</p>
                        </div>
                        <div>
                          <label className="block text-white font-medium mb-2">Order</label>
                          <input
                            type="number"
                            value={questionForm.order}
                            onChange={(e) => setQuestionForm({...questionForm, order: parseInt(e.target.value) || 1})}
                            className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none"
                            min="1"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-4">
                      <button
                        onClick={async () => {
                          try {
                            const url = '/api/assessment/questions';
                            const method = editingQuestion ? 'PUT' : 'POST';
                            
                            // Clean up the form data before sending
                            let cleanFormData: any = { ...questionForm };
                            
                            // Remove path field if it's empty (for Phase 1 questions)
                            if (!cleanFormData.path || cleanFormData.path.trim() === '') {
                              const { path, ...formDataWithoutPath } = cleanFormData;
                              cleanFormData = formDataWithoutPath;
                            }
                            
                            const requestBody = editingQuestion 
                              ? { ...cleanFormData, id: editingQuestion._id || editingQuestion.id }
                              : cleanFormData;
                            
                            const response = await fetch(url, {
                              method,
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(requestBody)
                            });
                            
                            if (response.ok) {
                              setMessage(editingQuestion ? 'Question updated successfully!' : 'Question created successfully!');
                              setShowQuestionForm(false);
                              setEditingQuestion(null);
                              setQuestionForm({
                                phase: 1,
                                path: '',
                                questionText: '',
                                questionImage: '',
                                questionImages: [],
                                requiresImageUpload: false,
                                timeLimitMinutes: null,
                                skillCategories: {
                                  selfLearning: 0,
                                  creative: 0,
                                  algorithm: 0,
                                  logic: 0,
                                  communication: 0,
                                  presentation: 0,
                                  leadership: 0,
                                  careerKnowledge: 0
                                },
                                awardsCategories: {
                                  selfLearning: false,
                                  creative: false,
                                  algorithm: false,
                                  logic: false,
                                  communication: false,
                                  presentation: false,
                                  leadership: false,
                                  careerKnowledge: false
                                },
                                order: 1
                              });
                              loadAssessmentQuestions();
                            } else {
                              const errorData = await response.json();
                              setMessage(`Error: ${errorData.error}`);
                            }
                          } catch (error) {
                            setMessage(editingQuestion ? 'Error updating question' : 'Error creating question');
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
                      >
                        {editingQuestion ? 'Update Question' : 'Create Question'}
                      </button>
                      <button
                        onClick={() => {
                          setShowQuestionForm(false);
                          setEditingQuestion(null);
                        }}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {assessmentQuestions.map((question) => (
                    <div key={question._id || question.id} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-orange-600 text-white px-2 py-1 rounded text-sm">
                              Phase {question.phase}
                            </span>
                            {question.path && (
                              <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm capitalize">
                                {question.path}
                              </span>
                            )}
                            <span className="bg-gray-600 text-white px-2 py-1 rounded text-sm">
                              Order: {question.order}
                            </span>
                          </div>
                          <p className="text-white mb-2">{question.questionText}</p>
                          
                          {/* Question Images Display */}
                          {(question.questionImages && question.questionImages.length > 0) && (
                            <div className="mb-3">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {question.questionImages.map((imageUrl: string, index: number) => (
                                  <div key={index} className="relative">
                                    <Image 
                                      src={imageUrl} 
                                      alt={`Question image ${index + 1}`} 
                                      width={100}
                                      height={96}
                                      className="w-full h-24 object-cover rounded border border-gray-500"
                                    />
                                    <button
                                      onClick={() => setFullscreenImage(imageUrl)}
                                      className="absolute top-1 right-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold opacity-80 hover:opacity-100 transition-opacity"
                                      title="View full screen"
                                    >
                                      ⛶
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Backward compatibility: Show single questionImage if no questionImages */}
                          {(!question.questionImages || question.questionImages.length === 0) && question.questionImage && (
                            <div className="mb-3">
                              <div className="relative inline-block">
                                <Image 
                                  src={question.questionImage} 
                                  alt="Question image" 
                                  width={200}
                                  height={200}
                                  className="max-w-xs rounded border border-gray-500"
                                />
                                <button
                                  onClick={() => setFullscreenImage(question.questionImage)}
                                  className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold opacity-80 hover:opacity-100 transition-opacity"
                                  title="View full screen"
                                >
                                  ⛶
                                </button>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex flex-wrap gap-2">
                            {question.awardsCategories ? 
                              Object.entries(question.awardsCategories).map(([key, isAwarded]) => 
                                isAwarded ? (
                                  <span key={key} className="bg-orange-600 text-white px-2 py-1 rounded text-xs">
                                    {key.replace(/([A-Z])/g, ' $1')}: {question.skillCategories[key as keyof typeof question.skillCategories] || 0}
                                  </span>
                                ) : null
                              ) :
                              Object.entries(question.skillCategories).map(([key, value]) => 
                                (value as number) > 0 ? (
                                  <span key={key} className="bg-gray-600 text-gray-300 px-2 py-1 rounded text-xs">
                                    {key.replace(/([A-Z])/g, ' $1')}: {value as number}
                                  </span>
                                ) : null
                              )
                            }
                            <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
                              Total: {question.awardsCategories ? 
                                Object.entries(question.awardsCategories)
                                  .filter(([_, isAwarded]) => isAwarded)
                                  .reduce((total: number, [key, _]) => total + (question.skillCategories[key as keyof typeof question.skillCategories] || 0), 0)
                                : Object.values(question.skillCategories).reduce((total: number, value) => total + (value as number), 0)
                              } points
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingQuestion(question);
                              setQuestionForm({
                                phase: question.phase,
                                path: question.path || '',
                                questionText: question.questionText,
                                questionImage: question.questionImage || '',
                                questionImages: question.questionImages || [],
                                requiresImageUpload: question.requiresImageUpload,
                                timeLimitMinutes: question.timeLimitMinutes || null,
                                skillCategories: question.skillCategories,
                                awardsCategories: question.awardsCategories || {
                                  selfLearning: false,
                                  creative: false,
                                  algorithm: false,
                                  logic: false,
                                  communication: false,
                                  presentation: false,
                                  leadership: false,
                                  careerKnowledge: false
                                },
                                order: question.order
                              });
                              setShowQuestionForm(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/assessment/questions?id=${question._id || question.id}`, {
                                  method: 'DELETE'
                                });
                                if (response.ok) {
                                  setMessage('Question deleted successfully!');
                                  loadAssessmentQuestions();
                                } else {
                                  const errorData = await response.json();
                                  setMessage(`Error: ${errorData.error}`);
                                }
                              } catch (error) {
                                setMessage('Error deleting question');
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Assessment Users Tab */}
        {activeTab === 'assessment-users' && (
          <>
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">
                  👥 Assessment Users
                </h2>
                <p className="text-gray-400">View user progress, scores, and detailed answers</p>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                <div className="space-y-4">
                  {assessmentUsers.map((user) => (
                    <div key={user.id} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {(assessmentNicknames[user.userId] || user.userId).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">
                              {assessmentNicknames[user.userId] || `User ${user.userId.slice(-4)}`}
                            </h3>
                            <p className="text-gray-400 text-sm">ID: {user.userId}</p>
                            <div className="flex gap-4 mt-1">
                              <span className={`px-2 py-1 rounded text-xs ${
                                user.phase1Completed ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                              }`}>
                                Phase 1: {user.phase1Completed ? 'Completed' : 'In Progress'}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                user.phase2Completed ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                              }`}>
                                Phase 2: {user.phase2Completed ? 'Completed' : 'Not Started'}
                              </span>
                              {user.selectedPath && (
                                <span className="px-2 py-1 rounded text-xs bg-blue-600 text-white capitalize">
                                  Path: {user.selectedPath}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedAssessmentUser(selectedAssessmentUser?.id === user.id ? null : user)}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            {selectedAssessmentUser?.id === user.id ? 'Hide Details' : 'View Details'}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ALL assessment data for ${assessmentNicknames[user.userId] || `User ${user.userId.slice(-4)}`}? This will completely reset them as if they never took the assessment.`)) {
                                handleDeleteUser(user.userId);
                              }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            🗑️ Delete All User
                          </button>
                        </div>
                      </div>
                      
                      {selectedAssessmentUser?.id === user.id && (
                        <div className="mt-4 pt-4 border-t border-gray-600">
                          <h4 className="text-white font-semibold mb-3">User Scores</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            {Object.entries(user.totalScore || {}).map(([key, value]) => (
                              <div key={key} className="bg-gray-600 rounded p-2">
                                <div className="text-gray-300 text-sm capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                                <div className="text-white font-semibold">{(value as number)?.toFixed(1) || '0.0'}</div>
                              </div>
                            ))}
                          </div>
                          
                          <h4 className="text-white font-semibold mb-3">All Questions & Answers ({user.allAnswers?.length || 0})</h4>
                          <div className="space-y-4">
                            {user.allAnswers && user.allAnswers.length > 0 ? (
                              user.allAnswers.map((answer: any) => (
                                <div key={answer.id} className="bg-gray-600 rounded p-4">
                                  <div className="flex justify-between items-start mb-3">
                                    <div>
                                      <span className="text-orange-400 text-sm font-semibold">
                                        Phase {answer.questionPhase} Question
                                      </span>
                                      <span className="text-gray-300 text-sm ml-2">
                                        {new Date(answer.submittedAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      answer.status === 'approved' ? 'bg-green-600 text-white' : 
                                      answer.status === 'declined' ? 'bg-red-600 text-white' : 
                                      'bg-yellow-600 text-white'
                                    }`}>
                                      {answer.status === 'approved' ? 'Approved' : 
                                       answer.status === 'declined' ? 'Declined' : 
                                       'Pending'}
                                    </span>
                                  </div>
                                  
                                  <div className="mb-3">
                                    <h5 className="text-white font-semibold mb-2">Question:</h5>
                                    <p className="text-gray-300 text-sm bg-gray-700 p-2 rounded">
                                      {answer.questionText}
                                    </p>
                                    
                                    {/* Question Images Display */}
                                    {answer.questionImages && answer.questionImages.length > 0 && (
                                      <div className="mt-2">
                                        <div className="text-gray-400 text-xs mb-2">
                                          Question Images ({answer.questionImages.length}):
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                          {answer.questionImages.map((imageUrl: string, index: number) => (
                                            <div key={index} className="relative">
                                              <Image 
                                                src={imageUrl} 
                                                alt={`Question image ${index + 1}`} 
                                                width={100}
                                                height={80}
                                                className="w-full h-20 object-cover rounded border border-gray-500"
                                                onError={(e) => {
                                                  console.error('Failed to load question image:', imageUrl);
                                                  (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                              />
                                              <button
                                                onClick={() => setFullscreenImage(imageUrl)}
                                                className="absolute top-1 right-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold opacity-80 hover:opacity-100 transition-opacity"
                                                title="View full screen"
                                              >
                                                ⛶
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Backward compatibility: Show single questionImage if no questionImages */}
                                    {(!answer.questionImages || answer.questionImages.length === 0) && answer.questionImage && (
                                      <div className="mt-2">
                                        <div className="text-gray-400 text-xs mb-2">
                                          Question Image:
                                        </div>
                                        <div className="relative inline-block">
                                          <Image 
                                            src={answer.questionImage} 
                                            alt="Question image" 
                                            width={200}
                                            height={200}
                                            className="max-w-xs rounded border border-gray-500"
                                            onError={(e) => {
                                              console.error('Failed to load question image:', answer.questionImage);
                                              (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                          />
                                          <button
                                            onClick={() => setFullscreenImage(answer.questionImage)}
                                            className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold opacity-80 hover:opacity-100 transition-opacity"
                                            title="View full screen"
                                          >
                                            ⛶
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Answer timing info */}
                                    <div className="mt-2 text-xs text-gray-400">
                                      ⏱️ Submitted on: {new Date(answer.submittedAt).toLocaleString()}
                                      {answer.timeStartedAt && (
                                        <>
                                          <br />
                                          🕐 Time taken: {(() => {
                                            const totalSeconds = Math.round((new Date(answer.submittedAt).getTime() - new Date(answer.timeStartedAt).getTime()) / 1000);
                                            const minutes = Math.floor(totalSeconds / 60);
                                            const seconds = totalSeconds % 60;
                                            return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                                          })()}
                                        </>
                                      )}
                                      {answer.timeSpentSeconds && (
                                        <>
                                          <br />
                                          ⏰ Time spent: {(() => {
                                            const totalSeconds = Math.round(answer.timeSpentSeconds);
                                            const minutes = Math.floor(totalSeconds / 60);
                                            const seconds = totalSeconds % 60;
                                            return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                                          })()}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="mb-3">
                                    <h5 className="text-white font-semibold mb-2">Answer:</h5>
                                    <p className="text-white text-sm bg-gray-700 p-2 rounded">
                                      {answer.answerText}
                                    </p>
                                  </div>
                                  
                                  {/* Time Tracking Display */}
                                  {(answer.timeSpentSeconds || answer.timeStartedAt) && (
                                    <div className="mb-3">
                                      <h5 className="text-white font-semibold mb-2">Time Tracking:</h5>
                                      <div className="bg-gray-700 rounded p-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                          {answer.timeSpentSeconds && (
                                            <div>
                                              <span className="text-gray-400">Time Spent:</span>
                                              <span className="text-orange-400 font-semibold ml-2">
                                                {(() => {
                                                  const totalSeconds = Math.round(answer.timeSpentSeconds);
                                                  const minutes = Math.floor(totalSeconds / 60);
                                                  const seconds = totalSeconds % 60;
                                                  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                                                })()}
                                              </span>
                                            </div>
                                          )}
                                          {answer.timeStartedAt && (
                                            <div>
                                              <span className="text-gray-400">Started At:</span>
                                              <span className="text-blue-400 font-semibold ml-2">
                                                {new Date(answer.timeStartedAt).toLocaleString()}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {answer.answerImage && (
                                    <div className="mb-3">
                                      <h5 className="text-white font-semibold mb-2">Image:</h5>
                                      <div className="relative inline-block">
                                        <img 
                                          src={answer.answerImage} 
                                          alt="Answer image" 
                                          className="max-w-xs rounded border border-gray-500"
                                        />
                                        <button
                                          onClick={() => setFullscreenImage(answer.answerImage)}
                                          className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold opacity-80 hover:opacity-100 transition-opacity"
                                          title="View full screen"
                                        >
                                          ⛶
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="mb-3">
                                    <h5 className="text-white font-semibold mb-2">Skill Scores:</h5>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                      {['selfLearning', 'creative', 'algorithm', 'logic', 'communication', 'presentation', 'leadership', 'careerKnowledge'].map((skill) => (
                                        <div key={skill} className="bg-gray-700 rounded p-2">
                                          <div className="text-gray-300 text-xs capitalize mb-1">{skill.replace(/([A-Z])/g, ' $1')}</div>
                                          <input
                                            type="number"
                                            step="0.1"
                                            className="w-full px-2 py-1 bg-gray-600 text-orange-400 font-semibold text-sm rounded border border-gray-500 focus:border-orange-500 focus:outline-none"
                                            defaultValue={answer.skillScores?.[skill] || 0}
                                            id={`${skill}-${answer.id}`}
                                            onChange={() => handleAutoSaveSkillScores(answer.id)}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                    <div className="mt-3 text-gray-400 text-xs">
                                      💾 Auto-saves when you change values
                                    </div>
                                  </div>
                                  
                                  {answer.reviewedAt && (
                                    <div className="text-gray-400 text-xs">
                                      Reviewed by {answer.reviewedBy} on {new Date(answer.reviewedAt).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="text-gray-400 text-center py-4">
                                No answers submitted yet
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Assessment Recent Submissions Tab */}
        {activeTab === 'assessment-recent' && (
          <>
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">
                  📋 Recent Submissions
                </h2>
                <p className="text-gray-400">View recent user submissions and review answers</p>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                <div className="space-y-4">
                  {assessmentAnswers
                    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                    .slice(0, 20)
                    .map((answer) => (
                      <div key={answer.id} className="bg-gray-700/50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {(assessmentNicknames[answer.userId] || answer.userId).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="text-white font-semibold">
                                {assessmentNicknames[answer.userId] || `User ${answer.userId.slice(-4)}`}
                              </h3>
                              <p className="text-gray-400 text-sm">
                                {new Date(answer.submittedAt).toLocaleString()}
                              </p>
                              <p className="text-orange-400 text-sm mt-1 font-medium">
                                Phase {answer.questionPhase} Question
                              </p>
                              {answer.timeSpentSeconds && (
                                <p className="text-gray-500 text-xs mt-1">
                                  ⏰ Time: {(() => {
                                    const totalSeconds = Math.round(answer.timeSpentSeconds);
                                    const minutes = Math.floor(totalSeconds / 60);
                                    const seconds = totalSeconds % 60;
                                    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                                  })()}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              answer.status === 'approved' ? 'bg-green-600 text-white' : 
                              answer.status === 'declined' ? 'bg-red-600 text-white' : 
                              'bg-yellow-600 text-white'
                            }`}>
                              {answer.status === 'approved' ? 'Approved' : 
                               answer.status === 'declined' ? 'Declined' : 
                               'Pending'}
                            </span>
                            {answer.adminScore && (
                              <span className="bg-orange-600 text-white px-2 py-1 rounded text-xs">
                                {answer.adminScore}/10
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Question Section */}
                        <div className="mt-4 p-3 bg-gray-600/30 rounded-lg">
                          <h5 className="text-white font-semibold mb-2">📝 Question:</h5>
                          <p className="text-gray-300 text-sm mb-3">
                            {answer.questionText || 'Question text not available'}
                          </p>
                          {answer.questionImage && (
                            <div className="relative inline-block">
                              <Image 
                                src={answer.questionImage} 
                                alt="Question" 
                                width={200}
                                height={200}
                                className="max-w-xs h-auto rounded-lg border border-gray-500"
                              />
                              <button
                                onClick={() => setFullscreenImage(answer.questionImage)}
                                className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold opacity-80 hover:opacity-100 transition-opacity"
                                title="View full screen"
                              >
                                ⛶
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* Answer Section */}
                        <div className="mt-4 p-3 bg-gray-700/30 rounded-lg">
                          <h5 className="text-white font-semibold mb-2">💡 User Answer:</h5>
                          <p className="text-gray-200 text-sm mb-3">
                            {answer.answerText}
                          </p>
                        </div>
                        
                        {answer.answerImage && (
                          <div className="mt-3">
                            <h6 className="text-white font-medium mb-2">📷 Answer Image:</h6>
                            <div className="relative inline-block">
                              <img 
                                src={answer.answerImage} 
                                alt="Answer" 
                                className="max-w-xs h-auto rounded-lg"
                              />
                              <button
                                onClick={() => setFullscreenImage(answer.answerImage)}
                                className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold opacity-80 hover:opacity-100 transition-opacity"
                                title="View full screen"
                              >
                                ⛶
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Scoring Form */}
                        {answer.status === 'pending' && (
                          <div className="mt-4 p-4 bg-gray-600/30 rounded-lg">
                            <h4 className="text-white font-semibold mb-3">ให้คะแนนทักษะ (0-10 คะแนน)</h4>
                            <p className="text-gray-400 text-sm mb-4">
                              ให้คะแนนเฉพาะหัวข้อที่ข้อนี้เกี่ยวข้องเท่านั้น
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {(() => {
                                // Find the question to get its awardsCategories
                                const question = assessmentQuestions.find(q => q._id === answer.questionId || q.id === answer.questionId);
                                const awardsCategories = question?.awardsCategories;
                                
                                // If question has awardsCategories, only show those categories
                                if (awardsCategories) {
                                  return Object.entries(awardsCategories).map(([key, isAwarded]) => 
                                    isAwarded ? (
                                      <div key={key}>
                                        <label className="text-gray-300 text-sm">
                                          {key.replace(/([A-Z])/g, ' $1')} (max: {question.skillCategories[key as keyof typeof question.skillCategories] || 0})
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          max={question.skillCategories[key as keyof typeof question.skillCategories] || 0}
                                          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-orange-500 focus:outline-none"
                                          placeholder="0"
                                          id={`${key}-${answer._id || answer.id}`}
                                        />
                                      </div>
                                    ) : null
                                  ).filter(Boolean);
                                } else {
                                  // Fallback to old system for backward compatibility
                                  const skills = ['selfLearning', 'creative', 'algorithm', 'logic', 'communication', 'presentation', 'leadership', 'careerKnowledge'];
                                  return skills.map(skill => (
                                    <div key={skill}>
                                      <label className="text-gray-300 text-sm">{skill.replace(/([A-Z])/g, ' $1')}</label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-orange-500 focus:outline-none"
                                        placeholder="0"
                                        id={`${skill}-${answer._id || answer.id}`}
                                      />
                                    </div>
                                  ));
                                }
                              })()}
                            </div>
                            <div className="mt-4">
                              <label className="text-gray-300 text-sm">ความคิดเห็น (ไม่บังคับ)</label>
                              <textarea
                                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-orange-500 focus:outline-none"
                                rows={2}
                                placeholder="ให้ความคิดเห็นเพิ่มเติม..."
                                id={`feedback-${answer._id || answer.id}`}
                              />
                            </div>
                            <div className="mt-4 flex gap-2">
                              <div className="flex gap-3">
                                <button
                                  onClick={async () => {
                                    try {
                                      const skillScores = {
                                        selfLearning: parseInt((document.getElementById(`selfLearning-${answer._id || answer.id}`) as HTMLInputElement)?.value || '0'),
                                        creative: parseInt((document.getElementById(`creative-${answer._id || answer.id}`) as HTMLInputElement)?.value || '0'),
                                        algorithm: parseInt((document.getElementById(`algorithm-${answer._id || answer.id}`) as HTMLInputElement)?.value || '0'),
                                        logic: parseInt((document.getElementById(`logic-${answer._id || answer.id}`) as HTMLInputElement)?.value || '0'),
                                        communication: parseInt((document.getElementById(`communication-${answer._id || answer.id}`) as HTMLInputElement)?.value || '0'),
                                        presentation: parseInt((document.getElementById(`presentation-${answer._id || answer.id}`) as HTMLInputElement)?.value || '0'),
                                        leadership: parseInt((document.getElementById(`leadership-${answer._id || answer.id}`) as HTMLInputElement)?.value || '0'),
                                        careerKnowledge: parseInt((document.getElementById(`careerKnowledge-${answer._id || answer.id}`) as HTMLInputElement)?.value || '0')
                                      };
                                      
                                      const adminFeedback = (document.getElementById(`feedback-${answer._id || answer.id}`) as HTMLTextAreaElement)?.value || '';
                                      
                                      const response = await fetch('/api/assessment/answers', {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          answerId: answer._id || answer.id,
                                          skillScores,
                                          adminFeedback
                                        })
                                      });
                                      
                                      if (response.ok) {
                                        setMessage('คะแนนถูกบันทึกเรียบร้อยแล้ว!');
                                        loadAssessmentAnswers();
                                      } else {
                                        const errorData = await response.json();
                                        setMessage(`Error: ${errorData.error}`);
                                      }
                                    } catch (error) {
                                      setMessage('เกิดข้อผิดพลาดในการบันทึกคะแนน');
                                    }
                                  }}
                                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                  บันทึกคะแนน
                                </button>
                                
                                <button
                                  onClick={async () => {
                                    if (!confirm('คุณแน่ใจหรือไม่ที่จะปฏิเสธคำตอบนี้? ผู้ใช้จะต้องทำคำถามนี้ใหม่')) {
                                      return;
                                    }
                                    
                                    try {
                                      const adminFeedback = (document.getElementById(`feedback-${answer._id || answer.id}`) as HTMLTextAreaElement)?.value || 'คำตอบไม่ผ่านการประเมิน กรุณาทำใหม่';
                                      
                                      const response = await fetch('/api/assessment/answers', {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          answerId: answer._id || answer.id,
                                          status: 'declined',
                                          adminFeedback
                                        })
                                      });
                                      
                                      if (response.ok) {
                                        setMessage('คำตอบถูกปฏิเสธเรียบร้อยแล้ว!');
                                        loadAssessmentAnswers();
                                      } else {
                                        const errorData = await response.json();
                                        setMessage(`Error: ${errorData.error}`);
                                      }
                                    } catch (error) {
                                      setMessage('เกิดข้อผิดพลาดในการปฏิเสธคำตอบ');
                                    }
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                  ปฏิเสธคำตอบ
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Show existing scores if approved */}
                        {answer.status === 'approved' && answer.skillScores && (
                          <div className="mt-4 p-4 bg-green-600/20 rounded-lg">
                            <h4 className="text-white font-semibold mb-2">คะแนนที่ให้แล้ว:</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                              {answer.skillScores.selfLearning && (
                                <div className="text-gray-300">Self Learning: <span className="text-orange-400 font-semibold">{answer.skillScores.selfLearning}/10</span></div>
                              )}
                              {answer.skillScores.creative && (
                                <div className="text-gray-300">Creative: <span className="text-orange-400 font-semibold">{answer.skillScores.creative}/10</span></div>
                              )}
                              {answer.skillScores.algorithm && (
                                <div className="text-gray-300">Algorithm: <span className="text-orange-400 font-semibold">{answer.skillScores.algorithm}/10</span></div>
                              )}
                              {answer.skillScores.logic && (
                                <div className="text-gray-300">Logic: <span className="text-orange-400 font-semibold">{answer.skillScores.logic}/10</span></div>
                              )}
                              {answer.skillScores.communication && (
                                <div className="text-gray-300">Communication: <span className="text-orange-400 font-semibold">{answer.skillScores.communication}/10</span></div>
                              )}
                              {answer.skillScores.presentation && (
                                <div className="text-gray-300">Presentation: <span className="text-orange-400 font-semibold">{answer.skillScores.presentation}/10</span></div>
                              )}
                              {answer.skillScores.leadership && (
                                <div className="text-gray-300">Leadership: <span className="text-orange-400 font-semibold">{answer.skillScores.leadership}/10</span></div>
                              )}
                              {answer.skillScores.careerKnowledge && (
                                <div className="text-gray-300">Career Knowledge: <span className="text-orange-400 font-semibold">{answer.skillScores.careerKnowledge}/10</span></div>
                              )}
                            </div>
                            {answer.adminFeedback && (
                              <div className="mt-2 text-gray-300 text-sm">
                                <strong>ความคิดเห็น:</strong> {answer.adminFeedback}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Show declined feedback */}
                        {answer.status === 'declined' && (
                          <div className="mt-4 p-4 bg-red-600/20 rounded-lg">
                            <h4 className="text-white font-semibold mb-2">คำตอบถูกปฏิเสธ</h4>
                            {answer.adminFeedback && (
                              <div className="p-3 bg-gray-600/30 rounded">
                                <h5 className="text-white font-semibold mb-1">เหตุผล:</h5>
                                <p className="text-gray-300 text-sm">{answer.adminFeedback}</p>
                              </div>
                            )}
                            <p className="text-gray-400 text-sm mt-2">ผู้ใช้จะต้องทำคำถามนี้ใหม่</p>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Assessment Settings Tab */}
        {activeTab === 'assessment-settings' && (
          <>
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent mb-2">
                  ⚙️ Assessment Settings
                </h2>
                <p className="text-gray-400">Configure system settings and behavior</p>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                {assessmentSettings && (
                  <div className="space-y-6">
                    <div>
                      <label className="flex items-center text-white">
                        <input
                          type="checkbox"
                          checked={assessmentSettings.phase2Open}
                          onChange={async (e) => {
                            try {
                              const response = await fetch('/api/assessment/settings', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ phase2Open: e.target.checked })
                              });
                              if (response.ok) {
                                setMessage('Settings updated successfully!');
                                loadAssessmentSettings();
                              } else {
                                const errorData = await response.json();
                                setMessage(`Error: ${errorData.error}`);
                              }
                            } catch (error) {
                              setMessage('Error updating settings');
                            }
                          }}
                          className="mr-3"
                        />
                        Phase 2 Open
                      </label>
                      <p className="text-gray-400 text-sm mt-1">Allow users to proceed to Phase 2</p>
                    </div>

                    <div>
                      <label className="flex items-center text-white">
                        <input
                          type="checkbox"
                          checked={assessmentSettings.allowFriendAnswers}
                          onChange={async (e) => {
                            try {
                              const response = await fetch('/api/assessment/settings', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ allowFriendAnswers: e.target.checked })
                              });
                              if (response.ok) {
                                setMessage('Settings updated successfully!');
                                loadAssessmentSettings();
                              } else {
                                const errorData = await response.json();
                                setMessage(`Error: ${errorData.error}`);
                              }
                            } catch (error) {
                              setMessage('Error updating settings');
                            }
                          }}
                          className="mr-3"
                        />
                        Allow Friend Answers
                      </label>
                      <p className="text-gray-400 text-sm mt-1">Show friend answers after completing Phase 1</p>
                    </div>

                    <div>
                      <label className="block text-white font-medium mb-2">Max Image Size (MB)</label>
                      <input
                        type="number"
                        value={assessmentSettings.maxImageSize / (1024 * 1024)}
                        onChange={async (e) => {
                          try {
                            const response = await fetch('/api/assessment/settings', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ maxImageSize: parseInt(e.target.value) * 1024 * 1024 })
                            });
                            if (response.ok) {
                              setMessage('Settings updated successfully!');
                              loadAssessmentSettings();
                            } else {
                              const errorData = await response.json();
                              setMessage(`Error: ${errorData.error}`);
                            }
                          } catch (error) {
                            setMessage('Error updating settings');
                          }
                        }}
                        className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg text-white"
                        min="1"
                        max="50"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Admin Management Tab */}
        {activeTab === 'admin-management' && (
          <Suspense fallback={<div className="text-center p-8">Loading Admin Management...</div>}>
            <AdminManagement />
          </Suspense>
        )}

        {/* Lobby Management Tab */}
        {activeTab === 'lobby-management' && (
          <Suspense fallback={<div className="text-center p-8">Loading Lobby Management...</div>}>
            <LobbyManagement />
          </Suspense>
        )}

        {/* Class Management Tab */}
        {activeTab === 'class-management' && (
          <Suspense fallback={<div className="text-center p-8">Loading Class Management...</div>}>
            <ClassManagementDashboard />
          </Suspense>
        )}
      </div>

      {/* Full-screen Image Modal */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold z-10"
            >
              ×
            </button>
            <Image
              src={fullscreenImage}
              alt="Full screen view"
              width={800}
              height={600}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
