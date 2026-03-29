/**
 * MODUL 6: Team Management - Team Settings Component
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Save, AlertCircle } from 'lucide-react';

interface TeamSettings {
  id: string;
  team_id: string;
  currency: string;
  language: string;
  timezone: string;
  invoice_prefix: string;
  enable_stripe: boolean;
  enable_notifications: boolean;
  require_approval_for_invoices: boolean;
  auto_send_reminders: boolean;
}

interface TeamData {
  id: string;
  name: string;
  description: string | null;
  slug: string;
}

interface TeamSettingsProps {
  teamId: string;
  userRole: 'owner' | 'admin' | 'member' | 'viewer';
  authToken: string;
}

const CURRENCIES = [
  { code: 'HUF', label: 'Hungarian Forint' },
  { code: 'EUR', label: 'Euro' },
  { code: 'USD', label: 'US Dollar' },
  { code: 'GBP', label: 'British Pound' }
];

const LANGUAGES = [
  { code: 'hu', label: 'Magyar' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' }
];

const TIMEZONES = [
  { code: 'Europe/Budapest', label: 'Budapest (UTC+1/+2)' },
  { code: 'Europe/London', label: 'London (UTC+0/+1)' },
  { code: 'Europe/Berlin', label: 'Berlin (UTC+1/+2)' },
  { code: 'America/New_York', label: 'New York (UTC-5/-4)' },
  { code: 'America/Los_Angeles', label: 'Los Angeles (UTC-8/-7)' }
];

export default function TeamSettings({
  teamId,
  userRole,
  authToken
}: TeamSettingsProps) {
  const isAdmin = userRole === 'owner' || userRole === 'admin';

  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    currency: 'HUF',
    language: 'hu',
    timezone: 'Europe/Budapest',
    invoicePrefix: 'INV',
    enableStripe: true,
    enableNotifications: true,
    requireApproval: false,
    autoSendReminders: true
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/teams/${teamId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        if (!response.ok) throw new Error('Failed to load team');

        const data = await response.json();
        setTeam(data.team);

        if (data.team && data.team.team_settings?.[0]) {
          const ts = data.team.team_settings[0];
          setFormData({
            name: data.team.name,
            description: data.team.description || '',
            currency: ts.currency,
            language: ts.language,
            timezone: ts.timezone,
            invoicePrefix: ts.invoice_prefix,
            enableStripe: ts.enable_stripe,
            enableNotifications: ts.enable_notifications,
            requireApproval: ts.require_approval_for_invoices,
            autoSendReminders: ts.auto_send_reminders
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teamId, authToken]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSave = async () => {
    if (!isAdmin) {
      setError('You do not have permission to modify settings');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const teamResponse = await fetch(`/api/teams/${teamId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description
        })
      });

      if (!teamResponse.ok) {
        throw new Error('Failed to update team');
      }

      setSuccess('Settings saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading settings...</div>;
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

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-4">Team Information</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              disabled={!isAdmin}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              disabled={!isAdmin}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-4">Preferences</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              disabled={!isAdmin}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              name="language"
              value={formData.language}
              onChange={handleInputChange}
              disabled={!isAdmin}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              name="timezone"
              value={formData.timezone}
              onChange={handleInputChange}
              disabled={!isAdmin}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              {TIMEZONES.map(t => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-4">Features</h2>

        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="enableStripe"
              checked={formData.enableStripe}
              onChange={handleInputChange}
              disabled={!isAdmin}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Enable Stripe Payments</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="enableNotifications"
              checked={formData.enableNotifications}
              onChange={handleInputChange}
              disabled={!isAdmin}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Enable Notifications</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="requireApproval"
              checked={formData.requireApproval}
              onChange={handleInputChange}
              disabled={!isAdmin}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Require Approval for Invoices</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="autoSendReminders"
              checked={formData.autoSendReminders}
              onChange={handleInputChange}
              disabled={!isAdmin}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Auto-Send Payment Reminders</span>
          </label>
        </div>
      </div>

      {isAdmin && (
        <div className="flex justify-end gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
