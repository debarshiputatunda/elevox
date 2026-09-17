import {
  JOB_TITLE_OPTIONS,
  ROLE_NAME_TO_ID,
  lookupName,
  toAccountStatus,
} from '@/constants/userLookups';
import type { User, UserEditRequest, UserRole } from '@/types';

export interface BackendRole {
  role_id: number;
  role_name: string;
  description?: string | null;
}

export interface BackendUser {
  user_id: number;
  employee_id?: string | null;
  employee_name?: string | null;
  email_id?: string | null;
  phonenumber?: string | null;
  status_id?: number | null;
  status?: string | null;
  job_title_id?: number | null;
  job_title_name?: string | null;
  work_area_id?: number | null;
  work_area_name?: string | null;
  location_id?: number | null;
  location_name?: string | null;
  role_ids?: number[];
  roles: BackendRole[];
  created_at?: string | null;
}

const resolvePrimaryRole = (roles: BackendRole[]): UserRole => {
  const priority: UserRole[] = ['Admin', 'Manager', 'Employee'];
  const names = new Set(roles.map((r) => r.role_name));
  for (const role of priority) {
    if (names.has(role)) return role;
  }
  return 'Employee';
};

export const mapBackendUser = (data: BackendUser): User => {
  const roleIds = data.role_ids?.length
    ? data.role_ids
    : data.roles.map((r) => r.role_id);
  const primaryRole = resolvePrimaryRole(data.roles);
  const roleId = roleIds[0] ?? ROLE_NAME_TO_ID[primaryRole] ?? 3;

  return {
    id: data.user_id,
    employeeId: data.employee_id ?? '',
    fullName: data.employee_name ?? '',
    email: data.email_id ?? '',
    mobileNumber: data.phonenumber ?? '',
    role: primaryRole,
    roleId,
    roleIds,
    jobTitleId: data.job_title_id ?? 3,
    workAreaId: data.work_area_id ?? 1,
    locationId: data.location_id ?? 1,
    statusId: data.status_id ?? 1,
    status: toAccountStatus(data.status),
    workAreaName: data.work_area_name ?? undefined,
    locationName: data.location_name ?? undefined,
    jobTitleName:
      data.job_title_name ??
      lookupName(JOB_TITLE_OPTIONS, data.job_title_id ?? undefined),
    createdAt: data.created_at ?? undefined,
  };
};

export interface UserFormPayload {
  employeeId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  password?: string;
  roleId: number;
  jobTitleId: number;
  workAreaId: number;
  locationId: number;
  statusId: number;
}

export const mapUserFormToCreateRequest = (values: UserFormPayload) => ({
  employee_id: values.employeeId,
  employee_name: values.fullName,
  email_id: values.email,
  phonenumber: values.mobileNumber,
  password: values.password ?? '',
  status_id: values.statusId,
  job_title_id: values.jobTitleId,
  work_area_id: values.workAreaId,
  location_id: values.locationId,
  role_ids: [values.roleId],
});

export const mapUserFormToUpdateRequest = (values: Partial<UserFormPayload>) => {
  const payload: Record<string, unknown> = {};

  if (values.employeeId !== undefined) payload.employee_id = values.employeeId;
  if (values.fullName !== undefined) payload.employee_name = values.fullName;
  if (values.email !== undefined) payload.email_id = values.email;
  if (values.mobileNumber !== undefined) payload.phonenumber = values.mobileNumber;
  if (values.password) payload.password = values.password;
  if (values.statusId !== undefined) payload.status_id = values.statusId;
  if (values.jobTitleId !== undefined) payload.job_title_id = values.jobTitleId;
  if (values.workAreaId !== undefined) payload.work_area_id = values.workAreaId;
  if (values.locationId !== undefined) payload.location_id = values.locationId;
  if (values.roleId !== undefined) payload.role_ids = [values.roleId];

  return payload;
};

export const mapUserFormToEditRequest = (values: UserFormPayload): UserEditRequest => {
  const payload: UserEditRequest = {
    employee_id: values.employeeId,
    employee_name: values.fullName,
    email_id: values.email,
    phonenumber: values.mobileNumber,
    status_id: values.statusId,
    job_title_id: values.jobTitleId,
    work_area_id: values.workAreaId,
    location_id: values.locationId,
    role_ids: [values.roleId],
  };

  if (values.password) {
    payload.password = values.password;
  }

  return payload;
};
