import { newerHookRevision } from '@/utils/hookAlarmRanges';
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { sboxService } from '@/services/sboxService';
import { monitoringService } from '@/services/monitoringService';
import type { TelemetryData } from '@/types';

interface TelemetryState {
  devices: TelemetryData[];
  hookRangeWrites: Record<number, { status: 'pending' | 'confirmed' | 'error'; error?: string; ranges?: TelemetryData['hookAlarmRanges']; revision?: number; confirmedAt?: number }>;
  buckleAlarmWrites: Record<number, {
    status: 'pending' | 'confirmed' | 'error';
    error?: string;
    enabled?: boolean;
    confirmedAt?: number;
  }>;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: TelemetryState = {
  devices: [],
  buckleAlarmWrites: {},
  hookRangeWrites: {},
  loading: false,
  error: null,
  lastUpdated: null,
};

export const fetchTelemetry = createAsyncThunk(
  'telemetry/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await monitoringService.getTelemetry();
    } catch (err: unknown) {
      return rejectWithValue((err as { message?: string })?.message ?? 'Failed to load telemetry');
    }
  },
);

export const setDeviceBuckleAlarm = createAsyncThunk(
  'telemetry/setBuckleAlarm',
  async ({ boxId, enabled }: { boxId: number; enabled: boolean }, { rejectWithValue }) => {
    try {
      const result = await sboxService.setBuckleAlarm(boxId, enabled);
      return { boxId, enabled: result.enabled, confirmedAt: Date.parse(result.confirmed_at ?? '') || Date.now() };
    } catch (err: unknown) {
      return rejectWithValue((err as { message?: string })?.message ?? 'Device did not confirm the setting.');
    }
  },
  { condition: ({ boxId }, { getState }) =>
    (getState() as { telemetry: TelemetryState }).telemetry.buckleAlarmWrites[boxId]?.status !== 'pending' },
);

export const setDeviceHookRanges = createAsyncThunk(
  'telemetry/setHookRanges',
  async ({ boxId, ranges, expectedRevision }: { boxId: number; ranges: import('@/utils/hookAlarmRanges').HookAlarmRanges; expectedRevision: number }, { rejectWithValue }) => {
    try { return { boxId, ...await sboxService.setHookRanges(boxId, ranges, expectedRevision) }; }
    catch (err: unknown) { return rejectWithValue((err as { message?: string })?.message ?? 'Device did not confirm hook ranges.'); }
  },
  { condition: ({ boxId }, { getState }) => (getState() as { telemetry: TelemetryState }).telemetry.hookRangeWrites[boxId]?.status !== 'pending' },
);

// Cached HTTP responses and delayed WebSocket frames must not undo a confirmed write.
const mergeConfirmedSetting = (state: TelemetryState, device: TelemetryData): TelemetryData => {
  const previous = state.devices.find((item) => item.boxId === device.boxId);
  const rangeWrite = state.hookRangeWrites[device.boxId];
  const sample = Date.parse(device.lastUpdated);
  const previousTime = previous ? Date.parse(previous.lastUpdated) : 0;
  // Reject older settings even before any application-originated write.
  if (previous?.hookAlarmRanges && (!device.hookAlarmRanges || sample < previousTime ||
      newerHookRevision(previous.hookRangesRevision, device.hookRangesRevision))) {
    device = { ...device, hookAlarmRanges: previous.hookAlarmRanges, hookRangesRevision: previous.hookRangesRevision };
  }
  if (rangeWrite?.ranges && rangeWrite.revision != null &&
      (newerHookRevision(rangeWrite.revision, device.hookRangesRevision) || ((device.hookRangesRevision ?? -1) === rangeWrite.revision && (!Number.isFinite(sample) || sample <= (rangeWrite.confirmedAt ?? 0))))) {
    device = { ...device, hookAlarmRanges: rangeWrite.ranges, hookRangesRevision: rangeWrite.revision };
  }
  const write = state.buckleAlarmWrites[device.boxId];
  const sampleTime = Date.parse(device.lastUpdated);
  if (write?.confirmedAt && (!Number.isFinite(sampleTime) || sampleTime <= write.confirmedAt)) {
    return { ...device, buckleAlarmEnabled: write.enabled };
  }
  if (write?.confirmedAt && typeof device.buckleAlarmEnabled === 'boolean') {
    write.confirmedAt = sampleTime;
    write.enabled = device.buckleAlarmEnabled;
  }
  return device;
};

const findDeviceIndex = (devices: TelemetryData[], payload: TelemetryData) =>
  devices.findIndex(
    (device) => device.boxId === payload.boxId || device.deviceId === payload.deviceId,
  );

const telemetrySlice = createSlice({
  name: 'telemetry',
  initialState,
  reducers: {
    updateDevice: (state, action: PayloadAction<TelemetryData>) => {
      const idx = findDeviceIndex(state.devices, action.payload);
      if (idx >= 0) {
        state.devices[idx] = mergeConfirmedSetting(state, action.payload);
      } else {
        state.devices.push(mergeConfirmedSetting(state, action.payload));
      }
      state.lastUpdated = action.payload.lastUpdated;
    },
    setDevices: (state, action: PayloadAction<TelemetryData[]>) => {
      state.devices = action.payload.map((device) => mergeConfirmedSetting(state, device));
      state.lastUpdated = new Date().toISOString();
    },
    markDeviceOffline: (state, action: PayloadAction<number>) => {
      const boxId = action.payload;
      const idx = state.devices.findIndex(
        (device) => device.boxId === boxId || device.deviceId === String(boxId),
      );
      if (idx < 0) return;
      const device = state.devices[idx];
      if (!device.isOnline && device.status === 'offline') return;
      state.devices[idx] = {
        ...device,
        isOnline: false,
        connectivity: 'offline',
        status: 'offline',
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(setDeviceHookRanges.pending, (state, action) => {
        const id = action.meta.arg.boxId;
        state.hookRangeWrites[id] = { ...state.hookRangeWrites[id], status: 'pending', error: undefined };
      })
      .addCase(setDeviceHookRanges.fulfilled, (state, action) => {
        const { boxId, hook_alarm_ranges: ranges, hook_ranges_revision: revision, confirmed_at } = action.payload;
        state.hookRangeWrites[boxId] = { status: 'confirmed', ranges, revision, confirmedAt: Date.parse(confirmed_at) || Date.now() };
        const device = state.devices.find((item) => item.boxId === boxId);
        if (device && (device.hookRangesRevision === revision || newerHookRevision(revision, device.hookRangesRevision))) {
          device.hookAlarmRanges = ranges;
          device.hookRangesRevision = revision;
        }
      })
      .addCase(setDeviceHookRanges.rejected, (state, action) => {
        const id = action.meta.arg.boxId;
        state.hookRangeWrites[id] = { ...state.hookRangeWrites[id], status: 'error', error: action.payload as string };
      })
      .addCase(setDeviceBuckleAlarm.pending, (state, action) => {
        const boxId = action.meta.arg.boxId;
        state.buckleAlarmWrites[boxId] = { ...state.buckleAlarmWrites[boxId], status: 'pending', error: undefined };
      })
      .addCase(setDeviceBuckleAlarm.fulfilled, (state, action) => {
        const { boxId, enabled, confirmedAt } = action.payload;
        state.buckleAlarmWrites[boxId] = { status: 'confirmed', enabled, confirmedAt };
        const device = state.devices.find((item) => item.boxId === boxId);
        if (device) device.buckleAlarmEnabled = enabled;
      })
      .addCase(setDeviceBuckleAlarm.rejected, (state, action) => {
        const boxId = action.meta.arg.boxId;
        state.buckleAlarmWrites[boxId] = {
          ...state.buckleAlarmWrites[boxId], status: 'error', error: action.payload as string,
        };
      })
      .addCase(fetchTelemetry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTelemetry.fulfilled, (state, action) => {
        state.loading = false;
        state.devices = action.payload.map((device) => mergeConfirmedSetting(state, device));
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchTelemetry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { updateDevice, setDevices, markDeviceOffline } = telemetrySlice.actions;
export default telemetrySlice.reducer;
