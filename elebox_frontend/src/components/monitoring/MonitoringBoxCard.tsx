import { Box, Card, CardActionArea, CardContent, Typography } from '@mui/material';
import { DeviceStatusChip } from '@/components/common/DeviceStatusChip';
import { BatteryIcon } from '@/components/monitoring/BatteryIcon';
import { monitoringMono } from '@/constants/monitoringTheme';
import type { TelemetryData } from '@/types';
import { formatRelativeTime } from '@/utils/batteryHealth';

interface MonitoringBoxCardProps {
  device: TelemetryData;
  onSelect: (boxId: number) => void;
}

export const MonitoringBoxCard = ({ device, onSelect }: MonitoringBoxCardProps) => (
  <Card
    variant="outlined"
    sx={{
      height: '100%',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      '&:hover': {
        borderColor: 'primary.main',
        boxShadow: 2,
      },
    }}
  >
    <CardActionArea
      onClick={() => onSelect(device.boxId)}
      sx={{ height: '100%', alignItems: 'stretch' }}
      aria-label={`Open live monitoring for ${device.deviceName}`}
    >
      <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} mb={0.75}>
          <Box minWidth={0}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>
              {device.deviceName}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              fontFamily={monitoringMono}
              display="block"
              noWrap
            >
              {device.serialNumber}
            </Typography>
          </Box>
          <DeviceStatusChip status={device.status} />
        </Box>

        {(device.locationName || device.workAreaName) && (
          <Typography variant="caption" color="text.secondary" display="block" mb={1} noWrap>
            {[device.locationName, device.workAreaName].filter(Boolean).join(' · ')}
          </Typography>
        )}

        <Box display="flex" justifyContent="space-between" alignItems="center" mt={1.25}>
          <BatteryIcon level={device.batteryLevel} compact />
          <Typography variant="caption" color="text.secondary">
            {formatRelativeTime(device.lastUpdated)}
          </Typography>
        </Box>
      </CardContent>
    </CardActionArea>
  </Card>
);
