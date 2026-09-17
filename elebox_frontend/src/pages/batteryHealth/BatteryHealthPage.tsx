import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import BatteryAlertIcon from '@mui/icons-material/BatteryAlert';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import DevicesIcon from '@mui/icons-material/Devices';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { MetricCard } from '@/components/common/MetricCard';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { BatteryDetailDrawer } from '@/components/battery/BatteryDetailDrawer';
import { BatteryGauge } from '@/components/battery/BatteryGauge';
import { BatteryProgressBar } from '@/components/battery/BatteryProgressBar';
import { useAppSelector } from '@/hooks/redux';
import { useDeviceTelemetrySubscription } from '@/hooks/useTelemetryWebSocket';
import {
  batteryHealthService,
  type BatteryDevice,
  type BatteryDeviceFilters,
} from '@/services/batteryHealthService';
import { locationService } from '@/services/locationService';
import { sboxService } from '@/services/sboxService';
import { workAreaService } from '@/services/workAreaService';
import {
  batteryStatusMuiColor,
  formatRelativeTime,
  resolveBatteryStatus,
} from '@/utils/batteryHealth';

const PIE_COLORS = ['#2e7d32', '#ed6c02', '#d32f2f', '#757575'];
const emptyFilters = (): BatteryDeviceFilters => ({});

const mergeLiveTelemetry = (
  devices: BatteryDevice[],
  telemetryDevices: import('@/types').TelemetryData[],
): BatteryDevice[] =>
  devices.map((device) => {
    const live = telemetryDevices.find(
      (item) => item.boxId === device.boxId || item.deviceId === String(device.boxId),
    );
    if (!live) return device;
    const batteryPercent = live.batteryLevel;
    return {
      ...device,
      batteryPercent,
      batteryVoltage: live.batteryVoltage,
      batteryStatus: resolveBatteryStatus(batteryPercent),
      lastUpdated: live.lastUpdated,
    };
  });

export const BatteryHealthPage = () => {
  const telemetryDevices = useAppSelector((s) => s.telemetry.devices);
  const lastTelemetryUpdate = useAppSelector((s) => s.telemetry.lastUpdated);

  const [filters, setFilters] = useState<BatteryDeviceFilters>(emptyFilters);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedBoxId, setSelectedBoxId] = useState<number | null>(null);

  const queryFilters = useMemo(
    () => ({
      ...filters,
      page: page + 1,
      pageSize,
    }),
    [filters, page, pageSize],
  );

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['battery-health', 'summary', filters],
    queryFn: () => batteryHealthService.getSummary(filters),
    refetchInterval: 30000,
  });

  const { data: devicesPage, isLoading, refetch: refetchDevices } = useQuery({
    queryKey: ['battery-health', 'devices', queryFilters],
    queryFn: () => batteryHealthService.getDevices(queryFilters),
    refetchInterval: 30000,
  });

  const { data: analytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ['battery-health', 'analytics', filters, selectedBoxId],
    queryFn: () =>
      batteryHealthService.getAnalytics({
        ...filters,
        boxId: selectedBoxId ?? undefined,
      }),
    refetchInterval: 30000,
  });

  const { data: drawerDevice } = useQuery({
    queryKey: ['battery-health', 'device', selectedBoxId],
    queryFn: () => batteryHealthService.getDevice(selectedBoxId!),
    enabled: selectedBoxId !== null,
  });

  const { data: sboxes = [] } = useQuery({
    queryKey: ['sboxes', 'battery-filter'],
    queryFn: async () => (await sboxService.getAll({ pageSize: 500 })).data,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', 'battery-filter'],
    queryFn: () => locationService.list(),
  });

  const { data: workAreas = [] } = useQuery({
    queryKey: ['work-areas', 'battery-filter'],
    queryFn: () => workAreaService.list(),
  });

  const allBoxIds = useMemo(() => sboxes.map((s) => s.id), [sboxes]);
  useDeviceTelemetrySubscription('battery-health-page', allBoxIds);

  useEffect(() => {
    if (lastTelemetryUpdate) {
      void refetchSummary();
      void refetchDevices();
      void refetchAnalytics();
    }
  }, [lastTelemetryUpdate, refetchSummary, refetchDevices, refetchAnalytics]);

  const liveDevices = useMemo(
    () => mergeLiveTelemetry(devicesPage?.data ?? [], telemetryDevices),
    [devicesPage?.data, telemetryDevices],
  );

  const liveSummary = useMemo(() => {
    if (!summary) return summary;
    const allLive = mergeLiveTelemetry(
      sboxes.map((s) => ({
        boxId: s.id,
        batteryPercent: telemetryDevices.find((t) => t.boxId === s.id)?.batteryLevel,
        batteryStatus: resolveBatteryStatus(
          telemetryDevices.find((t) => t.boxId === s.id)?.batteryLevel,
        ),
      })),
      telemetryDevices,
    );
    if (!allLive.some((d) => d.batteryPercent !== undefined)) return summary;
    return {
      ...summary,
      healthyCount: allLive.filter((d) => d.batteryStatus === 'Healthy').length,
      warningCount: allLive.filter((d) => d.batteryStatus === 'Warning').length,
      criticalCount: allLive.filter((d) => d.batteryStatus === 'Critical').length,
    };
  }, [summary, sboxes, telemetryDevices]);

  const updateFilter = useCallback((patch: Partial<BatteryDeviceFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(0);
  }, []);

  const resetFilters = () => {
    setFilters(emptyFilters());
    setPage(0);
  };

  const liveDrawerDevice = useMemo((): (BatteryDevice & {
    trend?: Array<{ recordedAt: string; batteryPercent: number; batteryVoltage: number }>;
  }) | null => {
    if (!drawerDevice || !drawerDevice.boxId) return null;
    const live = telemetryDevices.find((t) => t.boxId === drawerDevice.boxId);
    if (!live) return drawerDevice as BatteryDevice & { trend?: Array<{ recordedAt: string; batteryPercent: number; batteryVoltage: number }> };
    return {
      ...drawerDevice,
      boxId: drawerDevice.boxId,
      batteryPercent: live.batteryLevel,
      batteryVoltage: live.batteryVoltage,
      batteryStatus: resolveBatteryStatus(live.batteryLevel),
      lastUpdated: live.lastUpdated,
    };
  }, [drawerDevice, telemetryDevices]);

  const distributionData = analytics?.distribution ?? [];
  const lowestData = (analytics?.lowestDevices ?? []).map((item) => ({
    name: item.serialNo ?? `Box ${item.boxId}`,
    battery: item.batteryPercent,
  }));

  return (
    <Box>
      <PageHeader
        title="Battery Health"
        subtitle="Dedicated battery monitoring dashboard for all S-Boxes"
      />

      <Box
        display="grid"
        gridTemplateColumns={{
          xs: '1fr',
          sm: '1fr 1fr',
          md: 'repeat(2, 1fr)',
          lg: 'repeat(4, 1fr)',
        }}
        gap={2}
        mb={3}
      >
        <MetricCard
          title="Total Devices"
          value={liveSummary?.totalDevices ?? 0}
          subtitle="Registered S-Boxes"
          icon={DevicesIcon}
          color="primary.main"
        />
        <MetricCard
          title="Healthy Batteries"
          value={liveSummary?.healthyCount ?? 0}
          subtitle="Battery > 50%"
          icon={BatteryFullIcon}
          color="#2e7d32"
        />
        <MetricCard
          title="Warning Batteries"
          value={liveSummary?.warningCount ?? 0}
          subtitle="Battery 20% – 50%"
          icon={BatteryChargingFullIcon}
          color="#ed6c02"
        />
        <MetricCard
          title="Critical Batteries"
          value={liveSummary?.criticalCount ?? 0}
          subtitle="Battery < 20%"
          icon={BatteryAlertIcon}
          color="#d32f2f"
        />
      </Box>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 300 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={1}>
                Battery Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={distributionData} dataKey="count" nameKey="status" outerRadius={80} label>
                    {distributionData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 300 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={1}>
                Top 10 Lowest Battery Devices
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={lowestData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="battery" fill="#ed6c02" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 2, p: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ md: 'center' }}
        >
          <TextField
            select
            size="small"
            label="S-Box"
            value={filters.boxId ?? ''}
            onChange={(e) =>
              updateFilter({ boxId: e.target.value ? Number(e.target.value) : undefined })
            }
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All S-Boxes</MenuItem>
            {sboxes.map((sbox) => (
              <MenuItem key={sbox.id} value={sbox.id}>
                {sbox.serialNo}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Location"
            value={filters.locationId ?? ''}
            onChange={(e) =>
              updateFilter({
                locationId: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All Locations</MenuItem>
            {locations.map((loc) => (
              <MenuItem key={loc.id} value={loc.id}>
                {loc.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Work Area"
            value={filters.workAreaId ?? ''}
            onChange={(e) =>
              updateFilter({
                workAreaId: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All Work Areas</MenuItem>
            {workAreas.map((area) => (
              <MenuItem key={area.id} value={area.id}>
                {area.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Battery Status"
            value={filters.batteryStatus ?? ''}
            onChange={(e) =>
              updateFilter({ batteryStatus: e.target.value || undefined })
            }
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Healthy">Healthy</MenuItem>
            <MenuItem value="Warning">Warning</MenuItem>
            <MenuItem value="Critical">Critical</MenuItem>
          </TextField>

          <Button
            variant="outlined"
            startIcon={<RestartAltIcon />}
            onClick={resetFilters}
          >
            Reset Filters
          </Button>
        </Stack>
      </Card>

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>S-Box</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Work Area</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Gauge</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Battery %</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Voltage</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Last Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : liveDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No devices found
                  </TableCell>
                </TableRow>
              ) : (
                liveDevices.map((device) => (
                  <TableRow
                    key={device.boxId}
                    hover
                    sx={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                    onClick={() => setSelectedBoxId(device.boxId)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {device.serialNo ?? `Box #${device.boxId}`}
                      </Typography>
                    </TableCell>
                    <TableCell>{device.locationName ?? '—'}</TableCell>
                    <TableCell>{device.workAreaName ?? '—'}</TableCell>
                    <TableCell>
                      <BatteryGauge percent={device.batteryPercent ?? 0} />
                    </TableCell>
                    <TableCell sx={{ minWidth: 140 }}>
                      <BatteryProgressBar percent={device.batteryPercent ?? 0} />
                    </TableCell>
                    <TableCell>
                      {device.batteryVoltage != null
                        ? `${device.batteryVoltage.toFixed(2)}V`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        label={device.batteryStatus}
                        color={batteryStatusMuiColor(device.batteryStatus)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={formatRelativeTime(device.lastUpdated ?? device.lastSeen)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={devicesPage?.total ?? 0}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 20, 50]}
        />
      </Card>

      <BatteryDetailDrawer
        open={selectedBoxId !== null}
        device={liveDrawerDevice}
        onClose={() => setSelectedBoxId(null)}
      />
    </Box>
  );
};
