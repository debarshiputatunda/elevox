import { apiClient, isMockMode } from '@/api/client';
import { MOCK_LOCATIONS, MOCK_WORK_AREAS } from '@/mocks/data';
import type {
  ListParams,
  PaginatedResponse,
  WorkArea,
  WorkAreaFormValues,
} from '@/types';
import { delay, paginate } from '@/utils/helpers';
import {
  type BackendWorkArea,
  mapBackendWorkArea,
  mapWorkAreaFormToCreateRequest,
  mapWorkAreaFormToUpdateRequest,
} from '@/utils/workAreaMapper';

const workAreasStore = { current: [...MOCK_WORK_AREAS] };

export const workAreaService = {
  getAll: async (params?: ListParams): Promise<PaginatedResponse<WorkArea>> => {
    if (isMockMode()) {
      await delay(400);
      return paginate(workAreasStore.current, params);
    }

    const { data } = await apiClient.get<BackendWorkArea[]>('/work-areas');
    const workAreas = data.map(mapBackendWorkArea);
    return paginate(workAreas, params);
  },

  list: async (): Promise<WorkArea[]> => {
    const response = await workAreaService.getAll({ pageSize: 1000 });
    return response.data;
  },

  listByLocation: async (locationId: number): Promise<WorkArea[]> => {
    const workAreas = await workAreaService.list();
    return workAreas.filter((workArea) => workArea.locationId === locationId);
  },

  getById: async (id: number): Promise<WorkArea> => {
    if (isMockMode()) {
      await delay(300);
      const item = workAreasStore.current.find((i) => i.id === id);
      if (!item) throw { message: 'Work area not found', status: 404 };
      return item;
    }

    const { data } = await apiClient.get<BackendWorkArea>(`/work-areas/${id}`);
    return mapBackendWorkArea(data);
  },

  create: async (values: WorkAreaFormValues): Promise<WorkArea> => {
    if (isMockMode()) {
      await delay(400);
      const location = MOCK_LOCATIONS.find((l) => l.id === values.locationId);
      const item: WorkArea = {
        id: Date.now(),
        name: values.name.trim(),
        locationId: values.locationId,
        locationName: location?.name,
      };
      workAreasStore.current = [...workAreasStore.current, item];
      return item;
    }

    const { data } = await apiClient.post<BackendWorkArea>(
      '/work-areas',
      mapWorkAreaFormToCreateRequest(values),
    );
    return mapBackendWorkArea(data);
  },

  update: async (id: number, values: WorkAreaFormValues): Promise<WorkArea> => {
    if (isMockMode()) {
      await delay(400);
      const location = MOCK_LOCATIONS.find((l) => l.id === values.locationId);
      const item: WorkArea = {
        id,
        name: values.name.trim(),
        locationId: values.locationId,
        locationName: location?.name,
      };
      workAreasStore.current = workAreasStore.current.map((workArea) =>
        workArea.id === id ? item : workArea,
      );
      return item;
    }

    const { data } = await apiClient.put<BackendWorkArea>(
      `/work-areas/${id}`,
      mapWorkAreaFormToUpdateRequest(values),
    );
    return mapBackendWorkArea(data);
  },

  delete: async (id: number): Promise<void> => {
    if (isMockMode()) {
      await delay(300);
      workAreasStore.current = workAreasStore.current.filter((i) => i.id !== id);
      return;
    }

    await apiClient.delete(`/work-areas/${id}`);
  },
};
