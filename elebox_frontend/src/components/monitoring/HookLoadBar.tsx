import { Box, Typography } from '@mui/material';
import { getFineColor, getFinePercent, getOverloadColor, getOverloadPercent } from '@/utils/hookLoadBar';

interface HookLoadBarProps {
  label: string;
  value: number;
  peak: number;
  variant: 'fine' | 'overload';
  compact?: boolean;
}

export const HookLoadBar = ({ label, value, peak, variant, compact = false }: HookLoadBarProps) => {
  const percent = variant === 'fine' ? getFinePercent(value) : getOverloadPercent(value);
  const peakPercent = variant === 'fine' ? getFinePercent(peak) : getOverloadPercent(peak);
  const fillColor = variant === 'fine' ? getFineColor(percent) : getOverloadColor(percent);

  return (
    <Box sx={{ mb: variant === 'fine' && compact ? 0.5 : 0 }}>
      <Typography
        variant="caption"
        fontWeight={700}
        sx={{
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          fontSize: '0.58rem',
          display: 'block',
          mb: 0.25,
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          bgcolor: '#1e293b',
          borderRadius: '4px',
          height: compact ? 8 : 10,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${peakPercent}%`,
            width: 2,
            bgcolor: 'rgba(255,255,255,0.85)',
            zIndex: 10,
            transition: 'left 0.1s linear',
          }}
        />
        <Box
          sx={{
            height: '100%',
            width: `${percent}%`,
            bgcolor: fillColor,
            transition: 'width 0.1s linear, background-color 0.1s linear',
          }}
        />
      </Box>
    </Box>
  );
};
