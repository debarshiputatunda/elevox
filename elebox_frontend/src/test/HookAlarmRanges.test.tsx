import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider, useSelector } from 'react-redux';
import { afterEach, expect, it, vi } from 'vitest';
import { HookAlarmRangeControl } from '@/components/monitoring/HookAlarmRangeControl';
import { DEFAULT_HOOK_ALARM_RANGES as ranges, hookRangeAlarm, inHookAlarmRange, validHookAlarmRanges } from '@/utils/hookAlarmRanges';
import { mapBackendTelemetry } from '@/utils/telemetryMapper';
import telemetry, { setDevices, updateDevice } from '@/store/slices/telemetrySlice';
import { newerHookRevision, nextHookRevision } from '@/utils/hookAlarmRanges';
import { sboxService } from '@/services/sboxService';
import { apiClient } from '@/api/client';
const base = { box_id: 1, device_id: 1, hook_a: 50000, hook_b: 50000, hook_a_percent: 1, hook_b_percent: 1,
  battery_percent: 80, battery_voltage: 4, buckle1: 0, buckle2: 0, buckle3: 0, alarm_active: false,
  is_online: true, connectivity: 'online' as const, recorded_at: '2026-09-21T10:00:00Z',
  hook_alarm_ranges: ranges, hook_ranges_revision: 1, hook_a_valid: true, hook_b_valid: true, hook_raw_a: 5000, hook_raw_b: 5000 };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it.each([10, 1800, 10000, 1000000])('includes endpoint %s', value => expect(inHookAlarmRange(value, ranges.a)).toBe(true));
it.each([0, 9, 1801, 9999, 1000001, NaN])('excludes outside reading %s', value => expect(inHookAlarmRange(value, ranges.a)).toBe(false));
it('requires both raw readings, accepts different ranges, ignores smoothed legacy thresholds', () => {
  expect(mapBackendTelemetry(base).status).toBe('normal');
  expect(hookRangeAlarm(mapBackendTelemetry({ ...base, hook_raw_a: 10, hook_raw_b: 10000 }))).toBe(true);
  expect(hookRangeAlarm(mapBackendTelemetry({ ...base, hook_raw_a: 10, hook_raw_b: 5000 }))).toBe(false);
  expect(hookRangeAlarm(mapBackendTelemetry({ ...base, hook_raw_a: undefined, hook_raw_b: 10000 }))).toBe(false);
  expect(hookRangeAlarm(mapBackendTelemetry({ ...base, hook_raw_a: 10, hook_raw_b: 10000, hook_a_valid: false }))).toBe(false);
});
it('rejects overlaps, inverted ranges and invalid bounds', () => {
  expect(validHookAlarmRanges(ranges)).toBe(true);
  for (const a of [[[10, 20], [20, 30]], [[20, 10], [30, 40]], [[-1, 20], [30, 40]], [[1.5, 20], [30, 40]], [[1, 20], [30, 1000001]]]) expect(validHookAlarmRanges({ ...ranges, a })).toBe(false);
});
const mount = () => {
  const store = configureStore({ reducer: { telemetry } });
  store.dispatch(setDevices([mapBackendTelemetry(base)]));
  const View = () => <HookAlarmRangeControl device={useSelector((state: ReturnType<typeof store.getState>) => state.telemetry.devices[0])} canManage />;
  render(<Provider store={store}><View /></Provider>);
  return store;
};
it('edits all bounds, waits for ACK, protects against delayed telemetry, syncs newer device changes', async () => {
  let finish!: (value: unknown) => void;
  const patch = vi.spyOn(apiClient, 'patch').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const store = mount();
  expect(screen.getAllByRole('spinbutton')).toHaveLength(8);
  fireEvent.change(screen.getByLabelText('Hook A range 1 minimum'), { target: { value: '11' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save ranges' }));
  expect(screen.getByRole('button', { name: 'Waiting for device…' })).toBeDisabled();
  expect(store.getState().telemetry.devices[0].hookAlarmRanges?.a[0][0]).toBe(10);
  const next = { ...ranges, a: [[11, 1800], [10000, 1000000]] };
  expect(patch).toHaveBeenCalledWith('/sboxes/1/hook-ranges', { ...next, expected_revision: 1 });
  await act(async () => finish({ data: { confirmed: true, confirmed_at: '2026-09-21T10:00:01Z', hook_alarm_ranges: next, hook_ranges_revision: 2 } }));
  act(() => store.dispatch(updateDevice(mapBackendTelemetry(base))));
  expect(screen.getByLabelText('Hook A range 1 minimum')).toHaveValue(11);
  act(() => store.dispatch(updateDevice(mapBackendTelemetry({ ...base, hook_ranges_revision: 3, recorded_at: '2026-09-21T10:00:02Z' }))));
  expect(screen.getByLabelText('Hook A range 1 minimum')).toHaveValue(10);
});
it('preserves failed edits for retry and blocks invalid or conflicted edits', async () => {
  vi.spyOn(apiClient, 'patch').mockRejectedValue(new Error('Device offline'));
  const store = mount();
  fireEvent.change(screen.getByLabelText('Hook B range 2 maximum'), { target: { value: '' } });
  expect(screen.getByRole('button', { name: 'Save ranges' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Hook B range 2 maximum'), { target: { value: '999999' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save ranges' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Device offline'));
  expect(screen.getByLabelText('Hook B range 2 maximum')).toHaveValue(999999);
  act(() => store.dispatch(updateDevice(mapBackendTelemetry({ ...base, hook_ranges_revision: 2, recorded_at: '2026-09-21T10:00:03Z' }))));
  expect(screen.getByRole('button', { name: 'Save ranges' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Reload device settings' }));
  expect(screen.getByLabelText('Hook B range 2 maximum')).toHaveValue(1000000);
});

it('does not roll back newer settings when an older successful ACK arrives late', async () => {
  let finish!: (value: unknown) => void;
  vi.spyOn(apiClient, 'patch').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const store = mount();
  fireEvent.change(screen.getByLabelText('Hook A range 1 minimum'), { target: { value: '11' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save ranges' }));
  act(() => store.dispatch(updateDevice(mapBackendTelemetry({ ...base, hook_ranges_revision: 3, recorded_at: '2026-09-21T10:00:03Z' }))));
  const next = { ...ranges, a: [[11, 1800], [10000, 1000000]] };
  await act(async () => finish({ data: { confirmed: true, confirmed_at: '2026-09-21T10:00:04Z', hook_alarm_ranges: next, hook_ranges_revision: 2 } }));
  act(() => store.dispatch(updateDevice(mapBackendTelemetry({ ...base, hook_ranges_revision: 3, recorded_at: '2026-09-21T10:00:03Z' }))));
  expect(screen.getByLabelText('Hook A range 1 minimum')).toHaveValue(10);
});

it('handles uint32 revision wrap and rejects stale pre-wrap telemetry', () => {
  expect(nextHookRevision(0xffffffff)).toBe(1);
  expect(newerHookRevision(1, 0xffffffff)).toBe(true);
  expect(newerHookRevision(0xffffffff, 1)).toBe(false);
  const store = configureStore({ reducer: { telemetry } });
  store.dispatch(setDevices([mapBackendTelemetry({ ...base, hook_ranges_revision: 0xffffffff })]));
  store.dispatch(updateDevice(mapBackendTelemetry({ ...base, hook_ranges_revision: 1, recorded_at: '2026-09-21T10:00:01Z' })));
  expect(store.getState().telemetry.devices[0].hookRangesRevision).toBe(1);
  store.dispatch(updateDevice(mapBackendTelemetry({ ...base, hook_ranges_revision: 0xffffffff, recorded_at: '2026-09-21T10:00:02Z' })));
  expect(store.getState().telemetry.devices[0].hookRangesRevision).toBe(1);
});
it.each([0xffffffff, 1])('accepts no-op or wrap ACK revision %s', async revision => {
  vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { confirmed: true, hook_alarm_ranges: ranges, hook_ranges_revision: revision } });
  await expect(sboxService.setHookRanges(1, ranges, 0xffffffff)).resolves.toHaveProperty('hook_ranges_revision', revision);
});
it.each([0, -1, 2, 0x100000000, 1.5])('rejects invalid or skipped wrap ACK revision %s', async revision => {
  vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { confirmed: true, hook_alarm_ranges: ranges, hook_ranges_revision: revision } });
  await expect(sboxService.setHookRanges(1, ranges, 0xffffffff)).rejects.toThrow('did not confirm');
});
it('requires explicit raw validity flags for range alarms', () => {
  expect(hookRangeAlarm(mapBackendTelemetry({ ...base, hook_raw_a: 10, hook_raw_b: 10, hook_a_valid: undefined }))).toBe(false);
});
