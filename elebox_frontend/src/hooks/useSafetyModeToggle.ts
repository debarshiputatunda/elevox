import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { useSnackbar } from 'notistack';
import { addMonitoringEvent, setSafetyModeEnabled } from '@/store/slices/monitoringSlice';
import { ensureAudioContext } from '@/utils/airRaidSiren';

export const useSafetyModeToggle = () => {
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const safetyModeEnabled = useAppSelector((state) => state.monitoring.safetyModeEnabled);

  const toggleSafetyMode = async () => {
    const nextValue = !safetyModeEnabled;
    if (nextValue) {
      const ctx = await ensureAudioContext();
      if (!ctx) {
        enqueueSnackbar('Browser audio is not available on this device.', { variant: 'warning' });
        return;
      }
      dispatch(addMonitoringEvent({
        message: 'Safety monitor armed for all S-Boxes. Browser siren active on buckle open.',
        level: 'warning',
      }));
    } else {
      dispatch(addMonitoringEvent({
        message: 'Safety monitor disabled for all S-Boxes.',
        level: 'info',
      }));
    }
    dispatch(setSafetyModeEnabled(nextValue));
  };

  return { safetyModeEnabled, toggleSafetyMode };
};
