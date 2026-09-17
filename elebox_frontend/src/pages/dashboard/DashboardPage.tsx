import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Skeleton,
} from '@mui/material';
import DevicesIcon from '@mui/icons-material/Devices';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import { PageHeader } from '@/components/common/PageHeader';
import { SafetyModeControl } from '@/components/dashboard/SafetyModeControl';
import { MetricCard } from '@/components/common/MetricCard';
import { DeviceStatusChip } from '@/components/common/DeviceStatusChip';
import { EmptyState } from '@/components/common/EmptyState';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { useDeviceTelemetrySubscription } from '@/hooks/useTelemetryWebSocket';
import { fetchDashboardSummary } from '@/store/slices/dashboardSlice';
import { fetchTelemetry } from '@/store/slices/telemetrySlice';
import { MOCK_VIOLATIONS } from '@/mocks/data';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { palette } from '@/theme';
import { monitoringMono } from '@/constants/monitoringTheme';
import { ROUTES } from '@/constants/routes';
import { useTheme } from '@mui/material/styles';

const chartData = [
  { name: 'Mon', violations: 4 },
  { name: 'Tue', violations: 7 },
  { name: 'Wed', violations: 3 },
  { name: 'Thu', violations: 8 },
  { name: 'Fri', violations: 5 },
  { name: 'Sat', violations: 2 },
  { name: 'Sun', violations: 6 },
];

const trendData = [
  { month: 'Jan', safety: 92 },
  { month: 'Feb', safety: 88 },
  { month: 'Mar', safety: 94 },
  { month: 'Apr', safety: 91 },
  { month: 'May', safety: 96 },
  { month: 'Jun', safety: 93 },
];

export const DashboardPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const { summary, loading } = useAppSelector((s) => s.dashboard);
  const { devices, loading: telemetryLoading } = useAppSelector((s) => s.telemetry);
  const user = useAppSelector((s) => s.auth.user);
  const dashboardBoxIds = useMemo(() => devices.map((device) => device.boxId), [devices]);
  const axisColor = theme.palette.text.secondary;
  const gridColor = theme.palette.divider;

  useDeviceTelemetrySubscription('dashboard-live', dashboardBoxIds);

  useEffect(() => {
    dispatch(fetchDashboardSummary());
    dispatch(fetchTelemetry());
  }, [dispatch]);

  return (
    <Box>
      <PageHeader
        title="Safety Dashboard"
        subtitle={`Welcome back, ${user?.fullName ?? 'User'}. Real-time S-Box monitoring overview.`}
      />

      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={4} xl={2}>
          <MetricCard title="Total Devices" value={summary?.totalDevices ?? 0} icon={DevicesIcon} loading={loading} />
        </Grid>
        <Grid item xs={6} md={4} xl={2}>
          <MetricCard
            title="Online Devices"
            value={summary?.activeDevices ?? 0}
            icon={WifiIcon}
            color="success.main"
            loading={loading}
            statusLabel="Healthy"
            statusColor="success"
          />
        </Grid>
        <Grid item xs={6} md={4} xl={2}>
          <MetricCard
            title="Offline Devices"
            value={summary?.offlineDevices ?? 0}
            icon={WifiOffIcon}
            color="text.secondary"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} md={4} xl={2}>
          <MetricCard
            title="Total Violations"
            value={summary?.totalViolations ?? 0}
            icon={WarningAmberIcon}
            color="warning.main"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} md={4} xl={2}>
          <MetricCard
            title="Today's Violations"
            value={summary?.todayViolations ?? 0}
            icon={ReportProblemIcon}
            color="error.main"
            loading={loading}
          />
        </Grid>
        <Grid item xs={6} md={4} xl={2}>
          <MetricCard
            title="Alerts"
            value={summary?.criticalAlerts ?? 0}
            icon={NotificationsActiveIcon}
            color="error.main"
            loading={loading}
          />
        </Grid>
      </Grid>

      <Box mb={3}>
        <SafetyModeControl />
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent Devices</Typography>
              {telemetryLoading && devices.length === 0 ? (
                <Skeleton height={200} />
              ) : devices.length === 0 ? (
                <EmptyState
                  title="No S-Boxes"
                  description="No recent device telemetry is available."
                  icon={DevicesIcon}
                />
              ) : (
                <List dense disablePadding>
                  {devices.slice(0, 8).map((d) => (
                    <ListItem key={d.deviceId} disablePadding divider>
                      <ListItemButton onClick={() => navigate(`${ROUTES.MONITORING}?boxId=${d.boxId}`)}>
                        <ListItemText
                          primary={d.deviceName || d.serialNumber}
                          secondary={
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                              fontFamily={monitoringMono}
                            >
                              {d.serialNumber} · A:{d.hookAValue} B:{d.hookBValue} · {d.batteryLevel}%
                            </Typography>
                          }
                        />
                        <DeviceStatusChip status={d.status} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent Violations</Typography>
              {MOCK_VIOLATIONS.length === 0 ? (
                <EmptyState
                  title="No violations"
                  description="No recent safety violations were recorded."
                  icon={NotificationsOffIcon}
                />
              ) : (
                <List dense disablePadding>
                  {MOCK_VIOLATIONS.slice(0, 5).map((v) => (
                    <ListItem key={v.id} divider>
                      <ListItemText
                        primary={`${v.serialNumber} — ${v.violationType}`}
                        secondary={`${v.date} ${v.time} · ${v.location}`}
                      />
                      <Chip
                        label={v.severity}
                        size="small"
                        color={v.severity === 'Critical' ? 'error' : 'warning'}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Weekly Violations</Typography>
              <Box height={{ xs: 220, md: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: axisColor, fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="violations" fill={palette.main} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Safety Trend</Typography>
              <Box height={{ xs: 220, md: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 12 }} />
                    <YAxis domain={[80, 100]} tick={{ fill: axisColor, fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="safety" stroke={palette.sage} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
