import { apiClient, isMockMode } from '@/api/client';
import {
  ACTIVITY_STATUS_OPTIONS,
  lookupSboxStatusName,
} from '@/constants/sboxLookups';
import { MOCK_SBOXES } from '@/mocks/data';
import type {
  ListParams,
  PaginatedResponse,
  SBox,
  SBoxFormValues,
} from '@/types';
import { delay, paginate } from '@/utils/helpers';
import {
  type BackendSBox,
  mapBackendSBox,
  mapSBoxFormToCreateRequest,
  mapSBoxFormToUpdateRequest,
} from '@/utils/sboxMapper';

const sboxesStore = { current: [...MOCK_SBOXES] };

// Saves survive MonitoringPage navigation, so their ordering must too.
const thresholdWrites = new Map<number, Promise<SBox>>();

const mapFormToMockSBox = (values: SBoxFormValues, id?: number): SBox => ({
  id: id ?? Date.now(),
  serialNo: values.serialNo || `SBOX-${Date.now()}`,
  boxIp: values.boxIp,
  boxDetails: values.boxDetails,
  locationId: values.locationId,
  workAreaId: values.workAreaId,
  activityStatus: values.activityStatus,
  activityStatusName: lookupSboxStatusName(ACTIVITY_STATUS_OPTIONS, values.activityStatus),
  mfgDate: values.mfgDate ?? new Date().toISOString().slice(0, 10),
});

export const sboxService = {
  getAll: async (
    params?: ListParams,
    options?: { mine?: boolean },
  ): Promise<PaginatedResponse<SBox>> => {
    if (isMockMode()) {
      await delay(400);
      let items = [...sboxesStore.current];
      if (options?.mine) {
        items = items.filter((item) => item.id <= 2);
      }
      return paginate(items, params);
    }

    const { data } = await apiClient.get<BackendSBox[]>('/sboxes', {
      params: {
        search: params?.search || undefined,
        mine: options?.mine || undefined,
      },
    });
    const sboxes = data.map(mapBackendSBox);
    return paginate(sboxes, params);
  },

  getById: async (id: number): Promise<SBox> => {
    if (isMockMode()) {
      await delay(300);
      const item = sboxesStore.current.find((i) => i.id === id);
      if (!item) throw { message: 'S-Box not found', status: 404 };
      return item;
    }

    const { data } = await apiClient.get<BackendSBox>(`/sboxes/${id}`);
    return mapBackendSBox(data);
  },

  create: async (values: SBoxFormValues): Promise<SBox> => {
    if (isMockMode()) {
      await delay(400);
      const item = mapFormToMockSBox(values);
      sboxesStore.current = [...sboxesStore.current, item];
      return item;
    }

    const { data } = await apiClient.post<BackendSBox>(
      '/sboxes',
      mapSBoxFormToCreateRequest(values),
    );
    return mapBackendSBox(data);
  },

  update: async (id: number, values: SBoxFormValues): Promise<SBox> => {
    if (isMockMode()) {
      await delay(400);
      const existing = sboxesStore.current.find((item) => item.id === id);
      if (!existing) throw { message: 'S-Box not found', status: 404 };

      const item: SBox = {
        ...existing,
        ...mapFormToMockSBox(values, id),
        serialNo: existing.serialNo,
      };
      sboxesStore.current = sboxesStore.current.map((sbox) =>
        sbox.id === id ? item : sbox,
      );
      return item;
    }

    const { data } = await apiClient.put<BackendSBox>(
      `/sboxes/${id}`,
      mapSBoxFormToUpdateRequest(values),
    );
    return mapBackendSBox(data);
  },

  delete: async (id: number): Promise<void> => {
    if (isMockMode()) {
      await delay(300);
      sboxesStore.current = sboxesStore.current.filter((item) => item.id !== id);
      return;
    }

    await apiClient.delete(`/sboxes/${id}`);
  },

  setEnabled: async (id: number, enabled: boolean): Promise<SBox> => {
    if (isMockMode()) {
      await delay(300);
      const existing = sboxesStore.current.find((item) => item.id === id);
      if (!existing) throw { message: 'S-Box not found', status: 404 };
      const item: SBox = {
        ...existing,
        activityStatus: enabled ? 1 : 2,
        activityStatusName: enabled ? 'Active' : 'Inactive',
      };
      sboxesStore.current = sboxesStore.current.map((sbox) =>
        sbox.id === id ? item : sbox,
      );
      return item;
    }

    const { data } = await apiClient.patch<BackendSBox>(`/sboxes/${id}/status`, { enabled });
    return mapBackendSBox(data);
  },

  updateThresholds: async (
    id: number,
    thresholds: Partial<{ hookA: number; hookB: number }>,
  ): Promise<SBox> => {
    const previous = thresholdWrites.get(id) ?? Promise.resolve();
    const write = previous.catch(() => undefined).then(async () => {
      if (isMockMode()) {
        await delay(200);
        const existing = sboxesStore.current.find((item) => item.id === id);
        if (!existing) throw { message: 'S-Box not found', status: 404 };
        const item: SBox = {
          ...existing,
          hookAThreshold: thresholds.hookA ?? existing.hookAThreshold,
          hookBThreshold: thresholds.hookB ?? existing.hookBThreshold,
        };
        sboxesStore.current = sboxesStore.current.map((sbox) =>
          sbox.id === id ? item : sbox,
        );
        return item;
      }

      const { data } = await apiClient.patch<BackendSBox>(`/sboxes/${id}/thresholds`, {
        hookA_threshold: thresholds.hookA,
        hookB_threshold: thresholds.hookB,
      });
      return mapBackendSBox(data);
    });
    thresholdWrites.set(id, write);
    try {
      return await write;
    } finally {
      if (thresholdWrites.get(id) === write) thresholdWrites.delete(id);
    }
  },
};
