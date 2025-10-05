'use client';

import { useState, useEffect } from 'react';
import { User, Search } from 'lucide-react';

interface User {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  displayName?: string;
}

interface UserSelectorProps {
  projectId?: string;
  currentUserId: string;
  onUserSelect: (userId: string) => void;
  placeholder?: string;
  className?: string;
}

export default function UserSelector({ 
  projectId, 
  currentUserId, 
  onUserSelect, 
  placeholder = "Assign to...",
  className = ""
}: UserSelectorProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch users from the project or system
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users/all');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Add current user as "Me" option
          const usersWithMe = [
            { id: currentUserId, username: 'Me', email: '', displayName: 'Me' },
            ...data.users
          ];
          setUsers(usersWithMe);
        } else {
          console.error('Failed to fetch users:', data.error);
          // Fallback to current user only
          setUsers([{ id: currentUserId, username: 'Me', email: '', displayName: 'Me' }]);
        }
      } else {
        console.error('Failed to fetch users:', response.statusText);
        // Fallback to current user only
        setUsers([{ id: currentUserId, username: 'Me', email: '', displayName: 'Me' }]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      // Fallback to current user only
      setUsers([{ id: currentUserId, username: 'Me', email: '', displayName: 'Me' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [projectId, currentUserId]);

  const filteredUsers = users.filter(user =>
    user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserSelect = (user: User) => {
    onUserSelect(user.id);
    setSearchQuery(user.displayName || user.username);
    setShowDropdown(false);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
        />
      </div>

      {showDropdown && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center text-gray-500">
              Loading users...
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="py-1">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {user.displayName || user.username}
                      {user.id === currentUserId && (
                        <span className="ml-2 text-xs text-blue-600">(You)</span>
                      )}
                    </div>
                    {user.email && (
                      <div className="text-sm text-gray-500">{user.email}</div>
                    )}
                    {user.displayName && user.displayName !== user.username && (
                      <div className="text-xs text-gray-400">@{user.username}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center text-gray-500">
              <div className="text-2xl mb-2">👥</div>
              <p className="text-sm">No users found</p>
              <p className="text-xs text-gray-400 mt-1">
                Try a different search term
              </p>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
