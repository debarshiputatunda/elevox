import { Box, Typography } from '@mui/material';
import { HookLoadTrendChart } from '@/components/monitoring/HookLoadTrendChart';
import { HookSensorCard } from '@/components/monitoring/HookSensorCard';
import { HookThresholdControl } from '@/components/monitoring/HookThresholdControl';
import { useHookLoadTrend } from '@/components/monitoring/hooks/useHookLoadTrend';
import { isHookExceeded } from '@/utils/hookThreshold';

interface OperationalTelemetryPanelProps {
  boxId: number;
  isOnline?: boolean;
  hookAValue: number;
  hookBValue: number;
  hookAThreshold: number;
  hookBThreshold: number;
  lastUpdated?: string;
  onHookAThresholdChange: (value: number) => void;
  onHookBThresholdChange: (value: number) => void;
}

export const OperationalTelemetryPanel = ({
  boxId,
  isOnline = true,
  hookAValue,
  hookBValue,
  hookAThreshold,
  hookBThreshold,
  lastUpdated,
  onHookAThresholdChange,
  onHookBThresholdChange,
}: OperationalTelemetryPanelProps) => {
  const hookAExceeded = isHookExceeded(hookAValue, hookAThreshold);
  const hookBExceeded = isHookExceeded(hookBValue, hookBThreshold);
  const { samples, now, isLoading: trendLoading } = useHookLoadTrend(
    boxId,
    hookAValue,
    hookBValue,
    isOnline,
  );

  return (
    <Box
      sx={{
        height: '100%',
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography
          variant="caption"
          fontWeight={800}
          color="text.primary"
          letterSpacing={1.2}
          fontSize="0.7rem"
        >
          Capacitive Load Sensors
        </Typography>
      </Box>

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        <Box display="flex" flexDirection="column" gap={1.5}>
          <HookThresholdControl
            label="Hook A"
            value={hookAThreshold}
            onChange={onHookAThresholdChange}
            disabled={!isOnline}
            compact
          />
          <HookThresholdControl
            label="Hook B"
            value={hookBThreshold}
            onChange={onHookBThresholdChange}
            disabled={!isOnline}
            compact
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: 2,
          }}
        >
          <HookSensorCard
            label="Hook A"
            currentLoad={hookAValue}
            threshold={hookAThreshold}
            exceeded={isOnline && hookAExceeded}
            isOffline={!isOnline}
            lastUpdated={lastUpdated}
          />
          <HookSensorCard
            label="Hook B"
            currentLoad={hookBValue}
            threshold={hookBThreshold}
            exceeded={isOnline && hookBExceeded}
            isOffline={!isOnline}
            lastUpdated={lastUpdated}
          />
        </Box>

        <HookLoadTrendChart
          samples={samples}
          now={now}
          hookAThreshold={hookAThreshold}
          hookBThreshold={hookBThreshold}
          isLoading={trendLoading}
          isOffline={!isOnline}
        />
      </Box>
    </Box>
  );
};
