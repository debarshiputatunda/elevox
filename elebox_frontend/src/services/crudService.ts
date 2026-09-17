import { apiClient, isMockMode } from '@/api/client';
import { delay, paginate } from '@/utils/helpers';
import type { ListParams, PaginatedResponse } from '@/types';

export const createCrudService = <T extends { id: number }>(
  endpoint: string,
  mockStore: { current: T[] },
) => ({
  getAll: async (params?: ListParams): Promise<PaginatedResponse<T>> => {
    if (isMockMode()) {
      await delay(400);
      return paginate(mockStore.current, params);
    }
    const { data } = await apiClient.get<PaginatedResponse<T>>(endpoint, { params });
    return data;
  },

  getById: async (id: number): Promise<T> => {
    if (isMockMode()) {
      await delay(300);
      const item = mockStore.current.find((i) => i.id === id);
      if (!item) throw { message: 'Not found', status: 404 };
      return item;
    }
    const { data } = await apiClient.get<T>(`${endpoint}/${id}`);
    return data;
  },

  create: async (payload: Omit<T, 'id'>): Promise<T> => {
    if (isMockMode()) {
      await delay(400);
      const item = { ...payload, id: Date.now() } as T;
      mockStore.current = [...mockStore.current, item];
      return item;
    }
    const { data } = await apiClient.post<T>(endpoint, payload);
    return data;
  },

  update: async (id: number, payload: Partial<T>): Promise<T> => {
    if (isMockMode()) {
      await delay(400);
      mockStore.current = mockStore.current.map((i) =>
        i.id === id ? { ...i, ...payload } : i,
      );
      const item = mockStore.current.find((i) => i.id === id);
      if (!item) throw { message: 'Not found', status: 404 };
      return item;
    }
    const { data } = await apiClient.put<T>(`${endpoint}/${id}`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    if (isMockMode()) {
      await delay(300);
      mockStore.current = mockStore.current.filter((i) => i.id !== id);
      return;
    }
    await apiClient.delete(`${endpoint}/${id}`);
  },
});
