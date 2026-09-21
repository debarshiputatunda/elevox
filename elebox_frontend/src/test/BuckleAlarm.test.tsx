import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, expect, it, vi } from 'vitest';
import { BuckleAlarmControl } from '@/components/monitoring/BuckleAlarmControl';
import telemetry, { setDevices, setDeviceBuckleAlarm, updateDevice, fetchTelemetry } from '@/store/slices/telemetrySlice';
import monitoring, { setSafetyModeEnabled } from '@/store/slices/monitoringSlice';
import { mapBackendTelemetry } from '@/utils/telemetryMapper';
import { apiClient } from '@/api/client';
import { sboxService } from '@/services/sboxService';
import { useSafetyMonitor } from '@/hooks/useSafetyMonitor';
import { useSelector } from 'react-redux';
import { playAirRaidSiren } from '@/utils/airRaidSiren';
vi.mock('@/hooks/useTelemetryWebSocket', () => ({ useDeviceTelemetrySubscription: vi.fn() }));
vi.mock('@/utils/airRaidSiren', () => ({ playAirRaidSiren: vi.fn(), hasOpenBuckle: (...v: number[]) => v.includes(1) }));
const base = { box_id: 1, device_id: 1, controller_name: 'Elevox 1', hook_a: 100, hook_b: 100,
  hook_a_percent: 1, hook_b_percent: 1, battery_percent: 80, battery_voltage: 4,
  buckle1: 1, buckle2: 0, buckle3: 0, alarm_active: false, is_online: true,
  connectivity: 'online' as const, recorded_at: '2026-09-21T10:00:00Z', buckle_alarm_enabled: true };
const makeStore = () => configureStore({ reducer: { telemetry, monitoring } });
const mount = (extra = {}, canManage = true) => {
  const store = makeStore();
  store.dispatch(setDevices([mapBackendTelemetry({ ...base, ...extra })]));
  const Control = () => {
    const device = useSelector((s: ReturnType<typeof store.getState>) => s.telemetry.devices[0]);
    return <BuckleAlarmControl device={device} canManage={canManage} />;
  };
  render(<Provider store={store}><Control /></Provider>);
  return store;
};
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('keeps the reported value pending and only shows Off after device confirmation', async () => {
  let finish!: (v: unknown) => void;
  const patch = vi.spyOn(apiClient, 'patch').mockImplementation(() => new Promise(r => { finish = r; }));
  const store = mount();
  fireEvent.click(screen.getByRole('switch'));
  expect(screen.getByRole('switch')).toBeChecked();
  expect(screen.getByRole('switch')).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('waiting for device confirmation');
  expect(patch).toHaveBeenCalledWith('/sboxes/1/buckle-alarm', { enabled: false });
  await act(async () => { finish({ data: { enabled: false, confirmed: true, confirmed_at: '2026-09-21T10:00:01Z' } }); });
  expect(screen.getByRole('switch')).not.toBeChecked();
  expect(screen.getByRole('status')).toHaveTextContent('confirmed by device');
  act(() => { store.dispatch(updateDevice(mapBackendTelemetry(base))); });
  expect(screen.getByRole('switch')).not.toBeChecked();
  expect(store.getState().telemetry.devices[0].buckleStatus).toBe('unsecured');
  expect(store.getState().telemetry.devices[0].status).toBe('warning');
});
it('preserves On on failure and lets the user retry', async () => {
  const patch = vi.spyOn(apiClient, 'patch').mockRejectedValueOnce(new Error('Device unreachable'))
    .mockResolvedValue({ data: { enabled: false, confirmed: true } });
  mount();
  fireEvent.click(screen.getByRole('switch'));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Device unreachable'));
  expect(screen.getByRole('switch')).toBeChecked();
  fireEvent.click(screen.getByRole('switch'));
  await waitFor(() => expect(screen.getByRole('switch')).not.toBeChecked());
  expect(patch).toHaveBeenCalledTimes(2);
});
it.each([null, undefined])('does not interpret unsupported %s as Off', (enabled) => {
  mount({ buckle_alarm_enabled: enabled });
  expect(screen.getByRole('switch')).toBeDisabled();
  expect(screen.getByText('Unavailable')).toBeInTheDocument();
  expect(screen.queryByText('Off')).not.toBeInTheDocument();
});
it('shows last reported setting while offline', () => {
  mount({ is_online: false });
  expect(screen.getByRole('switch')).toBeDisabled();
  expect(screen.getByText(/Device offline/)).toBeInTheDocument();
});
it('explains missing permissions', () => {
  mount({}, false);
  expect(screen.getByRole('switch')).toBeDisabled();
  expect(screen.getByText(/permission is required/)).toBeInTheDocument();
});
it.each([{ enabled: false, confirmed: false }, { enabled: true, confirmed: true }, {}])('rejects unconfirmed or mismatched responses %s', async (data) => {
  vi.spyOn(apiClient, 'patch').mockResolvedValue({ data });
  await expect(sboxService.setBuckleAlarm(1, false)).rejects.toThrow('did not confirm');
});
it('guards cached list polls and accepts a later device-side change', async () => {
  const store = makeStore();
  store.dispatch(setDevices([mapBackendTelemetry(base)]));
  vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { enabled: false, confirmed: true, confirmed_at: '2026-09-21T10:00:01Z' } });
  await store.dispatch(setDeviceBuckleAlarm({ boxId: 1, enabled: false }));
  store.dispatch(fetchTelemetry.fulfilled([mapBackendTelemetry(base)], 'request', undefined));
  expect(store.getState().telemetry.devices[0].buckleAlarmEnabled).toBe(false);
  store.dispatch(updateDevice(mapBackendTelemetry({ ...base, recorded_at: '2026-09-21T10:00:02Z' })));
  expect(store.getState().telemetry.devices[0].buckleAlarmEnabled).toBe(true);
});
it('mutes browser buckle audio per device while local audio remains independently controlled', () => {
  const store = makeStore();
  store.dispatch(setSafetyModeEnabled(true));
  store.dispatch(setDevices([mapBackendTelemetry({ ...base, buckle_alarm_enabled: false })]));
  const Monitor = () => { useSafetyMonitor(); return null; };
  render(<Provider store={store}><Monitor /></Provider>);
  act(() => { store.dispatch(updateDevice(mapBackendTelemetry({ ...base, buckle_alarm_enabled: false }))); });
  expect(playAirRaidSiren).not.toHaveBeenCalled();
  act(() => { store.dispatch(updateDevice(mapBackendTelemetry(base))); });
  expect(playAirRaidSiren).toHaveBeenCalledTimes(1);
  act(() => { store.dispatch(setSafetyModeEnabled(false)); });
  act(() => { store.dispatch(updateDevice(mapBackendTelemetry(base))); });
  expect(playAirRaidSiren).toHaveBeenCalledTimes(1);
  expect(store.getState().telemetry.devices[0].buckleAlarmEnabled).toBe(true);
});
