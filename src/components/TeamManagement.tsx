'use client';

import { useState, useEffect } from 'react';
import { Plus, UserPlus, UserMinus, Crown, Shield, User, Eye, Mail, Search } from 'lucide-react';

interface Project {
  _id: string;
  name: string;
  ownerId: string;
  members: Array<{
    userId: string;
    role: string;
    joinedAt: string;
  }>;
}

interface TeamManagementProps {
  project: Project | null;
  currentUserId: string;
  onUpdateProject: (projectId: string, updates: any) => void;
}

export default function TeamManagement({ project, currentUserId, onUpdateProject }: TeamManagementProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [searchQuery, setSearchQuery] = useState('');

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'admin': return <Shield className="w-4 h-4 text-purple-600" />;
      case 'member': return <User className="w-4 h-4 text-blue-600" />;
      case 'viewer': return <Eye className="w-4 h-4 text-gray-600" />;
      default: return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'member': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'viewer': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !project) return;

    try {
      // In a real app, this would send an invitation email
      // For now, we'll just add the user directly
      const newMember = {
        userId: inviteEmail, // In real app, this would be the actual user ID
        role: inviteRole,
        joinedAt: new Date().toISOString()
      };

      const updatedMembers = [...project.members, newMember];
      
      await onUpdateProject(project._id, {
        members: updatedMembers
      });

      setInviteEmail('');
      setInviteRole('member');
      setShowInviteModal(false);
    } catch (error) {
      console.error('Error inviting member:', error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!project) return;

    try {
      const updatedMembers = project.members.filter(member => member.userId !== userId);
      
      await onUpdateProject(project._id, {
        members: updatedMembers
      });
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (!project) return;

    try {
      const updatedMembers = project.members.map(member =>
        member.userId === userId ? { ...member, role: newRole } : member
      );
      
      await onUpdateProject(project._id, {
        members: updatedMembers
      });
    } catch (error) {
      console.error('Error changing role:', error);
    }
  };

  const isOwner = project?.ownerId === currentUserId;
  const currentUserRole = project?.members.find(m => m.userId === currentUserId)?.role || 'viewer';

  const filteredMembers = project?.members.filter(member =>
    member.userId.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (!project) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Select a project to manage team members</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Team Management</h2>
            <p className="text-gray-600 mt-1">{project.name}</p>
          </div>
          {(isOwner || currentUserRole === 'admin') && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="p-6 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Team Members List */}
      <div className="divide-y divide-gray-200">
        {filteredMembers.map((member) => (
          <div key={member.userId} className="p-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{member.userId}</span>
                  {member.userId === project.ownerId && (
                    <span className="text-xs text-yellow-600 font-medium">(Owner)</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center space-x-1 ${getRoleColor(member.role)}`}>
                {getRoleIcon(member.role)}
                <span className="capitalize">{member.role}</span>
              </span>
              
              {(isOwner || (currentUserRole === 'admin' && member.role !== 'owner')) && (
                <div className="flex items-center space-x-2">
                  <select
                    value={member.role}
                    onChange={(e) => handleChangeRole(member.userId, e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                    disabled={member.userId === project.ownerId}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    {isOwner && <option value="owner">Owner</option>}
                  </select>
                  
                  {member.userId !== project.ownerId && member.userId !== currentUserId && (
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite Team Member</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="user@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="viewer">Viewer - Can view tasks and projects</option>
                  <option value="member">Member - Can create and edit tasks</option>
                  <option value="admin">Admin - Can manage team and settings</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteMember}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Permissions Info */}
      <div className="p-6 bg-gray-50 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Role Permissions</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Eye className="w-4 h-4 text-gray-600" />
              <span className="font-medium">Viewer</span>
            </div>
            <p className="text-gray-600">View tasks and projects only</p>
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <User className="w-4 h-4 text-blue-600" />
              <span className="font-medium">Member</span>
            </div>
            <p className="text-gray-600">Create and edit tasks</p>
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-4 h-4 text-purple-600" />
              <span className="font-medium">Admin</span>
            </div>
            <p className="text-gray-600">Manage team and project settings</p>
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Crown className="w-4 h-4 text-yellow-600" />
              <span className="font-medium">Owner</span>
            </div>
            <p className="text-gray-600">Full control over project</p>
          </div>
        </div>
      </div>
    </div>
  );
}
