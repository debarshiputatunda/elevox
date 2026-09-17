import { apiClient, isMockMode } from '@/api/client';
import { MOCK_TELEMETRY } from '@/mocks/data';
import type { TelemetryData, TelemetryHistoryPoint } from '@/types';
import {
  mapBackendTelemetry,
  mapBackendTelemetryHistory,
  type BackendTelemetryHistoryPoint,
  type BackendTelemetrySnapshot,
} from '@/utils/telemetryMapper';
import { delay } from '@/utils/helpers';

export const monitoringService = {
  getTelemetry: async (): Promise<TelemetryData[]> => {
    if (isMockMode()) {
      await delay(400);
      return MOCK_TELEMETRY.map((item) => ({
        ...item,
        hookAValue: item.hookAValue + (Math.random() * 4 - 2),
        hookBValue: item.hookBValue + (Math.random() * 4 - 2),
        lastUpdated: new Date().toISOString(),
      }));
    }
    const { data } = await apiClient.get<BackendTelemetrySnapshot[]>('/monitoring/telemetry');
    return data.map(mapBackendTelemetry);
  },

  getTelemetryByBox: async (boxId: number): Promise<TelemetryData> => {
    const { data } = await apiClient.get<BackendTelemetrySnapshot>(
      `/monitoring/telemetry/${boxId}`,
    );
    return mapBackendTelemetry(data);
  },

  getHistory: async (
    boxId: number,
    params?: { startAt?: string; endAt?: string; limit?: number },
  ): Promise<TelemetryHistoryPoint[]> => {
    const { data } = await apiClient.get<BackendTelemetryHistoryPoint[]>(
      `/monitoring/telemetry/${boxId}/history`,
      {
        params: {
          start_at: params?.startAt,
          end_at: params?.endAt,
          limit: params?.limit ?? 200,
        },
      },
    );
    return data.map(mapBackendTelemetryHistory);
  },

  getDashboardSummary: async () => {
    const { data } = await apiClient.get('/monitoring/dashboard');
    return data;
  },
};
