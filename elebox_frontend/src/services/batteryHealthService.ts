import { apiClient, isMockMode } from '@/api/client';
import { MOCK_SBOXES } from '@/mocks/data';
import type { PaginatedResponse } from '@/types';
import { delay, paginate } from '@/utils/helpers';
import { resolveBatteryStatus } from '@/utils/batteryHealth';

export interface BatteryHealthSummary {
  totalDevices: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  unknownCount: number;
  averageBatteryPercent: number;
}

export interface BatteryDevice {
  boxId: number;
  serialNo?: string;
  locationId?: number;
  locationName?: string;
  workAreaId?: number;
  workAreaName?: string;
  batteryPercent?: number;
  batteryVoltage?: number;
  batteryStatus: string;
  lastSeen?: string;
  lastUpdated?: string;
}

export interface BatteryDeviceFilters {
  boxId?: number;
  locationId?: number;
  workAreaId?: number;
  batteryStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface BatteryAnalytics {
  distribution: Array<{ status: string; count: number }>;
  lowestDevices: Array<{ boxId: number; serialNo?: string; batteryPercent: number }>;
  trend: Array<{ recordedAt: string; batteryPercent: number; batteryVoltage: number }>;
}

interface BackendSummary {
  total_devices: number;
  healthy_count: number;
  warning_count: number;
  critical_count: number;
  unknown_count: number;
  average_battery_percent: number;
}

interface BackendDevice {
  box_id: number;
  serial_no?: string | null;
  location_id?: number | null;
  location_name?: string | null;
  work_area_id?: number | null;
  work_area_name?: string | null;
  battery_percent?: number | null;
  battery_voltage?: number | null;
  battery_status: string;
  last_seen?: string | null;
  last_updated?: string | null;
}

const mapDevice = (item: BackendDevice): BatteryDevice => ({
  boxId: item.box_id,
  serialNo: item.serial_no ?? undefined,
  locationId: item.location_id ?? undefined,
  locationName: item.location_name ?? undefined,
  workAreaId: item.work_area_id ?? undefined,
  workAreaName: item.work_area_name ?? undefined,
  batteryPercent: item.battery_percent ?? undefined,
  batteryVoltage: item.battery_voltage ?? undefined,
  batteryStatus: item.battery_status,
  lastSeen: item.last_seen ?? undefined,
  lastUpdated: item.last_updated ?? undefined,
});

const buildParams = (filters?: BatteryDeviceFilters & { boxId?: number }) => ({
  page: filters?.page,
  page_size: filters?.pageSize,
  box_id: filters?.boxId,
  location_id: filters?.locationId,
  work_area_id: filters?.workAreaId,
  battery_status: filters?.batteryStatus,
});

const mockDevices = (): BatteryDevice[] =>
  MOCK_SBOXES.map((sbox, index) => {
    const batteryPercent = [85, 42, 15, 68, 91][index % 5];
    return {
      boxId: sbox.id,
      serialNo: sbox.serialNo,
      locationId: sbox.locationId,
      locationName: sbox.locationName,
      workAreaId: sbox.workAreaId,
      workAreaName: sbox.workAreaName,
      batteryPercent,
      batteryVoltage: 3.8 + (batteryPercent / 100) * 0.5,
      batteryStatus: resolveBatteryStatus(batteryPercent),
      lastSeen: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
  });

export const batteryHealthService = {
  getSummary: async (filters?: BatteryDeviceFilters): Promise<BatteryHealthSummary> => {
    if (isMockMode()) {
      await delay(300);
      const devices = mockDevices();
      const percents = devices.map((d) => d.batteryPercent ?? 0);
      return {
        totalDevices: devices.length,
        healthyCount: devices.filter((d) => d.batteryStatus === 'Healthy').length,
        warningCount: devices.filter((d) => d.batteryStatus === 'Warning').length,
        criticalCount: devices.filter((d) => d.batteryStatus === 'Critical').length,
        unknownCount: 0,
        averageBatteryPercent: Math.round(
          percents.reduce((a, b) => a + b, 0) / percents.length,
        ),
      };
    }
    const { data } = await apiClient.get<BackendSummary>('/battery-health/summary', {
      params: buildParams(filters),
    });
    return {
      totalDevices: data.total_devices,
      healthyCount: data.healthy_count,
      warningCount: data.warning_count,
      criticalCount: data.critical_count,
      unknownCount: data.unknown_count,
      averageBatteryPercent: data.average_battery_percent,
    };
  },

  getDevices: async (
    filters?: BatteryDeviceFilters,
  ): Promise<PaginatedResponse<BatteryDevice>> => {
    if (isMockMode()) {
      await delay(400);
      let devices = mockDevices();
      if (filters?.batteryStatus) {
        devices = devices.filter((d) => d.batteryStatus === filters.batteryStatus);
      }
      if (filters?.boxId) {
        devices = devices.filter((d) => d.boxId === filters.boxId);
      }
      return paginate(devices, { page: filters?.page, pageSize: filters?.pageSize });
    }
    const { data } = await apiClient.get<{
      data: BackendDevice[];
      total: number;
      page: number;
      page_size: number;
    }>('/battery-health/devices', { params: buildParams(filters) });
    return {
      data: data.data.map(mapDevice),
      total: data.total,
      page: data.page,
      pageSize: data.page_size,
    };
  },

  getDevice: async (boxId: number) => {
    if (isMockMode()) {
      await delay(300);
      const device = mockDevices().find((d) => d.boxId === boxId);
      return { ...device, trend: [] };
    }
    const { data } = await apiClient.get(`/battery-health/device/${boxId}`);
    return {
      ...mapDevice(data),
      trend: (data.trend ?? []).map((point: {
        recorded_at: string;
        battery_percent: number;
        battery_voltage: number;
      }) => ({
        recordedAt: point.recorded_at,
        batteryPercent: point.battery_percent,
        batteryVoltage: point.battery_voltage,
      })),
    };
  },

  getAnalytics: async (
    filters?: BatteryDeviceFilters & { boxId?: number },
  ): Promise<BatteryAnalytics> => {
    if (isMockMode()) {
      await delay(350);
      const devices = mockDevices();
      return {
        distribution: [
          { status: 'Healthy', count: devices.filter((d) => d.batteryStatus === 'Healthy').length },
          { status: 'Warning', count: devices.filter((d) => d.batteryStatus === 'Warning').length },
          { status: 'Critical', count: devices.filter((d) => d.batteryStatus === 'Critical').length },
        ],
        lowestDevices: [...devices]
          .sort((a, b) => (a.batteryPercent ?? 0) - (b.batteryPercent ?? 0))
          .slice(0, 10)
          .map((d) => ({
            boxId: d.boxId,
            serialNo: d.serialNo,
            batteryPercent: d.batteryPercent ?? 0,
          })),
        trend: [],
      };
    }
    const { data } = await apiClient.get('/battery-health/analytics', {
      params: buildParams(filters),
    });
    return {
      distribution: data.distribution,
      lowestDevices: data.lowest_devices.map((item: {
        box_id: number;
        serial_no?: string;
        battery_percent: number;
      }) => ({
        boxId: item.box_id,
        serialNo: item.serial_no,
        batteryPercent: item.battery_percent,
      })),
      trend: (data.trend ?? []).map((point: {
        recorded_at: string;
        battery_percent: number;
        battery_voltage: number;
      }) => ({
        recordedAt: point.recorded_at,
        batteryPercent: point.battery_percent,
        batteryVoltage: point.battery_voltage,
      })),
    };
  },
};
