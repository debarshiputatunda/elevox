import { hookRangeAlarm, validHookAlarmRanges } from '@/utils/hookAlarmRanges';
import type { DeviceStatus, TelemetryData, TelemetryHistoryPoint } from '@/types';

export interface BackendTelemetrySnapshot {
  box_id: number;
  device_id: number;
  controller_name?: string | null;
  serial_no?: string | null;
  ip_address?: string | null;
  hook_a: number;
  hook_b: number;
  hook_a_percent: number;
  hook_b_percent: number;
  battery_percent: number;
  battery_voltage: number;
  buckle1: number;
  buckle2: number;
  buckle3: number;
  alarm_active: boolean;
  alarm_cause?: string;
  buckle_alarm_enabled?: boolean | null;
  hook_alarm_ranges?: TelemetryData['hookAlarmRanges'];
  hook_ranges_revision?: number;
  hook_raw_a?: number;
  hook_raw_b?: number;
  guard?: 'HIGH' | 'LOW' | 'FLOAT';
  sensing_mode?: number;
  sensing_name?: string;
  link?: number;
  mutual?: number;
  mutual_valid?: boolean;
  mutual_status?: TelemetryData['mutualStatus'];
  hook_observed_a?: number;
  hook_observed_b?: number;
  a_timeouts?: number;
  b_timeouts?: number;
  hook_sample_count?: number;
  hook_timeout_cycles?: number;
  firmware_protocol?: string;
  hook_a_valid?: boolean;
  hook_b_valid?: boolean;
  threshold_sync?: TelemetryData['thresholdSync'];
  device_threshold_a?: number | null;
  device_threshold_b?: number | null;
  connectivity: 'online' | 'offline';
  is_online: boolean;
  hook_a_threshold?: number | null;
  hook_b_threshold?: number | null;
  location_name?: string | null;
  work_area_name?: string | null;
  recorded_at: string;
}

export interface BackendTelemetryHistoryPoint {
  history_id: number;
  box_id: number;
  hook_a: number;
  hook_b: number;
  hook_a_percent: number;
  hook_b_percent: number;
  battery_percent: number;
  battery_voltage: number;
  buckle1: number;
  buckle2: number;
  buckle3: number;
  alarm_active: boolean;
  recorded_at: string;
}

const resolveBuckleStatus = (
  buckle1: number,
  buckle2: number,
  buckle3: number,
): TelemetryData['buckleStatus'] => {
  if ([buckle1, buckle2, buckle3].some((value) => value === 1)) {
    return 'unsecured';
  }
  if ([buckle1, buckle2, buckle3].every((value) => value === 0)) {
    return 'secured';
  }
  return 'unknown';
};

const resolveDeviceStatus = (snapshot: BackendTelemetrySnapshot): DeviceStatus => {
  if (!snapshot.is_online) return 'offline';
  if (snapshot.alarm_active || snapshot.hook_a_valid === false || snapshot.hook_b_valid === false
      || snapshot.hook_a < 0 || snapshot.hook_b < 0) return 'violation';
  if ([snapshot.buckle1, snapshot.buckle2, snapshot.buckle3].some((v) => v !== 0)) return 'warning';
  const hookAExceeded =
    snapshot.hook_a_threshold != null
    && snapshot.hook_a >= snapshot.hook_a_threshold;
  const hookBExceeded =
    snapshot.hook_b_threshold != null
    && snapshot.hook_b >= snapshot.hook_b_threshold;
  if (validHookAlarmRanges(snapshot.hook_alarm_ranges) ? hookRangeAlarm({ hookAlarmRanges: snapshot.hook_alarm_ranges, hookRawA: snapshot.hook_raw_a, hookRawB: snapshot.hook_raw_b, hookAValid: snapshot.hook_a_valid, hookBValid: snapshot.hook_b_valid }) : hookAExceeded || hookBExceeded) return 'warning';
  if (snapshot.battery_percent < 20) return 'warning';
  return 'normal';
};

export const mapBackendTelemetry = (data: BackendTelemetrySnapshot): TelemetryData => ({
  boxId: data.box_id,
  deviceId: String(data.device_id),
  serialNumber: data.serial_no ?? data.controller_name ?? `Box-${data.box_id}`,
  deviceName: data.controller_name ?? data.serial_no ?? `Box-${data.box_id}`,
  ipAddress: data.ip_address ?? '',
  hookAValue: data.hook_a,
  hookBValue: data.hook_b,
  hookAPercent: data.hook_a_percent,
  hookBPercent: data.hook_b_percent,
  hookAThreshold: data.hook_a_threshold ?? 3870,
  hookBThreshold: data.hook_b_threshold ?? 3870,
  buckle1: data.buckle1,
  buckle2: data.buckle2,
  buckle3: data.buckle3,
  buckleStatus: resolveBuckleStatus(data.buckle1, data.buckle2, data.buckle3),
  alarmActive: data.alarm_active,
  alarmCause: data.alarm_cause,
  buckleAlarmEnabled: data.buckle_alarm_enabled ?? null,
  hookAlarmRanges: validHookAlarmRanges(data.hook_alarm_ranges) ? data.hook_alarm_ranges : undefined,
  hookRangesRevision: data.hook_ranges_revision,
  hookRawA: data.hook_raw_a,
  hookRawB: data.hook_raw_b,
  guard: data.guard,
  sensingMode: data.sensing_mode,
  sensingName: data.sensing_name,
  link: data.link,
  mutual: data.mutual,
  mutualValid: data.mutual_valid,
  mutualStatus: data.mutual_status,
  hookObservedA: data.hook_observed_a,
  hookObservedB: data.hook_observed_b,
  aTimeouts: data.a_timeouts,
  bTimeouts: data.b_timeouts,
  hookSampleCount: data.hook_sample_count,
  hookTimeoutCycles: data.hook_timeout_cycles,
  firmwareProtocol: data.firmware_protocol,
  hookAValid: data.hook_alarm_ranges ? data.hook_a_valid === true : data.hook_a_valid ?? data.hook_a >= 0,
  hookBValid: data.hook_alarm_ranges ? data.hook_b_valid === true : data.hook_b_valid ?? data.hook_b >= 0,
  thresholdSync: data.threshold_sync,
  deviceThresholdA: data.device_threshold_a,
  deviceThresholdB: data.device_threshold_b,
  connectivity: data.connectivity,
  isOnline: data.is_online,
  batteryLevel: data.battery_percent,
  batteryVoltage: data.battery_voltage,
  signalStrength: data.is_online ? 100 : 0,
  status: resolveDeviceStatus(data),
  locationName: data.location_name ?? undefined,
  workAreaName: data.work_area_name ?? undefined,
  lastUpdated: data.recorded_at,
});

export const mapBackendTelemetryHistory = (
  data: BackendTelemetryHistoryPoint,
): TelemetryHistoryPoint => ({
  id: data.history_id,
  boxId: data.box_id,
  hookAValue: data.hook_a,
  hookBValue: data.hook_b,
  hookAPercent: data.hook_a_percent,
  hookBPercent: data.hook_b_percent,
  batteryLevel: data.battery_percent,
  batteryVoltage: data.battery_voltage,
  alarmActive: data.alarm_active,
  recordedAt: data.recorded_at,
});
