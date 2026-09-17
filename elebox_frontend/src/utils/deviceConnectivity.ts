import type { TelemetryData } from '@/types';
import { parseUtcDate } from '@/utils/helpers';

/** Matches backend TELEMETRY_OFFLINE_THRESHOLD_S (default 10s). */
export const DEVICE_OFFLINE_THRESHOLD_MS = 10_000;

export const OFFLINE_NOTIFICATION_TYPES = new Set([
  'COMMUNICATION_FAILURE',
  'CONTROLLER_OFFLINE',
  'DEVICE_OFFLINE',
]);

export const isOfflineNotificationType = (type: unknown): boolean =>
  typeof type === 'string' && OFFLINE_NOTIFICATION_TYPES.has(type);

export const isDeviceDetached = (device: TelemetryData, now = Date.now()): boolean => {
  if (!device.isOnline || device.connectivity === 'offline') return true;
  if (!device.lastUpdated) return true;
  const timestamp = parseUtcDate(device.lastUpdated).getTime();
  if (Number.isNaN(timestamp)) return true;
  return now - timestamp > DEVICE_OFFLINE_THRESHOLD_MS;
};

export const applyLiveConnectivity = (
  device: TelemetryData,
  now = Date.now(),
): TelemetryData => {
  if (!isDeviceDetached(device, now)) return device;
  if (!device.isOnline && device.connectivity === 'offline' && device.status === 'offline') {
    return device;
  }
  return {
    ...device,
    isOnline: false,
    connectivity: 'offline',
    status: 'offline',
  };
};
