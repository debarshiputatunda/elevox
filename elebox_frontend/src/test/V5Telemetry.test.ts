import { describe, expect, it } from 'vitest';
import { mapBackendTelemetry, type BackendTelemetrySnapshot } from '@/utils/telemetryMapper';

const base: BackendTelemetrySnapshot = {
  box_id: 1, device_id: 1, hook_a: 12000, hook_b: 12000,
  hook_a_percent: 100, hook_b_percent: 100, battery_percent: 80, battery_voltage: 4,
  buckle1: 0, buckle2: 0, buckle3: 0, alarm_active: false,
  connectivity: 'online', is_online: true, recorded_at: new Date().toISOString(),
  hook_a_threshold: 20000, hook_b_threshold: 20000,
};

describe('v5 monitoring', () => {
  it('preserves cause and device confirmation independently of saved limits', () => {
    const mapped = mapBackendTelemetry({ ...base, alarm_active: true, alarm_cause: 'BUCKLE',
      firmware_protocol: 'elevox-v5/1', threshold_sync: 'pending',
      device_threshold_a: 5000, device_threshold_b: 5000 });
    expect(mapped.alarmCause).toBe('BUCKLE');
    expect(mapped.thresholdSync).toBe('pending');
    expect(mapped.deviceThresholdA).toBe(5000);
    expect(mapped.hookAThreshold).toBe(20000);
  });
  it('never shows invalid sensors or an open buckle as normal', () => {
    expect(mapBackendTelemetry({...base, hook_a: -1, hook_a_valid: false}).status).toBe('violation');
    expect(mapBackendTelemetry({...base, buckle2: 1}).status).toBe('warning');
  });
});
