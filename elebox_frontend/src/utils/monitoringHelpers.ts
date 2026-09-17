import type { SBox, TelemetryData } from '@/types';
import { mapHealthToDeviceStatus } from '@/utils/sboxMapper';

export const sboxToTelemetryPlaceholder = (box: SBox): TelemetryData => ({
  boxId: box.id,
  deviceId: box.boxIp,
  serialNumber: box.serialNo,
  deviceName: box.serialNo,
  ipAddress: box.boxIp,
  hookAValue: 0,
  hookBValue: 0,
  hookAPercent: 0,
  hookBPercent: 0,
  hookAThreshold: box.hookAThreshold ?? 50,
  hookBThreshold: box.hookBThreshold ?? 50,
  buckleStatus: 'unknown',
  connectivity: box.connectivity ?? 'offline',
  isOnline: box.isOnline ?? false,
  batteryLevel: 0,
  signalStrength: 0,
  status: mapHealthToDeviceStatus(box),
  locationName: box.locationName,
  workAreaName: box.workAreaName,
  lastUpdated: box.lastSeen ?? new Date().toISOString(),
});

export const mergeMonitoringDevices = (
  devices: TelemetryData[],
  sboxes: SBox[],
): TelemetryData[] => {
  const byBoxId = new Map(devices.map((device) => [device.boxId, device]));
  const ids = new Set<number>([
    ...sboxes.map((box) => box.id),
    ...devices.map((device) => device.boxId),
  ]);

  return Array.from(ids)
    .map((boxId) => {
      const live = byBoxId.get(boxId);
      const box = sboxes.find((item) => item.id === boxId);
      if (live) {
        if (!box) return live;
        return {
          ...live,
          hookAThreshold: box.hookAThreshold ?? live.hookAThreshold,
          hookBThreshold: box.hookBThreshold ?? live.hookBThreshold,
        };
      }
      return box ? sboxToTelemetryPlaceholder(box) : null;
    })
    .filter((item): item is TelemetryData => item !== null);
};
