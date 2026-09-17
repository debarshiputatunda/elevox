import {
  Box,
  Chip,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BatteryGauge } from '@/components/battery/BatteryGauge';
import { BatteryProgressBar } from '@/components/battery/BatteryProgressBar';
import type { BatteryDevice } from '@/services/batteryHealthService';
import {
  batteryStatusMuiColor,
  formatRelativeTime,
} from '@/utils/batteryHealth';
import { formatDateTime as formatFullDateTime } from '@/utils/helpers';
import { ResponsiveDrawer } from '@/components/common/ResponsiveDrawer';

interface BatteryDetailDrawerProps {
  open: boolean;
  device: (BatteryDevice & {
    trend?: Array<{ recordedAt: string; batteryPercent: number; batteryVoltage: number }>;
  }) | null;
  onClose: () => void;
}

export const BatteryDetailDrawer = ({ open, device, onClose }: BatteryDetailDrawerProps) => {
  if (!device) return null;

  const trendData = (device.trend ?? []).map((point) => ({
    time: new Date(point.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    battery: point.batteryPercent,
  }));

  return (
    <ResponsiveDrawer open={open} onClose={onClose}>
      <Box p={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={700}>
            S-Box Details
          </Typography>
          <IconButton onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Stack spacing={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <BatteryGauge percent={device.batteryPercent ?? 0} size={72} />
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {device.serialNo ?? `Box #${device.boxId}`}
              </Typography>
              <Chip
                label={device.batteryStatus}
                color={batteryStatusMuiColor(device.batteryStatus)}
                size="small"
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Box>

          <BatteryProgressBar percent={device.batteryPercent ?? 0} />

          <Divider />

          <DetailRow label="Location" value={device.locationName ?? '—'} />
          <DetailRow label="Work Area" value={device.workAreaName ?? '—'} />
          <DetailRow
            label="Battery %"
            value={device.batteryPercent != null ? `${device.batteryPercent}%` : '—'}
          />
          <DetailRow
            label="Voltage"
            value={device.batteryVoltage != null ? `${device.batteryVoltage.toFixed(2)}V` : '—'}
          />
          <DetailRow label="Battery Status" value={device.batteryStatus} />
          <DetailRow
            label="Last Seen"
            value={device.lastSeen ? formatFullDateTime(device.lastSeen) : '—'}
          />
          <DetailRow
            label="Last Updated"
            value={formatRelativeTime(device.lastUpdated ?? device.lastSeen)}
          />
        </Stack>

        {trendData.length > 0 && (
          <Box mt={3}>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              Battery Trend (24h)
            </Typography>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="battery" stroke="#2e7d32" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Box>
    </ResponsiveDrawer>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={500}>
      {value}
    </Typography>
  </Box>
);
