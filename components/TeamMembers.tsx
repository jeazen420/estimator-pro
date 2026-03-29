/**
 * MODUL 6: Team Management - Team Members Component
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, User, Mail, Clock, AlertCircle } from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer' | 'accountant';
  joined_at: string;
  is_active: boolean;
}

interface TeamInvitation {
  id: string;
  email: string;
  role: string;
  invited_at: string;
  is_used: boolean;
}

interface TeamMembersProps {
  teamId: string;
  userRole: 'owner' | 'admin' | 'member' | 'viewer';
  userId: string;
  authToken: string;
}

const ROLE_COLORS = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  member: 'bg-gray-100 text-gray-800',
  accountant: 'bg-green-100 text-green-800',
  viewer: 'bg-yellow-100 text-yellow-800'
};

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  accountant: 'Accountant',
  viewer: 'Viewer'
};

export default function TeamMembers({
  teamId,
  userRole,
  userId,
  authToken
}: TeamMembersProps) {
  const isAdmin = userRole === 'owner' || userRole === 'admin';

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'member'
  });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/teams/${teamId}/members`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        if (!response.ok) throw new Error('Failed to load members');

        const data = await response.json();
        setMembers(data.members);
        setInvitations(data.invitations);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teamId, authToken]);

  const handleInvite = async () => {
    if (!isAdmin) {
      setError('You do not have permission to invite members');
      return;
    }

    setInviting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: inviteData.email,
          role: inviteData.role
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send invitation');
      }

      setSuccess(`Invitation sent to ${inviteData.email}`);
      setInviteData({ email: '', role: 'member' });
      setShowInviteForm(false);

      const reloadResponse = await fetch(`/api/teams/${teamId}/members`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (reloadResponse.ok) {
        const data = await reloadResponse.json();
        setInvitations(data.invitations);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!isAdmin) {
      setError('You do not have permission to remove members');
      return;
    }

    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!response.ok) throw new Error('Failed to remove member');

      setMembers(members.filter(m => m.id !== memberId));
      setSuccess('Member removed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    if (userRole !== 'owner') {
      setError('Only team owner can change roles');
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) throw new Error('Failed to change role');

      setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole as any } : m));
      setSuccess('Role updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change role');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading members...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-green-600">✓</div>
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      {isAdmin && (
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Team Members</h2>
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showInviteForm ? 'Cancel' : '+ Invite Member'}
          </button>
        </div>
      )}

      {showInviteForm && isAdmin && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Invite New Member</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={inviteData.email}
                onChange={e => setInviteData({ ...inviteData, email: e.target.value })}
                placeholder="colleague@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={inviteData.role}
                onChange={e => setInviteData({ ...inviteData, role: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="member">Member</option>
                <option value="accountant">Accountant</option>
                <option value="viewer">Viewer</option>
                {userRole === 'owner' && <option value="admin">Admin</option>}
              </select>
            </div>

            <button
              onClick={handleInvite}
              disabled={!inviteData.email || inviting}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {inviting ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold">Active Members ({members.length})</h3>
        </div>

        <div className="divide-y divide-gray-200">
          {members.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No team members yet
            </div>
          ) : (
            members.map(member => (
              <div key={member.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User size={20} className="text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Member ID: {member.user_id.slice(0, 8)}</p>
                    <p className="text-sm text-gray-500">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {userRole === 'owner' && member.role !== 'owner' && (
                    <select
                      value={member.role}
                      onChange={e => handleChangeRole(member.id, e.target.value)}
                      className={`px-3 py-1 rounded text-sm font-medium border-0 ${ROLE_COLORS[member.role]}`}
                    >
                      <option value="member">Member</option>
                      <option value="accountant">Accountant</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  )}
                  {!(userRole === 'owner' && member.role !== 'owner') && (
                    <span className={`px-3 py-1 rounded text-sm font-medium ${ROLE_COLORS[member.role]}`}>
                      {ROLE_LABELS[member.role]}
                    </span>
                  )}

                  {isAdmin && member.role !== 'owner' && member.user_id !== userId && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-600 hover:text-red-700 p-2"
                      title="Remove member"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {invitations.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold">Pending Invitations ({invitations.length})</h3>
          </div>

          <div className="divide-y divide-gray-200">
            {invitations.map(invitation => (
              <div key={invitation.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Mail size={20} className="text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{invitation.email}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock size={14} />
                      Invited {new Date(invitation.invited_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded text-sm font-medium ${ROLE_COLORS[invitation.role as keyof typeof ROLE_COLORS] || ROLE_COLORS.member}`}>
                  {ROLE_LABELS[invitation.role as keyof typeof ROLE_LABELS] || 'Member'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
