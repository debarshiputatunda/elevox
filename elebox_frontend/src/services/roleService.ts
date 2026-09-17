import { apiClient, isMockMode } from '@/api/client';
import type { RoleOption } from '@/types';
import { delay } from '@/utils/helpers';

const MOCK_ROLES: RoleOption[] = [
  { role_id: 1, role_name: 'Admin', description: 'System Administrator' },
  { role_id: 2, role_name: 'Manager', description: 'Manager Role' },
  { role_id: 3, role_name: 'Employee', description: 'Employee Role' },
];

export const roleService = {
  list: async (): Promise<RoleOption[]> => {
    if (isMockMode()) {
      await delay(200);
      return MOCK_ROLES;
    }

    const { data } = await apiClient.get<RoleOption[]>('/roles');
    return data;
  },
};
