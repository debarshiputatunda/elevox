import {
  Box,
  Card,
  CardContent,
  Chip,
  Typography,
} from '@mui/material';
import { OperationalTelemetryPanel } from '@/components/monitoring/OperationalTelemetryPanel';
import { HardwareIntegrityPanel } from '@/components/monitoring/HardwareIntegrityPanel';
import { ConnectionStatusChip } from '@/components/common/ConnectionStatusChip';
import { monitoringMono } from '@/constants/monitoringTheme';
import type { TelemetryData } from '@/types';
import { formatTime } from '@/utils/helpers';
import type { WebSocketConnectionStatus } from '@/services/websocketService';

interface DeviceMonitoringCardProps {
  device: TelemetryData;
  wsStatus: string;
  triggeringAlarm: boolean;
  hookAThreshold: number;
  hookBThreshold: number;
  canTriggerAlarm: boolean;
  onHookAThresholdChange: (value: number) => void;
  onHookBThresholdChange: (value: number) => void;
  onTriggerAlarm: () => void;
}

export const DeviceMonitoringCard = ({
  device,
  wsStatus,
  triggeringAlarm,
  hookAThreshold,
  hookBThreshold,
  canTriggerAlarm,
  onHookAThresholdChange,
  onHookBThresholdChange,
  onTriggerAlarm,
}: DeviceMonitoringCardProps) => (
  <Box>
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box minWidth={0}>
            <Typography variant="h6" fontWeight={700} noWrap>
              {device.deviceName}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              fontFamily={monitoringMono}
              display="block"
            >
              {device.serialNumber}
              {device.ipAddress ? ` · ${device.ipAddress}` : ''}
            </Typography>
            {(device.locationName || device.workAreaName) && (
              <Typography variant="caption" color="text.secondary" display="block">
                {[device.locationName, device.workAreaName].filter(Boolean).join(' · ')}
              </Typography>
            )}
          </Box>
          <Chip
            label={device.isOnline ? 'Online' : 'Offline'}
            size="small"
            color={device.isOnline ? 'success' : 'default'}
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        </Box>
      </CardContent>
    </Card>

    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
        gap: 2,
        mb: 1.5,
        '& > *': { minWidth: 0 },
      }}
    >
      <OperationalTelemetryPanel
        boxId={device.boxId}
        isOnline={device.isOnline}
        hookAValue={device.hookAValue}
        hookBValue={device.hookBValue}
        hookAThreshold={hookAThreshold}
        hookBThreshold={hookBThreshold}
        lastUpdated={device.lastUpdated}
        onHookAThresholdChange={onHookAThresholdChange}
        onHookBThresholdChange={onHookBThresholdChange}
      />
      <HardwareIntegrityPanel
        device={device}
        triggeringAlarm={triggeringAlarm}
        canTriggerAlarm={canTriggerAlarm}
        onTriggerAlarm={onTriggerAlarm}
        hookAThreshold={hookAThreshold}
        hookBThreshold={hookBThreshold}
      />
    </Box>

    <Card variant="outlined">
      <CardContent
        sx={{
          py: 1.25,
          px: { xs: 1.5, md: 2 },
          '&:last-child': { pb: 1.25 },
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Chip
          size="small"
          variant="outlined"
          color={device.alarmActive ? 'error' : 'default'}
          label={`Alarm: ${device.alarmActive ? (device.alarmCause ?? 'Active') : 'Idle'}`}
          sx={{ fontWeight: 700 }}
        />
        {(device.hookAValid === false || device.hookBValid === false) && <Chip size="small" color="error" label="Hook sensor fault" />}
        <ConnectionStatusChip status={wsStatus as WebSocketConnectionStatus} />
        <Typography
          variant="caption"
          color="text.secondary"
          fontFamily={monitoringMono}
          sx={{ ml: { xs: 0, sm: 'auto' } }}
        >
          Last update: {formatTime(device.lastUpdated)}
        </Typography>
      </CardContent>
    </Card>
  </Box>
);
