import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { monitoringService } from '@/services/monitoringService';

export interface HookLoadSample {
  t: number;
  hookA: number;
  hookB: number;
}

const WINDOW_MS = 60_000;
const LIVE_SAMPLE_INTERVAL_MS = 1_000;

export const useHookLoadTrend = (
  boxId: number | undefined,
  hookA: number,
  hookB: number,
  isOnline: boolean,
) => {
  const [liveSamples, setLiveSamples] = useState<HookLoadSample[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const lastLiveSampleRef = useRef(0);

  const { data: historySamples = [], isLoading } = useQuery({
    queryKey: ['hook-load-history', boxId],
    queryFn: async () => {
      const end = new Date();
      const start = new Date(end.getTime() - WINDOW_MS);
      const history = await monitoringService.getHistory(boxId!, {
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        limit: 20,
      });
      return history
        .map((point) => ({
          t: new Date(point.recordedAt).getTime(),
          hookA: point.hookAValue,
          hookB: point.hookBValue,
        }))
        .filter((point) => Number.isFinite(point.t));
    },
    enabled: Boolean(boxId),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    setLiveSamples([]);
    lastLiveSampleRef.current = 0;
  }, [boxId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isOnline) return undefined;

    const appendSample = () => {
      const timestamp = Date.now();
      if (timestamp - lastLiveSampleRef.current < LIVE_SAMPLE_INTERVAL_MS) return;
      lastLiveSampleRef.current = timestamp;
      const cutoff = timestamp - WINDOW_MS;
      setLiveSamples((prev) => [
        ...prev.filter((sample) => sample.t >= cutoff),
        { t: timestamp, hookA, hookB },
      ]);
    };

    appendSample();
    const interval = setInterval(appendSample, LIVE_SAMPLE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [hookA, hookB, isOnline]);

  const samples = useMemo(() => {
    const cutoff = now - WINDOW_MS;
    const merged = new Map<number, HookLoadSample>();
    for (const sample of historySamples) {
      if (sample.t >= cutoff) merged.set(sample.t, sample);
    }
    for (const sample of liveSamples) {
      if (sample.t >= cutoff) merged.set(sample.t, sample);
    }
    return [...merged.values()].sort((a, b) => a.t - b.t);
  }, [historySamples, liveSamples, now]);

  return {
    samples,
    now,
    isLoading: Boolean(boxId) && isLoading && samples.length === 0,
  };
};
