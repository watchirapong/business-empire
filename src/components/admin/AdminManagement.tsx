'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

interface AdminUser {
  _id: string;
  userId: string;
  username: string;
  email: string;
  avatar: string;
  addedBy: string;
  addedAt: string;
  isSuperAdmin?: boolean;
}

interface HardcodedAdmin {
  userId: string;
  username: string;
  email: string;
  avatar: string;
  isSuperAdmin: boolean;
}

export default function AdminManagement() {
  const { data: session } = useSession();
  const [hardcodedAdmins, setHardcodedAdmins] = useState<HardcodedAdmin[]>([]);
  const [dynamicAdmins, setDynamicAdmins] = useState<AdminUser[]>([]);
  const [allAdmins, setAllAdmins] = useState<(AdminUser | HardcodedAdmin)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAdminUserId, setNewAdminUserId] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/admin-management');
      const data = await response.json();
      
      if (response.ok) {
        setHardcodedAdmins(data.hardcodedAdmins || []);
        setDynamicAdmins(data.dynamicAdmins || []);
        setAllAdmins([...data.hardcodedAdmins, ...data.dynamicAdmins]);
      } else {
        setMessage(data.error || 'Failed to load admins');
      }
    } catch (error) {
      console.error('Error loading admins:', error);
      setMessage('Failed to load admins');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminUserId.trim()) {
      setMessage('Please enter a user ID');
      return;
    }

    try {
      setIsAdding(true);
      const response = await fetch('/api/admin/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: newAdminUserId.trim() })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage(data.message || 'Admin added successfully');
        setNewAdminUserId('');
        setShowAddForm(false);
        loadAdmins(); // Reload the list
      } else {
        setMessage(data.error || 'Failed to add admin');
      }
    } catch (error) {
      console.error('Error adding admin:', error);
      setMessage('Failed to add admin');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveAdmin = async (userId: string, isHardcoded: boolean) => {
    if (isHardcoded) {
      setMessage('Cannot remove hardcoded admins. Contact system administrator.');
      return;
    }

    if (!confirm('Are you sure you want to remove this admin?')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/admin-users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage(data.message || 'Admin removed successfully');
        loadAdmins(); // Reload the list
      } else {
        setMessage(data.error || 'Failed to remove admin');
      }
    } catch (error) {
      console.error('Error removing admin:', error);
      setMessage('Failed to remove admin');
    }
  };

  const filteredAdmins = allAdmins.filter(admin => 
    admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.userId.includes(searchTerm) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-2 text-white">Loading admins...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Admin Management</h2>
          <p className="text-gray-300">Manage system administrators and their permissions</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          + Add New Admin
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('success') || message.includes('added') || message.includes('removed') 
            ? 'bg-green-500/20 border border-green-500/30 text-green-300' 
            : 'bg-red-500/20 border border-red-500/30 text-red-300'
        }`}>
          {message}
        </div>
      )}

      {/* Add Admin Form */}
      {showAddForm && (
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Add New Admin</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">User ID</label>
              <input
                type="text"
                value={newAdminUserId}
                onChange={(e) => setNewAdminUserId(e.target.value)}
                placeholder="Enter Discord User ID (e.g., 123456789012345678)"
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleAddAdmin}
                disabled={isAdding || !newAdminUserId.trim()}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
              >
                {isAdding ? 'Adding...' : 'Add Admin'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewAdminUserId('');
                  setMessage('');
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search admins by name, user ID, or email..."
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="text-gray-300">
            {filteredAdmins.length} admin{filteredAdmins.length !== 1 ? 's' : ''} found
          </div>
        </div>
      </div>

      {/* Admins List */}
      <div className="space-y-4">
        {filteredAdmins.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No admins found matching your search.
          </div>
        ) : (
          filteredAdmins.map((admin) => (
            <div
              key={admin.userId}
              className="bg-gray-800/50 border border-gray-600 rounded-lg p-6 hover:border-orange-500/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Image
                    src={admin.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                    alt={admin.username}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full border-2 border-orange-500/30"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                    }}
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-white">{admin.username}</h3>
                      {admin.isSuperAdmin && (
                        <span className="bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold">
                          SUPER ADMIN
                        </span>
                      )}
                      {'addedBy' in admin && (
                        <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
                          DYNAMIC
                        </span>
                      )}
                      {!('addedBy' in admin) && (
                        <span className="bg-purple-500 text-white px-2 py-1 rounded text-xs">
                          HARDCODED
                        </span>
                      )}
                    </div>
                    <p className="text-gray-300 text-sm">{admin.email}</p>
                    <p className="text-gray-400 text-xs">ID: {admin.userId}</p>
                    {'addedAt' in admin && (
                      <p className="text-gray-400 text-xs">
                        Added: {new Date(admin.addedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {admin.userId === (session?.user as any)?.id && (
                    <span className="text-orange-300 text-sm font-medium">(You)</span>
                  )}
                  {!admin.isSuperAdmin && (
                    <button
                      onClick={() => handleRemoveAdmin(admin.userId, !('addedBy' in admin))}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{hardcodedAdmins.length}</div>
          <div className="text-gray-300">Hardcoded Admins</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{dynamicAdmins.length}</div>
          <div className="text-gray-300">Dynamic Admins</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{allAdmins.length}</div>
          <div className="text-gray-300">Total Admins</div>
        </div>
      </div>
    </div>
  );
}
