import { Box, Card, Chip, Typography, keyframes, type Theme } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  getHookDescription,
  getHookState,
  getHookStatusLabel,
  type HookConfig,
} from '@/constants/harnessBuckles';
import { monitoringMono } from '@/constants/monitoringTheme';
import { parseUtcDate } from '@/utils/helpers';

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

const formatTime = (iso?: string): string => {
  if (!iso) return '—';
  const date = parseUtcDate(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString();
};

const cardSurface = (theme: Theme, isSelected: boolean, isExceeded: boolean, isNormal: boolean) => {
  const isDark = theme.palette.mode === 'dark';

  if (isSelected) {
    if (isExceeded) return isDark ? 'rgba(239, 83, 80, 0.14)' : 'error.50';
    if (isNormal) return isDark ? 'rgba(123, 198, 126, 0.14)' : 'success.50';
    return isDark ? 'rgba(255, 255, 255, 0.1)' : theme.palette.action.hover;
  }

  return isDark ? 'rgba(11, 25, 44, 0.85)' : theme.palette.background.paper;
};

const cardBorder = (
  theme: Theme,
  isSelected: boolean,
  isExceeded: boolean,
  isNormal: boolean,
) => {
  const isDark = theme.palette.mode === 'dark';

  if (isSelected) {
    if (isExceeded) return theme.palette.error.main;
    if (isNormal) return theme.palette.success.main;
    return theme.palette.primary.main;
  }

  if (isExceeded) return isDark ? 'rgba(239, 83, 80, 0.55)' : theme.palette.error.light;
  if (isNormal) return isDark ? 'rgba(123, 198, 126, 0.55)' : theme.palette.success.light;
  return isDark ? 'rgba(255, 255, 255, 0.14)' : theme.palette.divider;
};

interface HookInfoCardProps {
  config: HookConfig;
  currentLoad?: number;
  threshold?: number;
  exceeded?: boolean;
  isOffline?: boolean;
  isSelected?: boolean;
  lastUpdated?: string;
  onSelect?: () => void;
}

export const HookInfoCard = ({
  config,
  currentLoad,
  threshold,
  exceeded = false,
  isOffline,
  isSelected = false,
  lastUpdated,
  onSelect,
}: HookInfoCardProps) => {
  const state = getHookState(isOffline, exceeded);
  const isExceeded = state === 'open';
  const isNormal = state === 'fastened';
  const accent = isExceeded ? 'error' : isNormal ? 'success' : 'grey';

  return (
    <Card
      variant="outlined"
      data-buckle-selectable
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.();
      }}
      sx={(theme) => ({
        p: { xs: 1, sm: 1.25 },
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        cursor: onSelect ? 'pointer' : 'default',
        borderRadius: 2,
        borderColor: cardBorder(theme, isSelected, isExceeded, isNormal),
        borderWidth: isSelected ? 2 : 1,
        bgcolor: cardSurface(theme, isSelected, isExceeded, isNormal),
        boxShadow: isSelected ? 3 : 1,
        transition:
          'border-color 0.35s ease, box-shadow 0.35s ease, background-color 0.35s ease, transform 0.25s ease',
        transform: isSelected ? 'translateY(-1px)' : 'none',
      })}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 0.75,
          mb: 0.75,
          minWidth: 0,
          flexWrap: 'wrap',
        }}
      >
        <Typography
          variant="caption"
          fontWeight={800}
          textTransform="uppercase"
          letterSpacing={0.7}
          display="block"
          minWidth={0}
          sx={{ overflowWrap: 'anywhere' }}
        >
          {config.label}
        </Typography>
        <Chip
          size="small"
          label={getHookStatusLabel(state)}
          icon={
            isExceeded ? (
              <WarningAmberIcon sx={{ fontSize: 14, color: '#fff !important' }} />
            ) : isNormal ? (
              <CheckIcon sx={{ fontSize: 14, color: '#fff !important' }} />
            ) : undefined
          }
          sx={(theme) => ({
            height: 20,
            fontSize: '0.58rem',
            fontWeight: 800,
            letterSpacing: 0.4,
            color: '#fff',
            bgcolor:
              accent === 'grey' && theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.22)'
                : `${accent}.main`,
            border: 1,
            borderColor:
              accent === 'grey' && theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.28)'
                : `${accent}.dark`,
            '& .MuiChip-label': { px: 0.75, overflow: 'hidden', textOverflow: 'ellipsis' },
            animation: isExceeded ? `${blink} 1.1s ease-in-out infinite` : 'none',
            flexShrink: 1,
            maxWidth: '100%',
          })}
        />
      </Box>

      <Typography
        variant="caption"
        color={isExceeded ? 'error.main' : 'text.secondary'}
        display="block"
        sx={{
          mb: 0.75,
          lineHeight: 1.35,
          overflowWrap: 'anywhere',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {getHookDescription(config, state)}
      </Typography>

      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        fontFamily={monitoringMono}
        fontSize="0.62rem"
        sx={{ mb: 0.35 }}
      >
        Load {isOffline ? '—' : currentLoad ?? '—'}
        {threshold != null ? ` · Limit ${threshold}` : ''}
      </Typography>

      <Typography variant="caption" color="text.disabled" fontSize="0.62rem">
        Updated {formatTime(lastUpdated)}
      </Typography>
    </Card>
  );
};
