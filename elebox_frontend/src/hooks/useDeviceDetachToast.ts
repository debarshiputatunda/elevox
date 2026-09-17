import { useEffect, useRef } from 'react';
import { useSnackbar } from 'notistack';
import { useAppSelector } from '@/hooks/redux';
import { useNow } from '@/hooks/useNow';
import { applyLiveConnectivity } from '@/utils/deviceConnectivity';

const TOAST_MS = 4000;

export const useDeviceDetachToast = () => {
  const { enqueueSnackbar } = useSnackbar();
  const devices = useAppSelector((state) => state.telemetry.devices);
  const now = useNow(1000);
  const wasOnlineRef = useRef<Map<number, boolean>>(new Map());

  useEffect(() => {
    const previous = wasOnlineRef.current;

    for (const device of devices) {
      const live = applyLiveConnectivity(device, now);
      const wasOnline = previous.get(device.boxId);
      if (wasOnline === true && !live.isOnline) {
        enqueueSnackbar(`${live.deviceName} has been detached`, {
          variant: 'warning',
          autoHideDuration: TOAST_MS,
        });
      }
      previous.set(device.boxId, live.isOnline);
    }
  }, [devices, enqueueSnackbar, now]);
};
