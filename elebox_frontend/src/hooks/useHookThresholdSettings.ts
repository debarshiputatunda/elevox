import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sboxService } from '@/services/sboxService';
import { thresholdToRaw } from '@/utils/hookThreshold';
import type { TelemetryData } from '@/types';

type Thresholds = { hookA: number; hookB: number };
type SaveState = 'saved' | 'saving' | 'error';

/** Debounce user edits, never live readings; serialize writes for each box. */
export const useHookThresholdSettings = (device?: TelemetryData) => {
  const queryClient = useQueryClient();
  const values = useRef<Record<number, Thresholds>>({});
  const dirty = useRef<Record<number, Partial<Thresholds>>>({});
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const revisions = useRef<Record<number, number>>({});
  const mounted = useRef(true);
  const [drafts, setDrafts] = useState<Record<number, Thresholds>>({});
  const [states, setStates] = useState<Record<number, SaveState>>({});

  const persist = useCallback((boxId: number) => {
    const thresholds = { ...dirty.current[boxId] };
    if (!Object.keys(thresholds).length) return;
    const revision = revisions.current[boxId];
    // The service serializes writes even across page remounts.
    void (async () => {
      try {
        const saved = await sboxService.updateThresholds(boxId, thresholds);
        if (mounted.current && revisions.current[boxId] === revision) {
          dirty.current[boxId] = {};
          const confirmed = { hookA: saved.hookAThreshold ?? values.current[boxId].hookA,
            hookB: saved.hookBThreshold ?? values.current[boxId].hookB };
          values.current[boxId] = confirmed;
          setDrafts((previous) => ({ ...previous, [boxId]: confirmed }));
          setStates((previous) => ({ ...previous, [boxId]: 'saved' }));
        }
        void queryClient.invalidateQueries({ queryKey: ['sboxes'] });
      } catch {
        if (mounted.current && revisions.current[boxId] === revision) {
          setStates((previous) => ({ ...previous, [boxId]: 'error' }));
        }
      }
    })();
  }, [queryClient]);

  useEffect(() => {
    mounted.current = true;
    const pending = timers.current;
    return () => {
      mounted.current = false;
      // Navigation must not silently discard a user's last edit.
      pending.forEach((timer, boxId) => {
        clearTimeout(timer);
        persist(boxId);
      });
      pending.clear();
    };
  }, [persist]);

  // Once telemetry confirms our save, release the draft so subsequent server
  // changes (including edits from another browser) remain visible.
  useEffect(() => {
    if (!device || states[device.boxId] !== 'saved') return;
    const draft = values.current[device.boxId];
    if (draft && draft.hookA === device.hookAThreshold && draft.hookB === device.hookBThreshold) {
      delete values.current[device.boxId];
      setDrafts((previous) => {
        const next = { ...previous }; delete next[device.boxId]; return next;
      });
    }
  }, [device?.boxId, device?.hookAThreshold, device?.hookBThreshold, states]);

  const current = device ? drafts[device.boxId] ?? {
    hookA: thresholdToRaw(device.hookAThreshold),
    hookB: thresholdToRaw(device.hookBThreshold),
  } : { hookA: thresholdToRaw(null), hookB: thresholdToRaw(null) };

  const schedule = (boxId: number) => {
    clearTimeout(timers.current.get(boxId));
    setStates((previous) => ({ ...previous, [boxId]: 'saving' }));
    timers.current.set(boxId, setTimeout(() => {
      timers.current.delete(boxId);
      persist(boxId);
    }, 600));
  };

  const setThreshold = (hook: keyof Thresholds, value: number) => {
    if (!device) return;
    const boxId = device.boxId;
    const next = { ...(values.current[boxId] ?? current), [hook]: value };
    values.current[boxId] = next;
    dirty.current[boxId] = { ...dirty.current[boxId], [hook]: value };
    revisions.current[boxId] = (revisions.current[boxId] ?? 0) + 1;
    setDrafts((previous) => ({ ...previous, [boxId]: next }));
    schedule(boxId);
  };

  return {
    thresholds: current,
    setThreshold,
    saveState: device ? states[device.boxId] ?? 'saved' : 'saved',
    retry: () => { if (device && values.current[device.boxId]) schedule(device.boxId); },
  };
};
