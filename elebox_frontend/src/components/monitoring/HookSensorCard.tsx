import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import { Box, Divider, Typography, keyframes, useTheme } from '@mui/material';
import { monitoringMono } from '@/constants/monitoringTheme';
import { formatRelativeTime } from '@/utils/batteryHealth';

const exceededFlashLight = keyframes`
  0%, 100% { background-color: rgba(254, 242, 242, 1); }
  50% { background-color: rgba(254, 226, 226, 1); }
`;

const exceededFlashDark = keyframes`
  0%, 100% { background-color: rgba(239, 83, 80, 0.12); }
  50% { background-color: rgba(239, 83, 80, 0.22); }
`;

interface HookSensorCardProps {
  label: string;
  rangeMode?: boolean;
  rawValue?: number;
  valid?: boolean;
  observedValue?: number;
  timeouts?: number;
  sampleCount?: number;
  timeoutCycles?: number;
  currentLoad: number;
  threshold: number;
  exceeded: boolean;
  isOffline?: boolean;
  lastUpdated?: string;
}

const columnLabelSx = {
  fontSize: '0.65rem',
  fontWeight: 600,
  color: 'text.secondary',
  letterSpacing: 0.3,
  mb: 0.75,
  lineHeight: 1.2,
} as const;

export const HookSensorCard = ({
  label,
  rangeMode = false,
  rawValue,
  valid,
  observedValue,
  timeouts,
  sampleCount = 16,
  timeoutCycles = 800000,
  currentLoad,
  threshold,
  exceeded,
  isOffline = false,
  lastUpdated,
}: HookSensorCardProps) => {
  const theme = useTheme();
  const invalid = valid === false || currentLoad < 0 || !Number.isFinite(currentLoad);
  const allTimeout = invalid && timeouts === sampleCount;
  const observed = observedValue != null && Number.isFinite(observedValue) && observedValue >= 0 ? observedValue : undefined;
  const statusLabel = isOffline ? 'OFFLINE' : invalid ? 'INVALID' : exceeded ? (rangeMode ? 'HOOK ALARM' : 'EXCEEDED') : 'NORMAL';
  const statusBg = isOffline ? 'action.selected' : invalid ? 'warning.light' : exceeded ? 'error.light' : 'success.light';
  const statusColor = isOffline ? 'text.secondary' : invalid ? 'warning.dark' : exceeded ? 'error.dark' : 'success.dark';
  const pulseColor = isOffline ? 'text.disabled' : invalid ? 'warning.main' : exceeded ? 'error.main' : 'success.main';
  const showExceeded = !isOffline && exceeded;
  const thresholdColor = theme.palette.mode === 'dark' ? '#90CAF9' : '#1E3E62';

  return (
    <Box
      role="status"
      aria-label={`${label} ${statusLabel}`}
      sx={{
        borderRadius: 1.25,
        border: 1,
        borderColor: showExceeded ? 'error.main' : 'divider',
        borderWidth: showExceeded ? 2 : 1,
        bgcolor: 'background.paper',
        boxShadow: showExceeded ? '0 0 14px rgba(211, 47, 47, 0.28)' : '0 1px 3px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        animation: showExceeded
          ? `${theme.palette.mode === 'dark' ? exceededFlashDark : exceededFlashLight} 1.2s ease-in-out infinite`
          : 'none',
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1.25,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography
          variant="body2"
          fontWeight={800}
          letterSpacing={0.6}
          fontSize="0.9rem"
          lineHeight={1}
        >
          {label}
        </Typography>
        <MonitorHeartOutlinedIcon sx={{ fontSize: 20, color: pulseColor }} />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr auto 1fr auto 1fr' },
          alignItems: 'stretch',
          px: 1.25,
          py: 1.5,
          rowGap: 1.25,
        }}
      >
        <Box sx={{ textAlign: 'center', px: 0.5 }}>
          <Typography sx={columnLabelSx}>{invalid ? (allTimeout ? 'Timeout bound (cycles)' : 'Observed mean (cycles)') : rangeMode ? 'Smoothed reading' : 'Current Load'}</Typography>
          <Typography
            fontFamily={monitoringMono}
            fontWeight={700}
            fontSize={{ xs: '1.4rem', sm: '1.65rem' }}
            lineHeight={1}
            color={isOffline ? 'text.disabled' : showExceeded ? 'error.main' : 'primary.main'}
          >
            {isOffline ? '—' : invalid ? (allTimeout ? `≥${timeoutCycles}` : observed ?? '—') : currentLoad}
          </Typography>
        </Box>

        <Divider
          orientation="vertical"
          flexItem
          sx={{ mx: 0.5, display: { xs: 'none', sm: 'block' } }}
        />

        <Box sx={{ textAlign: 'center', px: 0.5 }}>
          <Typography sx={columnLabelSx}>{rangeMode ? 'Raw reading' : 'Threshold'}</Typography>
          <Typography
            fontFamily={monitoringMono}
            fontWeight={700}
            fontSize={{ xs: '1.4rem', sm: '1.65rem' }}
            lineHeight={1}
            color={thresholdColor}
          >
            {rangeMode ? (isOffline || invalid ? '—' : rawValue ?? '—') : threshold}
          </Typography>
        </Box>

        <Divider
          orientation="vertical"
          flexItem
          sx={{ mx: 0.5, display: { xs: 'none', sm: 'block' } }}
        />

        <Box sx={{ textAlign: 'center', px: 0.5 }}>
          <Typography sx={columnLabelSx}>Status</Typography>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 1.25,
              py: 0.35,
              borderRadius: 1.25,
              bgcolor: statusBg,
              minWidth: 88,
            }}
          >
            <Typography
              variant="caption"
              fontWeight={800}
              letterSpacing={0.5}
              fontSize="0.65rem"
              color={statusColor}
            >
              {statusLabel}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            display="block"
            color="text.secondary"
            fontSize="0.58rem"
            mt={0.75}
            lineHeight={1.3}
          >
            Last updated
            <br />
            {formatRelativeTime(lastUpdated)}
          </Typography>
        </Box>
      </Box>
      {invalid && !isOffline && (
        <Typography variant="caption" color="warning.main" display="block" sx={{ px: 1.5, pb: 1.5 }}>
          {allTimeout ? 'Timeout — no finite reading' : observed !== undefined ? 'Partial/invalid observation' : 'Invalid — no finite reading'}
          {' · '}Timeouts: {timeouts ?? 'unknown'}/{sampleCount}. Diagnostic only.
        </Typography>
      )}
    </Box>
  );
};
