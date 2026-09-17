import { Box, Grow, Tooltip, Typography, keyframes } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  getBuckleState,
  type BuckleState,
} from '@/constants/harnessBuckles';
import { parseUtcDate } from '@/utils/helpers';

const STATUS_TEXT: Record<BuckleState, string> = {
  fastened: 'Fastened',
  open: 'Open',
  offline: 'Offline',
  unknown: 'Unknown',
};

const openPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.65), 0 0 16px 6px rgba(220, 38, 38, 0.55);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(220, 38, 38, 0), 0 0 24px 10px rgba(220, 38, 38, 0.4);
    transform: scale(1.06);
  }
`;

const fastenedPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.35), 0 0 6px 2px rgba(22, 163, 74, 0.22);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(22, 163, 74, 0), 0 0 10px 3px rgba(22, 163, 74, 0.15);
  }
`;

const selectedRing = keyframes`
  0%, 100% { box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.95), 0 0 0 6px currentColor, 0 0 20px 8px currentColor; }
  50% { box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.95), 0 0 0 9px currentColor, 0 0 26px 10px currentColor; }
`;

const formatTime = (iso: string): string => {
  const date = parseUtcDate(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString();
};

const formatVoltage = (voltage?: number): string => {
  if (voltage == null || Number.isNaN(voltage)) return '—';
  return `${voltage.toFixed(2)}V`;
};

interface BuckleOverlayIndicatorProps {
  config: { label: string };
  value?: number;
  isOffline?: boolean;
  lastUpdated: string;
  batteryVoltage?: number;
  isSelected?: boolean;
  onSelect?: () => void;
  variant?: 'overlay' | 'inline';
  position?: { left: string; top: string };
  disableTooltip?: boolean;
  rootRef?: React.Ref<HTMLElement>;
  size?: 'default' | 'compact';
}

export const BuckleOverlayIndicator = ({
  config,
  value,
  isOffline,
  lastUpdated,
  batteryVoltage,
  isSelected = false,
  onSelect,
  variant = 'overlay',
  position,
  disableTooltip = false,
  rootRef,
  size = 'default',
}: BuckleOverlayIndicatorProps) => {
  const state = getBuckleState(value, isOffline);
  const isOpen = state === 'open';
  const isFastened = state === 'fastened';
  const isOfflineState = state === 'offline' || state === 'unknown';

  const fill = isOpen ? '#dc2626' : isFastened ? '#16a34a' : '#94a3b8';
  const ringColor = fill;

  const tooltip = (
    <Box sx={{ py: 0.5, lineHeight: 1.6 }}>
      <Typography variant="caption" fontWeight={800} display="block">
        {config.label}
      </Typography>
      <Typography variant="caption" display="block">
        Status : {STATUS_TEXT[state]}
      </Typography>
      <Typography variant="caption" display="block">
        Voltage : {formatVoltage(batteryVoltage)}
      </Typography>
      <Typography variant="caption" display="block" color="grey.300">
        Last Updated :
      </Typography>
      <Typography variant="caption" display="block">
        {formatTime(lastUpdated)}
      </Typography>
    </Box>
  );

  const dotSize = size === 'compact' ? (isSelected ? 21 : 16) : isSelected ? 26 : 20;
  const iconSize = size === 'compact' ? (isSelected ? 11 : 10) : 13;

  const indicator = (
    <Grow in appear timeout={300} key={state}>
      <Box
        onClick={(event) => {
          event.stopPropagation();
          onSelect?.();
        }}
        sx={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: fill,
          border: size === 'compact' ? '2px solid rgba(255, 255, 255, 0.95)' : '2.5px solid rgba(255, 255, 255, 0.95)',
          color: '#fff',
          cursor: onSelect ? 'pointer' : 'default',
          transition:
            'background-color 0.45s ease, box-shadow 0.45s ease, width 0.25s ease, height 0.25s ease, transform 0.25s ease',
          animation: isSelected
            ? `${selectedRing} 2s ease-in-out infinite`
            : isOpen
              ? `${openPulse} 1.1s ease-in-out infinite`
              : isFastened
                ? `${fastenedPulse} 2.8s ease-in-out infinite`
                : 'none',
          boxShadow: isOfflineState ? 'none' : undefined,
          ...(isSelected
            ? { color: ringColor, transform: 'scale(1.08)' }
            : {}),
        }}
      >
        {isOpen && <WarningAmberIcon sx={{ fontSize: iconSize }} />}
        {isFastened && <CheckIcon sx={{ fontSize: iconSize }} />}
      </Box>
    </Grow>
  );

  const content = disableTooltip ? (
    <Box component="span" sx={{ display: 'inline-flex' }}>
      {indicator}
    </Box>
  ) : (
    <Tooltip title={tooltip} arrow placement="top">
      <Box component="span" sx={{ display: 'inline-flex' }}>
        {indicator}
      </Box>
    </Tooltip>
  );

  if (variant === 'inline') {
    return content;
  }

  const cssPosition = position ?? { left: '50%', top: '50%' };

  return (
    <Box
      ref={rootRef}
      sx={{
        position: 'absolute',
        top: cssPosition.top,
        left: cssPosition.left,
        transform: 'translate(-50%, -50%)',
        zIndex: 3,
      }}
    >
      {content}
    </Box>
  );
};
