import { useEffect, useMemo, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { addMonitoringEvent } from '@/store/slices/monitoringSlice';
import { useDeviceTelemetrySubscription } from '@/hooks/useTelemetryWebSocket';
import { hasOpenBuckle, playAirRaidSiren } from '@/utils/airRaidSiren';

interface BuckleSnapshot {
  buckle1?: number;
  buckle2?: number;
  buckle3?: number;
  alarmActive?: boolean;
}

const buckleLabel = (index: number, value?: number) => {
  if (value === 0) return `Buckle ${index} secured`;
  if (value === 1) return `Buckle ${index} UNLATCHED`;
  return `Buckle ${index} status changed`;
};

/** Monitors all S-Boxes globally when safety mode is enabled. */
export const useSafetyMonitor = () => {
  const dispatch = useAppDispatch();
  const safetyModeEnabled = useAppSelector((state) => state.monitoring.safetyModeEnabled);
  const devices = useAppSelector((state) => state.telemetry.devices);
  const safetyBoxIds = useMemo(
    () => (safetyModeEnabled ? devices.map((device) => device.boxId) : []),
    [devices, safetyModeEnabled],
  );
  useDeviceTelemetrySubscription('safety-monitor', safetyBoxIds);
  const previousStatesRef = useRef<Record<number, BuckleSnapshot>>({});
  const initializedRef = useRef(false);

  useEffect(() => {
    if (devices.length === 0) {
      return;
    }

    devices.forEach((device) => {
      const previous = previousStatesRef.current[device.boxId];
      const current: BuckleSnapshot = {
        buckle1: device.buckle1,
        buckle2: device.buckle2,
        buckle3: device.buckle3,
        alarmActive: device.alarmActive,
      };

      if (previous && initializedRef.current) {
        ([1, 2, 3] as const).forEach((index) => {
          const key = `buckle${index}` as 'buckle1' | 'buckle2' | 'buckle3';
          if (previous[key] !== undefined && previous[key] !== current[key]) {
            dispatch(addMonitoringEvent({
              message: `[${device.deviceName}] ${buckleLabel(index, current[key])}`,
              level: current[key] === 1 ? 'danger' : 'info',
            }));
          }
        });

        if (previous.alarmActive !== undefined && previous.alarmActive !== current.alarmActive) {
          dispatch(addMonitoringEvent({
            message: current.alarmActive
              ? `[${device.deviceName}] Physical harness alarm triggered`
              : `[${device.deviceName}] Alarm sequence completed`,
            level: current.alarmActive ? 'danger' : 'info',
          }));
        }
      }

      previousStatesRef.current[device.boxId] = current;

      if (
        safetyModeEnabled
        && device.buckleAlarmEnabled !== false
        && device.isOnline
        && initializedRef.current
        && hasOpenBuckle(device.buckle1, device.buckle2, device.buckle3)
      ) {
        void playAirRaidSiren();
      }
    });

    initializedRef.current = true;
  }, [devices, dispatch, safetyModeEnabled]);
};
