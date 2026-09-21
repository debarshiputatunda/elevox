import { useMemo } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HookLoadSample } from '@/components/monitoring/hooks/useHookLoadTrend';

const HOOK_A_COLOR = '#ed6c02';
const HOOK_B_COLOR = '#2563eb';
const THRESHOLD_COLOR = '#dc2626';

const X_AXIS_SECONDS = [0, 15, 30, 45, 60] as const;
const X_AXIS_DOMAIN: [number, number] = [0, 60];

const formatSecondsAgoTick = (value: number): string =>
  value === 0 ? 'Now' : `${value}s`;

const formatLoadTick = (value: number): string => {
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return String(value);
};

const renderXAxisTick = ({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number | string;
  y?: number | string;
  payload?: { value?: number };
}) => {
  const value = Number(payload?.value ?? 0);
  const label = formatSecondsAgoTick(value);
  let textAnchor: 'start' | 'middle' | 'end' = 'middle';
  if (value === 0) textAnchor = 'end';
  if (value === 60) textAnchor = 'start';
  const xPos = Number(x);
  const yPos = Number(y);

  return (
    <text x={xPos} y={yPos + 14} fill="#64748b" fontSize={10} textAnchor={textAnchor}>
      {label}
    </text>
  );
};

interface HookLoadTrendChartProps {
  samples: HookLoadSample[];
  hideThresholds?: boolean;
  now: number;
  hookAThreshold: number;
  hookBThreshold: number;
  isLoading?: boolean;
  isOffline?: boolean;
}

export const HookLoadTrendChart = ({
  samples,
  hideThresholds = false,
  now,
  hookAThreshold,
  hookBThreshold,
  isLoading = false,
  isOffline = false,
}: HookLoadTrendChartProps) => {
  const chartData = useMemo(
    () =>
      samples.map((sample) => ({
        secondsAgo: Math.max(0, (now - sample.t) / 1000),
        hookA: sample.hookA,
        hookB: sample.hookB,
      })),
    [samples, now],
  );

  const yMax = useMemo(() => {
    const peak = chartData.reduce(
      (max, point) => Math.max(max, point.hookA, point.hookB),
      0,
    );
    const thresholdPeak = hideThresholds ? 0 : Math.max(hookAThreshold, hookBThreshold);
    return Math.max(5_000, Math.ceil(Math.max(peak, thresholdPeak) / 1000) * 1000);
  }, [chartData, hookAThreshold, hookBThreshold, hideThresholds]);

  const thresholdLines = useMemo(() => {
    const values = new Set([hookAThreshold, hookBThreshold]);
    return [...values];
  }, [hookAThreshold, hookBThreshold]);

  return (
    <Box
      sx={{
        borderRadius: 1.5,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: 1.5,
      }}
    >
      <Typography
        variant="caption"
        fontWeight={800}
        color="text.secondary"
        textTransform="uppercase"
        letterSpacing={0.8}
        display="block"
        mb={1}
        fontSize="0.68rem"
      >
        Load Over Time (Last 60 Seconds)
      </Typography>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress size={22} />
        </Box>
      ) : (
        <Box
          sx={{
            width: '100%',
            height: { xs: 180, md: 200, lg: 220 },
            display: 'flex',
            justifyContent: 'center',
            '& .recharts-responsive-container': {
              marginLeft: 'auto',
              marginRight: 'auto',
            },
          }}
        >
          {chartData.length === 0 && (
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5} fontSize="0.65rem">
              {isOffline ? 'Load history unavailable while offline.' : 'Waiting for load samples…'}
            </Typography>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 16, right: 44, left: 0, bottom: 28 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148, 163, 184, 0.35)"
                syncWithTicks
                verticalValues={[...X_AXIS_SECONDS]}
              />
              <XAxis
                type="number"
                dataKey="secondsAgo"
                domain={X_AXIS_DOMAIN}
                scale="linear"
                reversed
                allowDataOverflow
                allowDecimals={false}
                ticks={[...X_AXIS_SECONDS]}
                tick={renderXAxisTick}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={{ stroke: '#cbd5e1' }}
                height={28}
              />
              <YAxis
                width={36}
                domain={[0, yMax]}
                tickFormatter={formatLoadTick}
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={{ stroke: '#cbd5e1' }}
              />
              <Tooltip
                formatter={(value, name) => [value ?? 0, String(name)]}
                labelFormatter={(secondsAgo) => formatSecondsAgoTick(Number(secondsAgo))}
              />
              <Legend
                verticalAlign="bottom"
                align="center"
                height={28}
                wrapperStyle={{ fontSize: 11, paddingTop: 8, width: '100%' }}
              />
              {!hideThresholds && thresholdLines.map((threshold) => (
                <ReferenceLine
                  key={threshold}
                  y={threshold}
                  stroke={THRESHOLD_COLOR}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  ifOverflow="extendDomain"
                  label={({ viewBox }) => {
                    if (!viewBox || typeof viewBox !== 'object' || !('width' in viewBox)) {
                      return null;
                    }
                    const { x = 0, y = 0, width = 0 } = viewBox as {
                      x?: number;
                      y?: number;
                      width?: number;
                    };
                    return (
                      <text
                        x={x + width}
                        y={y - 5}
                        fill={THRESHOLD_COLOR}
                        fontSize={10}
                        fontWeight={500}
                        textAnchor="end"
                      >
                        {`Threshold (${threshold})`}
                      </text>
                    );
                  }}
                />
              ))}
              <Line
                type="monotone"
                dataKey="hookA"
                name="Hook A"
                stroke={HOOK_A_COLOR}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="hookB"
                name="Hook B"
                stroke={HOOK_B_COLOR}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
};
