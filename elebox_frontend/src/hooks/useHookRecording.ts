import { useCallback, useEffect, useRef, useState } from 'react';
import { useSnackbar } from 'notistack';
import type { TelemetryData } from '@/types';
import {
  downloadHookRecording,
  type HookRecordingSample,
} from '@/utils/hookRecordingExport';

export const HOOK_RECORDING_INTERVALS = [1, 2, 5, 10] as const;
export type HookRecordingInterval = (typeof HOOK_RECORDING_INTERVALS)[number];

const MAX_SAMPLES = 10_000;

export interface HookRecordingThresholds {
  hookA: number;
  hookB: number;
}

const toSample = (
  device: TelemetryData,
  thresholds: HookRecordingThresholds,
): HookRecordingSample => ({
  timestamp: new Date().toLocaleString(),
  boxId: device.boxId,
  deviceName: device.deviceName,
  serialNumber: device.serialNumber,
  hookAValue: device.hookAValue,
  hookAPercent: device.hookAPercent,
  hookAThreshold: thresholds.hookA,
  hookBValue: device.hookBValue,
  hookBPercent: device.hookBPercent,
  hookBThreshold: thresholds.hookB,
  online: device.isOnline,
});

export const useHookRecording = (
  device: TelemetryData | undefined,
  thresholds: HookRecordingThresholds,
) => {
  const { enqueueSnackbar } = useSnackbar();
  const [isRecording, setIsRecording] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const [intervalSec, setIntervalSec] = useState<HookRecordingInterval>(1);

  const deviceRef = useRef<TelemetryData | undefined>(device);
  const thresholdsRef = useRef<HookRecordingThresholds>(thresholds);
  const samplesRef = useRef<HookRecordingSample[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const serialRef = useRef<string>('sbox');

  useEffect(() => {
    deviceRef.current = device;
    if (device?.serialNumber) serialRef.current = device.serialNumber;
  }, [device]);

  useEffect(() => {
    thresholdsRef.current = thresholds;
  }, [thresholds]);

  const appendSample = useCallback(() => {
    const current = deviceRef.current;
    if (!current) return;
    if (samplesRef.current.length >= MAX_SAMPLES) return;
    samplesRef.current.push(toSample(current, thresholdsRef.current));
    setSampleCount(samplesRef.current.length);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (timerRef.current !== null) return;
    samplesRef.current = [];
    setSampleCount(0);
    setIsRecording(true);
    appendSample();
    timerRef.current = setInterval(appendSample, intervalSec * 1000);
  }, [appendSample, intervalSec]);

  const finish = useCallback(
    (notify: boolean) => {
      clearTimer();
      const samples = samplesRef.current;
      setIsRecording(false);
      if (samples.length === 0) {
        if (notify) {
          enqueueSnackbar('No hook samples recorded', { variant: 'warning' });
        }
        return;
      }
      downloadHookRecording(samples, serialRef.current);
      if (notify) {
        enqueueSnackbar(`${samples.length} samples saved`, { variant: 'success' });
      }
      samplesRef.current = [];
    },
    [clearTimer, enqueueSnackbar],
  );

  const stop = useCallback(() => finish(true), [finish]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        finish(false);
      }
    },
    [finish],
  );

  return {
    isRecording,
    sampleCount,
    intervalSec,
    setIntervalSec,
    start,
    stop,
  };
};
