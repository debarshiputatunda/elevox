import type { User, UserFormValues } from '@/types';

export const userToFormValues = (user: User): UserFormValues => ({
  employeeId: user.employeeId,
  fullName: user.fullName,
  email: user.email,
  mobileNumber: user.mobileNumber,
  password: '',
  roleId: user.roleIds[0] ?? user.roleId,
  jobTitleId: user.jobTitleId,
  workAreaId: user.workAreaId,
  locationId: user.locationId,
  statusId: user.statusId,
});

export const defaultUserFormValues = (): UserFormValues => ({
  employeeId: '',
  fullName: '',
  email: '',
  mobileNumber: '',
  password: '',
  roleId: 3,
  jobTitleId: 3,
  workAreaId: 1,
  locationId: 1,
  statusId: 1,
});
