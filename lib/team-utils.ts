/**
 * MODUL 6: Team Management - Utility Functions
 */

export type UserRole = 'owner' | 'admin' | 'member' | 'accountant' | 'viewer';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  owner: [
    'manage_team',
    'manage_members',
    'manage_settings',
    'delete_team',
    'manage_invoices',
    'manage_clients',
    'manage_projects',
    'view_reports',
    'manage_templates',
    'manage_payments'
  ],
  admin: [
    'manage_members',
    'manage_settings',
    'manage_invoices',
    'manage_clients',
    'manage_projects',
    'view_reports',
    'manage_templates',
    'manage_payments'
  ],
  member: [
    'manage_invoices',
    'manage_clients',
    'manage_projects',
    'view_reports',
    'manage_templates'
  ],
  accountant: [
    'manage_invoices',
    'manage_payments',
    'view_reports'
  ],
  viewer: [
    'view_reports'
  ]
};

export function hasPermission(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

export function canManageTeam(role: UserRole): boolean {
  return hasPermission(role, 'manage_team');
}

export function canManageMembers(role: UserRole): boolean {
  return hasPermission(role, 'manage_members');
}

export function isAdmin(role: UserRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    owner: 'Owner',
    admin: 'Administrator',
    member: 'Member',
    accountant: 'Accountant',
    viewer: 'Viewer'
  };
  return labels[role] || 'Unknown';
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateSlug(slug: string): boolean {
  return /^[a-z0-9_-]+$/.test(slug) && slug.length > 0 && slug.length <= 100;
}

export function formatSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 100);
}
