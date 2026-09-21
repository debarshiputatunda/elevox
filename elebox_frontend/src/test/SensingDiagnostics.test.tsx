import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { SensingSummary } from '@/components/monitoring/SensingSummary';
import { HookInfoCard } from '@/components/monitoring/HookInfoCard';
import { HOOK_CONFIG, getHookState } from '@/constants/harnessBuckles';
import { HookSensorCard } from '@/components/monitoring/HookSensorCard';
import { mapBackendTelemetry, type BackendTelemetrySnapshot } from '@/utils/telemetryMapper';
const snapshot: BackendTelemetrySnapshot = {
  box_id: 1, device_id: 1, hook_a: -1, hook_b: 400, hook_a_percent: 0, hook_b_percent: 10,
  battery_percent: 80, battery_voltage: 4, buckle1: 0, buckle2: 0, buckle3: 0,
  alarm_active: false, is_online: true, connectivity: 'online', recorded_at: '2026-09-21T00:00:00Z',
  guard: 'HIGH', sensing_mode: 1, sensing_name: 'Self capacitance', link: 92, mutual: 128,
  mutual_valid: true, mutual_status: 'ok', hook_observed_a: 423, hook_observed_b: 400,
  a_timeouts: 3, b_timeouts: 0, hook_sample_count: 16, hook_timeout_cycles: 800000,
  hook_a_valid: false, hook_b_valid: true,
};
afterEach(cleanup);
it('maps diagnostics without promoting invalid observations to valid or safe readings', () => {
  const device = mapBackendTelemetry(snapshot);
  expect(device).toMatchObject({ hookObservedA: 423, aTimeouts: 3, hookAValid: false, hookAValue: -1, status: 'violation', guard: 'HIGH', sensingMode: 1, link: 92, mutualValid: true });
  render(<SensingSummary device={device} isOnline />);
  expect(screen.getByText('92')).toBeInTheDocument();
  expect(screen.getByText('128')).toBeInTheDocument();
  expect(screen.getByText(/Active guard: HIGH/)).toHaveTextContent('Self capacitance');
});
it.each(['reset_timeout', 'rise_timeout', 'below_resolution', 'waiting'] as const)('shows unavailable reason for %s', (mutual_status) => {
  render(<SensingSummary device={mapBackendTelemetry({ ...snapshot, link: 0, mutual: 0, mutual_valid: false, mutual_status })} isOnline />);
  expect(screen.queryByText('0')).not.toBeInTheDocument();
  expect(screen.getByText({ reset_timeout: 'Reset timeout', rise_timeout: 'Rise timeout', below_resolution: 'Below resolution', waiting: 'Waiting for coupling measurement' }[mutual_status])).toBeInTheDocument();
});
it('shows partial samples while retaining invalid status', () => {
  render(<HookSensorCard label="Hook A" rangeMode currentLoad={-1} rawValue={-1} valid={false} observedValue={423} timeouts={3} threshold={0} exceeded={false} />);
  expect(screen.getByText('423')).toBeInTheDocument();
  expect(screen.getByText(/Partial\/invalid observation/)).toHaveTextContent('Timeouts: 3/16');
  expect(screen.getByText('INVALID')).toBeInTheDocument();
  expect(screen.queryByText('NORMAL')).not.toBeInTheDocument();
});
it('shows an all-timeout lower bound rather than an exact measurement', () => {
  render(<HookSensorCard label="Hook A" rangeMode currentLoad={-1} valid={false} observedValue={-1} timeouts={16} threshold={0} exceeded />);
  expect(screen.getByText('≥800000')).toBeInTheDocument();
  expect(screen.getByText('Timeout bound (cycles)')).toBeInTheDocument();
  expect(screen.getByText(/Timeout — no finite reading/)).toHaveTextContent('Timeouts: 16/16');
});
it('preserves valid smoothed and raw readings', () => {
  render(<HookSensorCard label="Hook B" rangeMode currentLoad={400} rawValue={405} valid observedValue={999} timeouts={0} threshold={0} exceeded={false} />);
  expect(screen.getByText('400')).toBeInTheDocument();
  expect(screen.getByText('405')).toBeInTheDocument();
  expect(screen.queryByText('999')).not.toBeInTheDocument();
});
it('shows the recorded coupling timeout bound and below-resolution raw zero', () => {
  const view = render(<SensingSummary device={mapBackendTelemetry({ ...snapshot, mutual: 12000, mutual_valid: false, mutual_status: 'rise_timeout' })} isOnline />);
  expect(screen.getByText('≥12000 · Rise timeout')).toBeInTheDocument();
  view.rerender(<SensingSummary device={mapBackendTelemetry({ ...snapshot, mutual: 0, link: 0, mutual_valid: false, mutual_status: 'below_resolution' })} isOnline />);
  expect(screen.getByText('0 · Below resolution')).toBeInTheDocument();
  expect(screen.getByText('Below resolution')).toBeInTheDocument();
});

it('never labels an invalid hardware hook normal, including positive invalid samples', () => {
  render(<HookInfoCard config={HOOK_CONFIG[0]} currentLoad={423} invalid exceeded={false} />);
  expect(screen.getByText('INVALID')).toBeInTheDocument();
  expect(screen.queryByText('NORMAL')).not.toBeInTheDocument();
  expect(screen.getByText('Invalid hook measurement. See sensing diagnostics.')).toBeInTheDocument();
  expect(getHookState(false, false, true)).toBe('unknown');
  expect(getHookState(true, false, true)).toBe('offline');
});
