import { apiClient, isMockMode } from '@/api/client';
import { MOCK_USERS } from '@/mocks/data';
import type { AuthUser, ListParams, PaginatedResponse, User, UserFormValues } from '@/types';
import { delay, paginate } from '@/utils/helpers';
import {
  type BackendUser,
  mapBackendUser,
  mapUserFormToCreateRequest,
  mapUserFormToEditRequest,
  mapUserFormToUpdateRequest,
} from '@/utils/userMapper';

const toUserRecord = (user: AuthUser): User => ({
  id: user.id,
  employeeId: user.employeeId,
  fullName: user.fullName,
  email: user.email,
  mobileNumber: user.mobileNumber,
  role: user.role,
  roleId: user.roleId,
  roleIds: user.roleIds,
  jobTitleId: user.jobTitleId,
  workAreaId: user.workAreaId,
  locationId: user.locationId,
  statusId: user.statusId,
  status: user.status,
  workAreaName: user.workAreaName,
  locationName: user.locationName,
  jobTitleName: user.jobTitleName,
  createdAt: user.createdAt,
  photo: user.photo,
});

const usersStore = { current: MOCK_USERS.map(toUserRecord) };

const mapFormToMockUser = (
  values: UserFormValues,
  id?: number,
): User => {
  const roleName = values.roleId === 1 ? 'Admin' : values.roleId === 2 ? 'Manager' : 'Employee';
  const statusName = values.statusId === 2 ? 'Inactive' : values.statusId === 3 ? 'Blocked' : 'Active';

  return {
    id: id ?? Date.now(),
    employeeId: values.employeeId,
    fullName: values.fullName,
    email: values.email,
    mobileNumber: values.mobileNumber,
    role: roleName,
    roleId: values.roleId,
    roleIds: [values.roleId],
    jobTitleId: values.jobTitleId,
    workAreaId: values.workAreaId,
    locationId: values.locationId,
    statusId: values.statusId,
    status: statusName,
    workAreaName: 'Assembly Line 1',
    locationName: 'Kolkata Office',
    jobTitleName: 'Employee',
    createdAt: new Date().toISOString(),
  };
};

export const userService = {
  getAll: async (params?: ListParams): Promise<PaginatedResponse<User>> => {
    if (isMockMode()) {
      await delay(400);
      return paginate(usersStore.current, params);
    }

    const { data } = await apiClient.get<BackendUser[]>('/users');
    const users = data.map(mapBackendUser);
    return paginate(users, params);
  },

  getById: async (id: number): Promise<User> => {
    if (isMockMode()) {
      await delay(300);
      const item = usersStore.current.find((i) => i.id === id);
      if (!item) throw { message: 'User not found', status: 404 };
      return item;
    }

    const { data } = await apiClient.get<BackendUser>(`/users/${id}`);
    return mapBackendUser(data);
  },

  getForEdit: async (id: number): Promise<User> => {
    if (isMockMode()) {
      await delay(300);
      const item = usersStore.current.find((i) => i.id === id);
      if (!item) throw { message: 'User not found', status: 404 };
      return item;
    }

    const { data } = await apiClient.get<BackendUser>(`/users/${id}/edit`);
    return mapBackendUser(data);
  },

  create: async (values: UserFormValues): Promise<User> => {
    if (isMockMode()) {
      await delay(400);
      const item = mapFormToMockUser(values);
      usersStore.current = [...usersStore.current, item];
      return item;
    }

    const { data } = await apiClient.post<BackendUser>(
      '/users',
      mapUserFormToCreateRequest(values),
    );
    return mapBackendUser(data);
  },

  edit: async (id: number, values: UserFormValues): Promise<User> => {
    if (isMockMode()) {
      const payload: Partial<UserFormValues> = { ...values };
      if (!payload.password) delete payload.password;
      return userService.update(id, payload);
    }

    const { data } = await apiClient.put<BackendUser>(
      `/users/${id}/edit`,
      mapUserFormToEditRequest(values),
    );
    return mapBackendUser(data);
  },

  update: async (id: number, values: Partial<UserFormValues>): Promise<User> => {
    if (isMockMode()) {
      await delay(400);
      const existing = usersStore.current.find((i) => i.id === id);
      if (!existing) throw { message: 'User not found', status: 404 };

      const merged: UserFormValues = {
        employeeId: values.employeeId ?? existing.employeeId,
        fullName: values.fullName ?? existing.fullName,
        email: values.email ?? existing.email,
        mobileNumber: values.mobileNumber ?? existing.mobileNumber,
        password: values.password ?? '',
        roleId: values.roleId ?? existing.roleId,
        jobTitleId: values.jobTitleId ?? existing.jobTitleId,
        workAreaId: values.workAreaId ?? existing.workAreaId,
        locationId: values.locationId ?? existing.locationId,
        statusId: values.statusId ?? existing.statusId,
      };

      const item = mapFormToMockUser(merged, id);
      usersStore.current = usersStore.current.map((u) => (u.id === id ? item : u));
      return item;
    }

    const { data } = await apiClient.put<BackendUser>(
      `/users/${id}`,
      mapUserFormToUpdateRequest(values),
    );
    return mapBackendUser(data);
  },

  delete: async (id: number): Promise<void> => {
    if (isMockMode()) {
      await delay(300);
      usersStore.current = usersStore.current.filter((i) => i.id !== id);
      return;
    }

    await apiClient.delete(`/users/${id}`);
  },
};
