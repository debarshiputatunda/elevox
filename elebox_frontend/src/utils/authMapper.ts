import type { AccountStatus, AuthUser, UserRole } from '@/types';

interface BackendMeResponse {
  id: number;
  employeeId?: string | null;
  fullName?: string | null;
  email: string;
  mobileNumber?: string | null;
  role: string;
  roles: string[];
  permissions: string[];
  workAreaId?: number | null;
  locationId?: number | null;
  status?: string;
}

const VALID_ROLES: UserRole[] = ['Admin', 'Manager', 'Employee'];
const VALID_STATUSES: AccountStatus[] = ['Active', 'Inactive', 'Blocked'];

const toUserRole = (role: string): UserRole =>
  VALID_ROLES.includes(role as UserRole) ? (role as UserRole) : 'Employee';

const toAccountStatus = (status?: string): AccountStatus =>
  VALID_STATUSES.includes(status as AccountStatus)
    ? (status as AccountStatus)
    : 'Active';

export const mapBackendUser = (data: BackendMeResponse): AuthUser => {
  const roles = (data.roles?.length ? data.roles : [data.role]).map(toUserRole);

  const primaryRole = toUserRole(data.role);

  return {
    id: data.id,
    employeeId: data.employeeId ?? '',
    fullName: data.fullName ?? '',
    email: data.email,
    mobileNumber: data.mobileNumber ?? '',
    role: primaryRole,
    roles,
    roleId: primaryRole === 'Admin' ? 1 : primaryRole === 'Manager' ? 2 : 3,
    roleIds: roles.map((role) => (role === 'Admin' ? 1 : role === 'Manager' ? 2 : 3)),
    jobTitleId: primaryRole === 'Admin' ? 1 : primaryRole === 'Manager' ? 2 : 3,
    workAreaId: data.workAreaId ?? 0,
    locationId: data.locationId ?? 1,
    statusId: toAccountStatus(data.status) === 'Active' ? 1 : toAccountStatus(data.status) === 'Inactive' ? 2 : 3,
    status: toAccountStatus(data.status),
    permissions: data.permissions ?? [],
  };
};
