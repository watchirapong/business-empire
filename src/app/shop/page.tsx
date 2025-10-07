'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { isAdmin } from '@/lib/admin-config';
import SkillTree from '@/components/SkillTree';
import { SkillTreeNode } from '@/types/skillTree';

// Shop item interface
interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  inStock: boolean;
  category: string;
  contentType: 'none' | 'text' | 'link' | 'file' | 'youtube';
  textContent?: string;
  linkUrl?: string;
  fileUrl?: string;
  fileName?: string;
  youtubeUrl?: string;
  allowMultiplePurchases: boolean;
  requiresRole: boolean;
  requiredRoleId?: string;
  requiredRoleName?: string;
  hasFile: boolean;
  purchaseCount: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;
}

export default function ShopPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedNode, setSelectedNode] = useState<SkillTreeNode | null>(null);
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'skill-tree' | 'branches'>('skill-tree');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: 0,
    image: '/api/uploads/default-item.png', // Default image
    category: 'cosmetic',
    contentType: 'none' as 'none' | 'text' | 'link' | 'file' | 'youtube',
    allowMultiplePurchases: true,
    requiresRole: false,
    requiredRoleId: '',
    requiredRoleName: '',
    textContent: '',
    linkUrl: '',
    youtubeUrl: ''
  });
  const [newBranch, setNewBranch] = useState({
    id: '',
    name: '',
    description: '',
    icon: '🌳',
    color: '#FF6B6B',
    unlockCost: 0
  });

  useEffect(() => {
    if (session) {
      fetchBranches();
    }
  }, [session]);


  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/skill-tree/branches');
      if (response.ok) {
        const data = await response.json();
        setBranches(data.branches || []);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/shop/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newItem),
      });

      if (response.ok) {
        setShowCreateForm(false);
        setNewItem({
          name: '',
          description: '',
          price: 0,
          image: '/api/uploads/default-item.png',
          category: 'cosmetic',
          contentType: 'none',
          allowMultiplePurchases: true,
          requiresRole: false,
          requiredRoleId: '',
          requiredRoleName: '',
          textContent: '',
          linkUrl: '',
          youtubeUrl: ''
        });
      }
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/skill-tree/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBranch),
      });

      if (response.ok) {
        setShowBranchForm(false);
        setNewBranch({
          id: '',
          name: '',
          description: '',
          icon: '🌳',
          color: '#FF6B6B',
          unlockCost: 0
        });
        fetchBranches();
      }
    } catch (error) {
      console.error('Error creating branch:', error);
    }
  };

  const handleNodeClick = (node: SkillTreeNode) => {
    setSelectedNode(node);
  };

  const handlePurchase = (nodeId: string) => {
    setShowPurchaseSuccess(true);
    setTimeout(() => setShowPurchaseSuccess(false), 3000);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-orange-400 border-t-transparent"></div>
      </div>
    );
  }

  if (!session) {
  return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-3xl font-bold text-white mb-4">Authentication Required</h1>
          <p className="text-gray-400 mb-6">Please log in to access the Shop</p>
          <button
            onClick={() => router.push('/api/auth/signin')}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-lg font-semibold transition-all"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← Back to Home
              </button>
              <h1 className="text-2xl font-bold text-white">🌳 Business Empire Shop</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">
                Welcome, {session.user?.name}
              </div>
            </div>
          </div>
          </div>
          </div>
          
      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-1 bg-gray-800/50 rounded-lg p-1 mb-6">
          <button
            onClick={() => setActiveTab('skill-tree')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'skill-tree'
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            🌳 Shop Item
          </button>
          {isAdmin((session.user as any)?.id || '') && (
            <button
              onClick={() => setActiveTab('branches')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'branches'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              🌿 Manage Branches
            </button>
          )}
        </div>

        {/* Skill Tree Tab */}
        {activeTab === 'skill-tree' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">Shop Item</h2>
              <p className="text-gray-400">Invest in your skills and unlock new abilities</p>
            </div>
            
            {/* Floating Create Item Button for Admins */}
            {isAdmin((session.user as any)?.id || '') && (
              <div className="flex justify-end">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
                >
                  ➕ Create New Item
                </button>
              </div>
            )}
            
            <SkillTree onNodeClick={handleNodeClick} onPurchase={handlePurchase} />
          </div>
        )}



        {/* Manage Branches Tab */}
        {activeTab === 'branches' && isAdmin((session.user as any)?.id || '') && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">Manage Skill Tree Branches</h2>
              <p className="text-gray-400">Create and manage skill tree branches</p>
            </div>

            <div className="flex justify-end mb-6">
              <button
                onClick={() => setShowBranchForm(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                ➕ Create New Branch
              </button>
            </div>

            {/* Existing Branches */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {branches.map((branch) => (
                <div key={branch.id} className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-3xl">{branch.icon}</div>
                    <div className="flex space-x-2">
                      <button className="text-blue-400 hover:text-blue-300">✏️</button>
                      <button className="text-red-400 hover:text-red-300">🗑️</button>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{branch.name}</h3>
                  <p className="text-gray-400 mb-4">{branch.description}</p>
                  <div className="text-sm text-gray-500">
                    <div>ID: {branch.id}</div>
                    <div>Unlock Cost: {branch.unlockCost} 🪙</div>
                    <div>Nodes: {branch.nodes?.length || 0}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Create Branch Form */}
            {showBranchForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-lg p-6 max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-2xl font-bold text-white mb-6">Create New Branch</h3>
                  
                  <form onSubmit={handleCreateBranch} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Branch ID
                        </label>
                        <input
                          type="text"
                          value={newBranch.id}
                          onChange={(e) => setNewBranch({...newBranch, id: e.target.value})}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="e.g., creativity"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Branch Name
                        </label>
                        <input
                          type="text"
                          value={newBranch.name}
                          onChange={(e) => setNewBranch({...newBranch, name: e.target.value})}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="e.g., Creativity Branch"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={newBranch.description}
                        onChange={(e) => setNewBranch({...newBranch, description: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Describe what this branch is about..."
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Icon
                        </label>
                        <input
                          type="text"
                          value={newBranch.icon}
                          onChange={(e) => setNewBranch({...newBranch, icon: e.target.value})}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="🎨"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Color
                        </label>
                        <input
                          type="color"
                          value={newBranch.color}
                          onChange={(e) => setNewBranch({...newBranch, color: e.target.value})}
                          className="w-full h-10 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Unlock Cost
                        </label>
                        <input
                          type="number"
                          value={newBranch.unlockCost}
                          onChange={(e) => setNewBranch({...newBranch, unlockCost: parseInt(e.target.value)})}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          min="0"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-4">
                      <button
                        type="button"
                        onClick={() => setShowBranchForm(false)}
                        className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                      >
                        Create Branch
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Item Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-6">Create New Item</h3>
            
            <form onSubmit={handleCreateItem} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Price (Hamster Coins)
                  </label>
                  <input
                    type="number"
                    value={newItem.price}
                    onChange={(e) => setNewItem({...newItem, price: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="cosmetic">Cosmetic</option>
                    <option value="gaming">Gaming</option>
                    <option value="utility">Utility</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Content Type
                  </label>
                  <select
                    value={newItem.contentType}
                    onChange={(e) => setNewItem({...newItem, contentType: e.target.value as any})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="none">None</option>
                    <option value="text">Text Content</option>
                    <option value="link">Link</option>
                    <option value="youtube">YouTube Video</option>
                    <option value="file">File Download</option>
                  </select>
                </div>
              </div>

              {newItem.contentType === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Text Content
                  </label>
                  <textarea
                    value={newItem.textContent}
                    onChange={(e) => setNewItem({...newItem, textContent: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              )}

              {newItem.contentType === 'link' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Link URL
                  </label>
                  <input
                    type="url"
                    value={newItem.linkUrl}
                    onChange={(e) => setNewItem({...newItem, linkUrl: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              )}

              {newItem.contentType === 'youtube' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    YouTube URL
                  </label>
                  <input
                    type="url"
                    value={newItem.youtubeUrl}
                    onChange={(e) => setNewItem({...newItem, youtubeUrl: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              )}

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newItem.allowMultiplePurchases}
                    onChange={(e) => setNewItem({...newItem, allowMultiplePurchases: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-gray-300">Allow Multiple Purchases</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newItem.requiresRole}
                    onChange={(e) => setNewItem({...newItem, requiresRole: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-gray-300">Requires Role</span>
                </label>
              </div>

              {newItem.requiresRole && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Required Role ID
                    </label>
                    <input
                      type="text"
                      value={newItem.requiredRoleId}
                      onChange={(e) => setNewItem({...newItem, requiredRoleId: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Required Role Name
                    </label>
                    <input
                      type="text"
                      value={newItem.requiredRoleName}
                      onChange={(e) => setNewItem({...newItem, requiredRoleName: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                >
                  Create Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Success Modal */}
      {showPurchaseSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold text-white mb-2">Purchase Successful!</h3>
              <p className="text-gray-400">Your skill has been unlocked!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}