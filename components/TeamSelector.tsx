/**
 * MODUL 6: Team Management - Team Selector Component
 * Dropdown for switching between teams
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, LogOut } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface TeamSelectorProps {
  currentTeamId: string;
  onTeamChange: (teamId: string) => void;
  onCreateTeam: () => void;
  onSignOut: () => void;
  authToken: string;
  userName: string;
}

export default function TeamSelector({
  currentTeamId,
  onTeamChange,
  onCreateTeam,
  onSignOut,
  authToken,
  userName
}: TeamSelectorProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTeam = teams.find(t => t.id === currentTeamId);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch('/api/teams', {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'X-Current-Team-Id': currentTeamId
          }
        });

        if (response.ok) {
          const data = await response.json();
          setTeams(data.teams);
        }
      } catch (error) {
        console.error('Failed to load teams:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [authToken, currentTeamId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTeamChange = (teamId: string) => {
    onTeamChange(teamId);
    setIsOpen(false);
  };

  if (loading) {
    return <div className="h-10 bg-gray-200 rounded animate-pulse" />;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-100 rounded-lg transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-600">Current Team</p>
          <p className="font-semibold text-gray-900 truncate">
            {currentTeam?.name || 'No team selected'}
          </p>
        </div>
        <ChevronDown
          size={20}
          className={`flex-shrink-0 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg border border-gray-200 shadow-lg z-50 overflow-hidden">
          <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-100">
            {teams.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <p>No teams yet</p>
              </div>
            ) : (
              teams.map(team => (
                <button
                  key={team.id}
                  onClick={() => handleTeamChange(team.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    team.id === currentTeamId ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {team.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt={team.name}
                        className="w-8 h-8 rounded"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-400 to-blue-600" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{team.name}</p>
                      <p className="text-xs text-gray-500">{team.slug}</p>
                    </div>
                    {team.id === currentTeamId && (
                      <span className="text-xs font-semibold text-blue-600">Active</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-gray-100" />

          <button
            onClick={() => {
              onCreateTeam();
              setIsOpen(false);
            }}
            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-blue-600"
          >
            <Plus size={18} />
            <span className="font-medium">Create New Team</span>
          </button>

          <div className="border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500 mb-3">Account</p>
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              </div>
              <button
                onClick={() => {
                  onSignOut();
                  setIsOpen(false);
                }}
                className="text-red-600 hover:text-red-700 p-1"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
