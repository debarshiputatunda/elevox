import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MonitoringPage } from '@/pages/monitoring/MonitoringPage';
import { store } from '@/store';
import { setDevices, updateDevice } from '@/store/slices/telemetrySlice';
import { mapBackendTelemetry } from '@/utils/telemetryMapper';
import { apiClient } from '@/api/client';

// Only replace the expensive 3D child; exercise the real page, Redux and REST service.
vi.mock('@/components/monitoring/DeviceMonitoringCard', () => ({
  DeviceMonitoringCard: (props: {
    hookAThreshold: number; hookBThreshold: number;
    onHookAThresholdChange: (value: number) => void;
    onHookBThresholdChange: (value: number) => void;
  }) => <>
    <output aria-label="Hook A">{props.hookAThreshold}</output>
    <output aria-label="Hook B">{props.hookBThreshold}</output>
    <button onClick={() => props.onHookAThresholdChange(20000)}>Raise A</button>
    <button onClick={() => props.onHookBThresholdChange(20000)}>Raise B</button>
  </>,
}));

const snapshot = {
  box_id: 1, device_id: 1, serial_no: 'TEST-1', controller_name: 'TEST-1',
  hook_a: 12000, hook_b: 12000, hook_a_percent: 100, hook_b_percent: 100,
  hook_a_threshold: 3870, hook_b_threshold: 3870,
  battery_percent: 80, battery_voltage: 4, buckle1: 0, buckle2: 0, buckle3: 0,
  alarm_active: false, is_online: true, connectivity: 'online' as const,
  recorded_at: new Date().toISOString(),
};

beforeEach(() => {
  vi.useFakeTimers();
  store.dispatch(setDevices([mapBackendTelemetry(snapshot)]));
  vi.spyOn(apiClient, 'get').mockImplementation(async (url) => ({
    data: url === '/monitoring/telemetry' ? [snapshot] : [],
  }));
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

const mount = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(<Provider store={store}>
    <QueryClientProvider client={client}><SnackbarProvider>
      <MemoryRouter initialEntries={['/monitoring?boxId=1']}><MonitoringPage /></MemoryRouter>
    </SnackbarProvider></QueryClientProvider>
  </Provider>);
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  return result;
};

it('persists edited thresholds while telemetry arrives every 150 ms', async () => {
  const patch = vi.spyOn(apiClient, 'patch').mockImplementation(async (_url, body) => ({
    data: { box_id: 1, ...(body as Record<string, number>) },
  }));
  await mount();
  fireEvent.click(screen.getByText('Raise A'));
  fireEvent.click(screen.getByText('Raise B'));
  for (let tick = 0; tick < 8; tick += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
      store.dispatch(updateDevice(mapBackendTelemetry({ ...snapshot,
        recorded_at: new Date().toISOString(), hook_a: 12000 + tick,
      })));
    });
  }
  expect(patch).toHaveBeenCalledWith('/sboxes/1/thresholds', {
    hookA_threshold: 20000, hookB_threshold: 20000,
  });
});

it('preserves an explicitly saved zero threshold on load', async () => {
  const zero = { ...snapshot, hook_a_threshold: 0, hook_b_threshold: 0 };
  store.dispatch(setDevices([mapBackendTelemetry(zero)]));
  vi.mocked(apiClient.get).mockResolvedValue({ data: [zero] });
  await mount();
  expect(screen.getByLabelText('Hook A')).toHaveTextContent(/^0$/);
});

it('serializes successive edits so a slow earlier save cannot overwrite the latest values', async () => {
  let finishFirst!: () => void;
  const first = new Promise<void>((resolve) => { finishFirst = resolve; });
  let stored = { hookA_threshold: 3870, hookB_threshold: 3870 };
  let count = 0;
  vi.spyOn(apiClient, 'patch').mockImplementation(async (_url, body) => {
    count += 1;
    if (count === 1) await first;
    stored = { ...stored, ...Object.fromEntries(Object.entries(body as object).filter(([,v]) => v !== undefined)) };
    return { data: { box_id: 1, ...stored } };
  });
  await mount();
  fireEvent.click(screen.getByText('Raise A'));
  await act(async () => { await vi.advanceTimersByTimeAsync(650); });
  fireEvent.click(screen.getByText('Raise B'));
  await act(async () => { await vi.advanceTimersByTimeAsync(650); });
  expect(count).toBe(1);
  await act(async () => { finishFirst(); await vi.advanceTimersByTimeAsync(1); });
  expect(stored).toEqual({ hookA_threshold: 20000, hookB_threshold: 20000 });
});

it('shows a failed save and allows retrying it', async () => {
  vi.spyOn(apiClient, 'patch').mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ data: { box_id: 1, hookA_threshold: 20000, hookB_threshold: 3870 } });
  await mount();
  fireEvent.click(screen.getByText('Raise A'));
  await act(async () => { await vi.advanceTimersByTimeAsync(650); });
  expect(screen.getByText(/Thresholds not saved/)).toBeInTheDocument();
  fireEvent.click(screen.getByText('Retry'));
  await act(async () => { await vi.advanceTimersByTimeAsync(650); });
  expect(screen.getByText('Thresholds saved')).toBeInTheDocument();
});

it('flushes the last edit when navigating away before the debounce ends', async () => {
  const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { box_id: 1 } });
  const page = await mount();
  fireEvent.click(screen.getByText('Raise A'));
  page.unmount();
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(patch).toHaveBeenCalledWith('/sboxes/1/thresholds', {
    hookA_threshold: 20000, hookB_threshold: undefined,
  });
});

it('keeps save ordering when the monitoring page remounts during a slow request', async () => {
  let finishFirst!: () => void;
  const first = new Promise<void>((resolve) => { finishFirst = resolve; });
  let count = 0;
  let stored = { hookA_threshold: 3870, hookB_threshold: 3870 };
  vi.spyOn(apiClient, 'patch').mockImplementation(async (_url, body) => {
    count += 1;
    if (count === 1) await first;
    stored = { ...stored, ...Object.fromEntries(Object.entries(body as object).filter(([,v]) => v !== undefined)) };
    return { data: { box_id: 1, ...stored } };
  });
  const oldPage = await mount();
  fireEvent.click(screen.getByText('Raise A'));
  await act(async () => { await vi.advanceTimersByTimeAsync(650); });
  oldPage.unmount();
  await mount();
  fireEvent.click(screen.getByText('Raise B'));
  await act(async () => { await vi.advanceTimersByTimeAsync(650); });
  // Finish both before asserting so a failed test cannot leave a pending queue.
  await act(async () => { finishFirst(); await vi.advanceTimersByTimeAsync(1); });
  expect(stored).toEqual({ hookA_threshold: 20000, hookB_threshold: 20000 });
});


it('accepts an external threshold change even if telemetry skipped the saved value', async () => {
  const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({
    data: { box_id: 1, hookA_threshold: 20000, hookB_threshold: 3870 },
  });
  await mount();
  fireEvent.click(screen.getByText('Raise A'));
  await act(async () => { await vi.advanceTimersByTimeAsync(650); });
  // Repeated old telemetry must not undo our successful save.
  act(() => { store.dispatch(updateDevice(mapBackendTelemetry(snapshot))); });
  expect(screen.getByLabelText('Hook A')).toHaveTextContent(/^20000$/);
  act(() => { store.dispatch(updateDevice(mapBackendTelemetry({ ...snapshot,
    hook_a_threshold: 0, hook_b_threshold: 4321,
  }))); });
  expect(screen.getByLabelText('Hook A')).toHaveTextContent(/^0$/);
  expect(screen.getByLabelText('Hook B')).toHaveTextContent(/^4321$/);
  expect(patch).toHaveBeenCalledTimes(1);
});

it('protects unsaved edits and in-flight saves from incoming thresholds', async () => {
  let finish!: (value: unknown) => void;
  const patch = vi.spyOn(apiClient, 'patch').mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  await mount();
  fireEvent.click(screen.getByText('Raise A'));
  act(() => { store.dispatch(updateDevice(mapBackendTelemetry({ ...snapshot, hook_a_threshold: 0 }))); });
  expect(screen.getByLabelText('Hook A')).toHaveTextContent(/^20000$/);
  await act(async () => { await vi.advanceTimersByTimeAsync(650); });
  act(() => { store.dispatch(updateDevice(mapBackendTelemetry({ ...snapshot, hook_a_threshold: 4500 }))); });
  expect(screen.getByLabelText('Hook A')).toHaveTextContent(/^20000$/);
  await act(async () => { finish({ data: { box_id: 1, hookA_threshold: 20000, hookB_threshold: 3870 } }); });
  expect(screen.getByLabelText('Hook A')).toHaveTextContent(/^20000$/);
  expect(patch).toHaveBeenCalledTimes(1);
});
