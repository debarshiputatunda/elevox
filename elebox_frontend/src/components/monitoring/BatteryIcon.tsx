import { Box, Typography } from '@mui/material';
import { batteryColor, monitoringMono } from '@/constants/monitoringTheme';

interface BatteryIconProps {
  level: number;
  compact?: boolean;
}

export const BatteryIcon = ({ level, compact = false }: BatteryIconProps) => {
  const color = batteryColor(level);
  const clamped = Math.max(0, Math.min(level, 100));

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 0.75 : 1,
      }}
    >
      <Box sx={{ position: 'relative', width: compact ? 30 : 36, height: compact ? 15 : 18 }}>
        <Box
          sx={{
            width: compact ? 26 : 32,
            height: compact ? 13 : 16,
            border: `2px solid ${color}`,
            borderRadius: '3px',
            p: '2px',
            boxSizing: 'border-box',
          }}
        >
          <Box
            sx={{
              width: `${clamped}%`,
              height: '100%',
              bgcolor: color,
              borderRadius: '1px',
              transition: 'width 0.35s ease, background-color 0.35s ease',
            }}
          />
        </Box>
        <Box
          sx={{
            position: 'absolute',
            right: compact ? -3 : -4,
            top: compact ? 3 : 4,
            width: compact ? 2 : 3,
            height: compact ? 6 : 8,
            bgcolor: color,
            borderRadius: '0 2px 2px 0',
          }}
        />
      </Box>
      <Typography
        variant="body2"
        fontWeight={700}
        fontFamily={monitoringMono}
        color={color}
        lineHeight={1.1}
        fontSize={compact ? '0.8rem' : '0.875rem'}
      >
        {level}%
      </Typography>
    </Box>
  );
};
