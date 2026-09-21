import { act, renderHook, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useHookLoadTrend } from '@/components/monitoring/hooks/useHookLoadTrend';
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: [], isLoading: false }) }));
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('captures changed live values in 100ms and bounds the buffer to sixty seconds', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-21T10:00:00Z'));
  const { result, rerender } = renderHook(({ a }) => useHookLoadTrend(1, a, 500, true), { initialProps: { a: 100 } });
  expect(result.current.samples[result.current.samples.length - 1]?.hookA).toBe(100);
  act(() => vi.advanceTimersByTime(100));
  rerender({ a: 200 });
  act(() => vi.advanceTimersByTime(100));
  expect(result.current.samples[result.current.samples.length - 1]?.hookA).toBe(200);
  expect(result.current.samples[result.current.samples.length - 1]!.t - result.current.samples[0].t).toBe(200);
  act(() => vi.advanceTimersByTime(61000));
  expect(result.current.samples.length).toBeLessThanOrEqual(601);
  expect(result.current.samples.every(sample => sample.t >= Date.now() - 60000)).toBe(true);
});
