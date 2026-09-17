import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Badge,
  Box,
  Button,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import DevicesIcon from '@mui/icons-material/Devices';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import StopIcon from '@mui/icons-material/Stop';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ConnectionStatusChip } from '@/components/common/ConnectionStatusChip';
import { DeviceMonitoringCard } from '@/components/monitoring/DeviceMonitoringCard';
import { MonitoringBoxCard } from '@/components/monitoring/MonitoringBoxCard';
import { MonitoringFilterPopover } from '@/components/monitoring/MonitoringFilterPopover';
import { monitoringMono } from '@/constants/monitoringTheme';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { useNow } from '@/hooks/useNow';
import { usePermission } from '@/hooks/usePermission';
import { useDeviceTelemetrySubscription } from '@/hooks/useTelemetryWebSocket';
import {
  HOOK_RECORDING_INTERVALS,
  useHookRecording,
  type HookRecordingInterval,
} from '@/hooks/useHookRecording';
import { fetchTelemetry } from '@/store/slices/telemetrySlice';
import { monitoringService } from '@/services/monitoringService';
import { alarmService } from '@/services/alarmService';
import { sboxService } from '@/services/sboxService';
import { workAreaService } from '@/services/workAreaService';
import { locationService } from '@/services/locationService';
import { formatDateTime } from '@/utils/helpers';
import { applyLiveConnectivity } from '@/utils/deviceConnectivity';
import { mergeMonitoringDevices } from '@/utils/monitoringHelpers';
import { useHookThresholdSettings } from '@/hooks/useHookThresholdSettings';
import type { WebSocketConnectionStatus } from '@/services/websocketService';

export const MonitoringPage = () => {
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { can } = usePermission();
  const { devices, loading, error, lastUpdated } = useAppSelector((s) => s.telemetry);
  const wsStatus = useAppSelector((s) => s.websocket.status);
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [selectedWorkAreas, setSelectedWorkAreas] = useState<Set<string>>(new Set());
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [triggeringAlarm, setTriggeringAlarm] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedBoxId, setSelectedBoxId] = useState<number | null>(() => {
    const raw = searchParams.get('boxId');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  });

  const isDetailView = selectedBoxId !== null;

  const { data: sboxResponse, isLoading: sboxesLoading } = useQuery({
    queryKey: ['sboxes', 'monitoring-options'],
    queryFn: () => sboxService.getAll({ page: 1, pageSize: 200 }),
  });
  const sboxes = sboxResponse?.data ?? [];

  // Fetch all configured locations and work areas so the filter shows
  // every option — including those with no devices currently assigned.
  // Permissions: Admin (manage) and Manager (view) get full data;
  // Employee falls back to device-derived lists below.
  const { data: allLocations = [] } = useQuery({
    queryKey: ['locations', 'filter-options'],
    queryFn: () => locationService.list(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: allWorkAreas = [] } = useQuery({
    queryKey: ['work-areas', 'filter-options'],
    queryFn: () => workAreaService.list(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const now = useNow(1000);

  const monitoringCards = useMemo(
    () => mergeMonitoringDevices(devices, sboxes).map((device) => applyLiveConnectivity(device, now)),
    [devices, sboxes, now],
  );

  const locationOptions = useMemo(() => {
    if (allLocations.length > 0) {
      return [...new Set(allLocations.map((l) => l.name).filter(Boolean))].sort();
    }
    // Fallback: derive from device cards (Employee role)
    const names = monitoringCards
      .map((d) => d.locationName)
      .filter((n): n is string => Boolean(n));
    return [...new Set(names)].sort();
  }, [allLocations, monitoringCards]);

  const workAreaOptions = useMemo(() => {
    // Work areas are gated behind location selection (hierarchical filter)
    if (selectedLocations.size === 0) {
      return [];
    }
    if (allWorkAreas.length > 0) {
      const relevant = allWorkAreas.filter(
        (wa) => wa.locationName != null && selectedLocations.has(wa.locationName),
      );
      return [...new Set(relevant.map((wa) => wa.name).filter(Boolean))].sort();
    }
    // Fallback: derive from device cards (Employee role)
    const relevant = monitoringCards.filter(
      (d) => d.locationName != null && selectedLocations.has(d.locationName),
    );
    const names = relevant
      .map((d) => d.workAreaName)
      .filter((n): n is string => Boolean(n));
    return [...new Set(names)].sort();
  }, [allWorkAreas, selectedLocations, monitoringCards]);

  const filteredCards = useMemo(() => {
    const result = monitoringCards.filter((d) => {
      const locOk =
        selectedLocations.size === 0
        || (d.locationName != null && selectedLocations.has(d.locationName));
      const zoneOk =
        selectedWorkAreas.size === 0
        || (d.workAreaName != null && selectedWorkAreas.has(d.workAreaName));
      return locOk && zoneOk;
    });
    return result;
  }, [monitoringCards, selectedLocations, selectedWorkAreas]);

  const activeFilterCount = selectedLocations.size + selectedWorkAreas.size;

  const handleLocationToggle = (location: string) => {
    setSelectedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(location)) {
        next.delete(location);
      } else {
        next.add(location);
      }
      return next;
    });
    setSelectedWorkAreas(new Set());
  };

  const handleWorkAreaToggle = (workArea: string) => {
    setSelectedWorkAreas((prev) => {
      const next = new Set(prev);
      if (next.has(workArea)) {
        next.delete(workArea);
      } else {
        next.add(workArea);
      }
      return next;
    });
  };

  const handleLocationSelectAll = () => {
    setSelectedLocations(new Set());
    setSelectedWorkAreas(new Set());
  };

  const handleWorkAreaSelectAll = () => {
    setSelectedWorkAreas(new Set());
  };

  const handleClearFilters = () => {
    setSelectedLocations(new Set());
    setSelectedWorkAreas(new Set());
  };

  const selectedDevice = useMemo(() => {
    if (!selectedBoxId) return undefined;
    return monitoringCards.find((device) => device.boxId === selectedBoxId);
  }, [monitoringCards, selectedBoxId]);

  const allBoxIds = useMemo(
    () => monitoringCards.map((device) => device.boxId),
    [monitoringCards],
  );

  useDeviceTelemetrySubscription('monitoring-grid', allBoxIds);
  useDeviceTelemetrySubscription(
    'monitoring-focus',
    selectedBoxId ? [selectedBoxId] : [],
    selectedBoxId ? [selectedBoxId] : [],
  );

  const { data: fetchedDevice, isLoading: deviceLoading } = useQuery({
    queryKey: ['telemetry', selectedBoxId],
    queryFn: () => monitoringService.getTelemetryByBox(selectedBoxId!),
    enabled: isDetailView && !devices.some((device) => device.boxId === selectedBoxId),
    refetchInterval: isDetailView ? 15000 : false,
  });

  const sourceDevice = selectedDevice ?? fetchedDevice;
  const activeDevice = useMemo(
    () => (sourceDevice ? applyLiveConnectivity(sourceDevice, now) : undefined),
    [sourceDevice, now],
  );

  const loadTelemetry = useCallback(() => {
    dispatch(fetchTelemetry());
  }, [dispatch]);

  useEffect(() => {
    loadTelemetry();
  }, [loadTelemetry]);

  const {
    thresholds: activeHookThresholds,
    setThreshold: setHookThreshold,
    saveState: thresholdSaveState,
    retry: retryThresholdSave,
  } = useHookThresholdSettings(activeDevice);

  const {
    isRecording,
    sampleCount,
    intervalSec,
    setIntervalSec,
    start: startRecording,
    stop: stopRecording,
  } = useHookRecording(activeDevice, activeHookThresholds);

  const handleTriggerAlarm = async () => {
    if (!activeDevice) return;
    setTriggeringAlarm(true);
    try {
      const result = await alarmService.trigger(activeDevice.boxId);
      enqueueSnackbar(result.message, { variant: result.success ? 'success' : 'error' });
    } catch (err: unknown) {
      enqueueSnackbar((err as { message?: string })?.message ?? 'Failed to trigger alarm', {
        variant: 'error',
      });
    } finally {
      setTriggeringAlarm(false);
    }
  };

  const handleSelectBox = (boxId: number) => {
    setSelectedBoxId(boxId);
    setSearchParams({ boxId: String(boxId) }, { replace: true });
  };

  const handleBack = () => {
    setSelectedBoxId(null);
    setSearchParams({}, { replace: true });
  };

  const listLoading = (loading || sboxesLoading) && monitoringCards.length === 0;

  if (isDetailView) {
    return (
      <Box>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
          mb={3}
          flexWrap="wrap"
          gap={2}
        >
          <Box display="flex" alignItems="center" gap={1.5} minWidth={0}>
            <IconButton
              onClick={handleBack}
              aria-label="Back to all controllers"
              sx={{ flexShrink: 0, width: 44, height: 44 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Box minWidth={0}>
              <Typography variant="h6" fontWeight={700} noWrap>
                Live Monitoring
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Capacitive load sensors and hardware integrity
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 108 }} disabled={isRecording}>
              <InputLabel id="hook-record-interval-label">Interval</InputLabel>
              <Select
                labelId="hook-record-interval-label"
                label="Interval"
                value={intervalSec}
                onChange={(event) =>
                  setIntervalSec(Number(event.target.value) as HookRecordingInterval)
                }
              >
                {HOOK_RECORDING_INTERVALS.map((seconds) => (
                  <MenuItem key={seconds} value={seconds}>
                    {seconds}s
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant={isRecording ? 'contained' : 'outlined'}
              color={isRecording ? 'error' : 'primary'}
              size="small"
              startIcon={isRecording ? <StopIcon /> : <FiberManualRecordIcon />}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!activeDevice}
              sx={{ fontWeight: 700 }}
            >
              {isRecording ? `Stop (${sampleCount})` : 'Record'}
            </Button>
            <Tooltip title="Refresh">
              <IconButton onClick={loadTelemetry} size="small">
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {lastUpdated && (
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={2}>
            <ConnectionStatusChip status={wsStatus as WebSocketConnectionStatus} />
            <Typography
              variant="caption"
              color="text.secondary"
              fontFamily={monitoringMono}
            >
              Sync {formatDateTime(lastUpdated)}
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {activeDevice && (
          <Box role="status" display="flex" alignItems="center" gap={1} mb={1}>
            <Typography variant="caption" color={thresholdSaveState === 'error' ? 'error' : 'text.secondary'}>
              {thresholdSaveState === 'saving' ? 'Saving thresholds…'
                : thresholdSaveState === 'error' ? 'Thresholds not saved to the server. Retry the save.'
                  : 'Thresholds saved'}
            </Typography>
            <Typography variant="caption" color={activeDevice.thresholdSync === 'error' ? 'error' : 'text.secondary'}>
              {!activeDevice.isOnline ? 'Device offline — local limits cannot be confirmed'
                : activeDevice.thresholdSync === 'error' ? 'Device sync failed — retrying automatically'
                : activeDevice.firmwareProtocol === 'elevox-v5/1'
                  ? (activeDevice.thresholdSync === 'synced'
                    && activeDevice.deviceThresholdA === activeHookThresholds.hookA
                    && activeDevice.deviceThresholdB === activeHookThresholds.hookB
                    ? 'Device limits confirmed' : 'Waiting for device to confirm limits')
                  : activeDevice.thresholdSync === 'unsupported' ? 'Firmware upgrade required for threshold sync'
                    : activeDevice.thresholdSync === 'backend-only' ? 'Legacy firmware — hook limits run on the backend' : 'Waiting for live device confirmation'}
            </Typography>
            {thresholdSaveState === 'error'  && <Button size="small" onClick={retryThresholdSave}>Retry</Button>}
          </Box>
        )}

        {deviceLoading && !activeDevice ? (
          <LoadingSkeleton variant="card" rows={4} />
        ) : !activeDevice ? (
          <EmptyState
            title="Controller not found"
            description="This S-Box is unavailable or no longer assigned."
            actionLabel="Back to monitoring"
            onAction={handleBack}
            icon={DevicesIcon}
          />
        ) : (
          <DeviceMonitoringCard
            device={activeDevice}
            wsStatus={wsStatus}
            triggeringAlarm={triggeringAlarm}
            hookAThreshold={activeHookThresholds.hookA}
            hookBThreshold={activeHookThresholds.hookB}
            canTriggerAlarm={can('alarms')}
            onHookAThresholdChange={(value) => setHookThreshold('hookA', value)}
            onHookBThresholdChange={(value) => setHookThreshold('hookB', value)}
            onTriggerAlarm={handleTriggerAlarm}
          />
        )}
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Monitoring"
        subtitle="Select a controller to view live telemetry"
        action={(
          <Box display="flex" alignItems="center" gap={1}>
            <Badge badgeContent={activeFilterCount} color="primary">
              <Button
                variant="outlined"
                size="small"
                startIcon={<FilterListIcon />}
                onClick={(event) => setFilterAnchorEl(event.currentTarget)}
                disabled={locationOptions.length === 0 && workAreaOptions.length === 0}
              >
                Filter
              </Button>
            </Badge>
            <Tooltip title="Refresh">
              <IconButton onClick={loadTelemetry} size="small">
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      />

      <MonitoringFilterPopover
        open={Boolean(filterAnchorEl)}
        anchorEl={filterAnchorEl}
        onClose={() => setFilterAnchorEl(null)}
        locationOptions={locationOptions}
        workAreaOptions={workAreaOptions}
        selectedLocations={selectedLocations}
        selectedWorkAreas={selectedWorkAreas}
        onLocationToggle={handleLocationToggle}
        onWorkAreaToggle={handleWorkAreaToggle}
        onLocationSelectAll={handleLocationSelectAll}
        onWorkAreaSelectAll={handleWorkAreaSelectAll}
        onClear={handleClearFilters}
      />

      {lastUpdated && (
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={2}>
          <ConnectionStatusChip status={wsStatus as WebSocketConnectionStatus} />
          <Typography
            variant="caption"
            color="text.secondary"
            fontFamily={monitoringMono}
          >
            Sync {formatDateTime(lastUpdated)}
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {listLoading ? (
        <LoadingSkeleton variant="card" rows={4} />
      ) : monitoringCards.length === 0 ? (
        <EmptyState
          title="No S-Boxes"
          description="No controllers are available for monitoring yet."
          icon={DevicesIcon}
        />
      ) : filteredCards.length === 0 ? (
        <EmptyState
          title="No matching controllers"
          description="No S-Boxes match the selected location or work area filters."
          actionLabel="Clear filters"
          onAction={handleClearFilters}
          icon={DevicesIcon}
        />
      ) : (
        <Grid container spacing={2}>
          {filteredCards.map((device) => (
            <Grid item xs={12} sm={6} lg={4} xl={3} key={device.boxId}>
              <MonitoringBoxCard device={device} onSelect={handleSelectBox} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};
