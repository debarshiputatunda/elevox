import {
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { TelemetryData } from '@/types';
import { batteryMuiColor } from '@/constants/monitoringTheme';
import { HarnessVisualization } from '@/components/monitoring/HarnessVisualization';
import { BuckleAlarmControl } from '@/components/monitoring/BuckleAlarmControl';
import { usePermission } from '@/hooks/usePermission';
import { isHookExceeded } from '@/utils/hookThreshold';

interface HardwareIntegrityPanelProps {
  device: TelemetryData;
  triggeringAlarm: boolean;
  canTriggerAlarm: boolean;
  onTriggerAlarm: () => void;
  hookAThreshold: number;
  hookBThreshold: number;
}

export const HardwareIntegrityPanel = ({
  device,
  triggeringAlarm,
  canTriggerAlarm,
  onTriggerAlarm,
  hookAThreshold,
  hookBThreshold,
}: HardwareIntegrityPanelProps) => {
  const { can } = usePermission();
  const isOffline = !device.isOnline;
  const alarmActive = Boolean(device.alarmActive);
  const batteryColor = batteryMuiColor(device.batteryLevel);

  return (
    <Box
      sx={{
        height: '100%',
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography
          variant="caption"
          fontWeight={800}
          color="text.primary"
          letterSpacing={1.2}
          fontSize="0.7rem"
        >
          Hardware Integrity
        </Typography>
      </Box>

      <Box
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          flex: 1,
          minWidth: 0,
          overflowX: 'hidden',
          overflowY: 'auto',
        }}
      >
        <HarnessVisualization
          buckle1={device.buckle1}
          buckle2={device.buckle2}
          buckle3={device.buckle3}
          hookAValue={device.hookAValue}
          hookBValue={device.hookBValue}
          hookAThreshold={hookAThreshold}
          hookBThreshold={hookBThreshold}
          hookAExceeded={isHookExceeded(device.hookAValue, hookAThreshold)}
          hookBExceeded={isHookExceeded(device.hookBValue, hookBThreshold)}
          isOffline={isOffline}
          lastUpdated={device.lastUpdated}
          batteryVoltage={device.batteryVoltage}
        />

        <BuckleAlarmControl key={device.boxId} device={device} canManage={can('sboxes.manage')} />

        <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {canTriggerAlarm && (
            <Button
              fullWidth
              variant={alarmActive ? 'contained' : 'outlined'}
              color="error"
              disabled={!device.isOnline || triggeringAlarm || alarmActive}
              startIcon={
                triggeringAlarm
                  ? <CircularProgress size={18} color="inherit" />
                  : <WarningAmberIcon />
              }
              onClick={onTriggerAlarm}
              sx={{ fontWeight: 700, py: { xs: 1.5, md: 1.25 }, minHeight: 48 }}
            >
              {alarmActive ? 'Alarm Active' : 'Trigger Alarm'}
            </Button>
          )}

          <Box pt={1.5} borderTop={1} borderColor="divider">
            <Typography variant="body2" fontWeight={700}>
              Battery System:{' '}
              <Typography component="span" color={isOffline ? 'text.secondary' : batteryColor} fontWeight={700}>
                {isOffline ? '—' : `${device.batteryLevel}%`}
              </Typography>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
