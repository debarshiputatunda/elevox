import { Box, CircularProgress, Typography } from '@mui/material';
import { batteryStatusColor } from '@/utils/batteryHealth';

interface BatteryGaugeProps {
  percent: number;
  size?: number;
}

export const BatteryGauge = ({ percent, size = 56 }: BatteryGaugeProps) => {
  const value = Math.max(0, Math.min(100, percent));
  const color = batteryStatusColor(
    value > 50 ? 'Healthy' : value >= 20 ? 'Warning' : 'Critical',
  );

  return (
    <Box position="relative" display="inline-flex" sx={{ transition: 'all 0.3s ease' }}>
      <CircularProgress
        variant="determinate"
        value={100}
        size={size}
        thickness={4}
        sx={{ color: 'action.hover' }}
      />
      <CircularProgress
        variant="determinate"
        value={value}
        size={size}
        thickness={4}
        sx={{
          color,
          position: 'absolute',
          left: 0,
          transition: 'stroke-dashoffset 0.4s ease',
        }}
      />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="caption" fontWeight={700}>
          {value}%
        </Typography>
      </Box>
    </Box>
  );
};
