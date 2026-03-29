/**
 * MODUL 6: Team Management - Team Settings Page
 * Route: /team/settings
 */

'use client';

import React, { useState, useEffect } from 'react';
import TeamSettings from '@/components/TeamSettings';
import TeamMembers from '@/components/TeamMembers';
import { AlertCircle } from 'lucide-react';

export default function TeamSettingsPage() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | 'viewer'>('member');
  const [userId, setUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('settings');

  useEffect(() => {
    try {
      const storedTeamId = localStorage.getItem('currentTeamId');
      const storedToken = localStorage.getItem('authToken');
      const storedRole = localStorage.getItem('userRole') || 'member';
      const storedUserId = localStorage.getItem('userId');

      if (!storedTeamId || !storedToken) {
        setError('Team information not available. Please select a team first.');
        setLoading(false);
        return;
      }

      setTeamId(storedTeamId);
      setAuthToken(storedToken);
      setUserRole(storedRole as any);
      setUserId(storedUserId);
      setLoading(false);
    } catch (err) {
      setError('Failed to load team information');
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading team settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!teamId || !authToken || !userId) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-yellow-900">Team Not Selected</h3>
            <p className="text-yellow-800 text-sm">
              Please select a team to view and manage settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Team Settings</h1>
        <p className="text-gray-600 mt-2">Manage your team, members, and preferences</p>
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'members'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Members & Access
        </button>
      </div>

      {activeTab === 'settings' && (
        <TeamSettings
          teamId={teamId}
          userRole={userRole}
          authToken={authToken}
        />
      )}

      {activeTab === 'members' && (
        <TeamMembers
          teamId={teamId}
          userRole={userRole}
          userId={userId}
          authToken={authToken}
        />
      )}
    </div>
  );
}
