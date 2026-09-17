import type { UserRole } from '@/types';

export const ROLES: Record<UserRole, UserRole> = {
  Admin: 'Admin',
  Manager: 'Manager',
  Employee: 'Employee',
};

export type Permission =
  | 'dashboard'
  | 'users.manage'
  | 'users.view'
  | 'locations.manage'
  | 'locations.view'
  | 'workAreas.manage'
  | 'workAreas.view'
  | 'tickets.manage'
  | 'tickets.view'
  | 'sboxes.manage'
  | 'sboxes.view'
  | 'monitoring'
  | 'notifications'
  | 'alarms'
  | 'batteryHealth'
  | 'reports'
  | 'settings'
  | 'profile';

const ADMIN_PERMISSIONS: Permission[] = [
  'dashboard',
  'users.manage',
  'locations.manage',
  'workAreas.manage',
  'tickets.manage',
  'sboxes.manage',
  'monitoring',
  'notifications',
  'alarms',
  'batteryHealth',
  'reports',
  'settings',
  'profile',
];

const MANAGER_PERMISSIONS: Permission[] = [
  'dashboard',
  'users.view',
  'locations.view',
  'workAreas.view',
  'tickets.manage',
  'sboxes.view',
  'monitoring',
  'notifications',
  'alarms',
  'batteryHealth',
  'reports',
  'profile',
];

const EMPLOYEE_PERMISSIONS: Permission[] = [
  'dashboard',
  'sboxes.view',
  'monitoring',
  'notifications',
  'tickets.view',
  'profile',
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  Admin: ADMIN_PERMISSIONS,
  Manager: MANAGER_PERMISSIONS,
  Employee: EMPLOYEE_PERMISSIONS,
};

export const hasPermission = (role: UserRole, permission: Permission): boolean =>
  ROLE_PERMISSIONS[role]?.includes(permission) ?? false;

export const hasAnyPermission = (role: UserRole, permissions: Permission[]): boolean =>
  permissions.some((p) => hasPermission(role, p));

export const hasPermissionForRoles = (
  roles: UserRole[],
  permission: Permission,
): boolean => roles.some((role) => hasPermission(role, permission));

export const hasAnyPermissionForRoles = (
  roles: UserRole[],
  permissions: Permission[],
): boolean => roles.some((role) => hasAnyPermission(role, permissions));
