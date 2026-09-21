import type { TelemetryData } from '@/types';
export type HookRanges = [[number, number], [number, number]];
export interface HookAlarmRanges { a: HookRanges; b: HookRanges }
export const DEFAULT_HOOK_ALARM_RANGES: HookAlarmRanges = { a: [[10, 1800], [10000, 1000000]], b: [[10, 1800], [10000, 1000000]] };
export const validHookAlarmRanges = (value: unknown): value is HookAlarmRanges => {
  if (!value || typeof value !== 'object') return false;
  return ['a', 'b'].every((key) => {
    const ranges = (value as Record<string, unknown>)[key];
    return Array.isArray(ranges) && ranges.length === 2 && ranges.every((range) =>
      Array.isArray(range) && range.length === 2 && range.every((n) => Number.isInteger(n) && n >= 0 && n <= 1000000) && range[0] <= range[1]) && ranges[0][1] < ranges[1][0];
  });
};
export const inHookAlarmRange = (value: number | undefined, ranges: HookRanges): boolean =>
  typeof value === 'number' && Number.isFinite(value) && ranges.some(([min, max]) => value >= min && value <= max);
export const hookRangeAlarm = (device: Pick<TelemetryData, 'hookAlarmRanges' | 'hookRawA' | 'hookRawB' | 'hookAValid' | 'hookBValid'>): boolean =>
  Boolean(device.hookAlarmRanges && device.hookAValid === true && device.hookBValid === true &&
    inHookAlarmRange(device.hookRawA, device.hookAlarmRanges.a) && inHookAlarmRange(device.hookRawB, device.hookAlarmRanges.b));

/** RFC 1982 comparison for the device's wrapping, nonzero uint32 revision. */
export const validHookRevision = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 0xffffffff;
export const nextHookRevision = (revision: number): number => revision === 0xffffffff ? 1 : revision + 1;
export const newerHookRevision = (candidate: number | undefined, current: number | undefined): boolean => {
  if (!validHookRevision(candidate)) return false;
  if (!validHookRevision(current)) return true;
  const distance = (candidate - current) >>> 0;
  return distance > 0 && distance < 0x80000000;
};
