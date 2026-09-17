import { Box, Typography } from '@mui/material';
import { monitoringMono } from '@/constants/monitoringTheme';
import { HookLoadBar } from '@/components/monitoring/HookLoadBar';

interface HookSensorRowProps {
  label: string;
  value: number;
  exceeded: boolean;
  peakFine: number;
  isOffline?: boolean;
  compact?: boolean;
}

export const HookSensorRow = ({
  label,
  value,
  exceeded,
  peakFine,
  isOffline = false,
  compact = false,
}: HookSensorRowProps) => (
  <Box
    sx={{
      p: compact ? 1 : 1.25,
      borderRadius: 1,
      bgcolor: 'action.hover',
      border: 1,
      borderColor: !isOffline && exceeded ? 'error.main' : 'divider',
      transition: 'border-color 0.2s',
    }}
  >
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: compact ? 0.5 : 0.75,
      }}
    >
      <Typography
        variant="body2"
        fontWeight={800}
        color="text.primary"
        letterSpacing={0.8}
        fontSize="0.85rem"
      >
        {label}
      </Typography>
      <Typography
        variant="body1"
        fontWeight={700}
        fontFamily={monitoringMono}
        color={isOffline ? 'text.secondary' : exceeded ? 'error.main' : 'text.primary'}
        fontSize={compact ? '1.25rem' : '1.4rem'}
        lineHeight={1}
      >
        {isOffline ? 'Offline' : value}
      </Typography>
    </Box>
    <HookLoadBar
      label="Fine Res (2.5k - 4.5k)"
      value={isOffline ? 0 : value}
      peak={isOffline ? 0 : peakFine}
      variant="fine"
      compact={compact}
    />
  </Box>
);
