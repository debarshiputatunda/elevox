import { Box, LinearProgress, Typography } from '@mui/material';
import { batteryStatusColor } from '@/utils/batteryHealth';

interface BatteryProgressBarProps {
  percent: number;
  showLabel?: boolean;
}

export const BatteryProgressBar = ({ percent, showLabel = true }: BatteryProgressBarProps) => {
  const value = Math.max(0, Math.min(100, percent));
  const color = batteryStatusColor(
    value > 50 ? 'Healthy' : value >= 20 ? 'Warning' : 'Critical',
  );

  return (
    <Box minWidth={120}>
      <LinearProgress
        variant="determinate"
        value={value}
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': {
            bgcolor: color,
            transition: 'transform 0.4s ease',
          },
        }}
      />
      {showLabel && (
        <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
          {value}%
        </Typography>
      )}
    </Box>
  );
};
