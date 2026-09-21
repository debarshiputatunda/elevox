import { Alert, Box, FormControlLabel, Switch, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { setDeviceBuckleAlarm } from '@/store/slices/telemetrySlice';
import type { TelemetryData } from '@/types';

export const BuckleAlarmControl = ({ device, canManage }: { device: TelemetryData; canManage: boolean }) => {
  const dispatch = useAppDispatch();
  const write = useAppSelector((state) => state.telemetry.buckleAlarmWrites[device.boxId]);
  const supported = typeof device.buckleAlarmEnabled === 'boolean';
  const pending = write?.status === 'pending';
  const disabled = pending || !device.isOnline || !supported || !canManage;
  const explanation = !device.isOnline
    ? 'Device offline. Reconnect to change the buckle alarm.'
    : !supported
      ? 'This firmware does not report a configurable buckle alarm.'
      : !canManage
        ? 'Device management permission is required to change this setting.'
        : 'Saved on this device. Hook alarms and live buckle readings remain active.';

  return (
    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Typography variant="body2" fontWeight={700}>Buckle alarm</Typography>
        <FormControlLabel
          sx={{ m: 0, flexShrink: 0 }}
          control={<Switch checked={device.buckleAlarmEnabled === true} disabled={disabled}
            onChange={(_, enabled) => { void dispatch(setDeviceBuckleAlarm({ boxId: device.boxId, enabled })); }}
            slotProps={{ input: { role: 'switch', 'aria-label': `Buckle alarm for ${device.deviceName}` } }} />}
          label={<Typography variant="body2">{supported ? device.buckleAlarmEnabled ? 'On' : 'Off' : 'Unavailable'}</Typography>}
        />
      </Box>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>{explanation}</Typography>
      <Typography role="status" variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
        {pending ? 'Saving — waiting for device confirmation…'
          : write?.status === 'confirmed' ? 'Setting confirmed by device.'
            : supported ? device.isOnline ? 'Reported by device.' : 'Last reported setting.' : 'Setting unavailable.'}
      </Typography>
      {write?.status === 'error' && <Alert severity="error" sx={{ mt: 1.5 }}>
        {write.error} Setting not confirmed; showing the last reported value. Try again when connected.
      </Alert>}
    </Box>
  );
};
