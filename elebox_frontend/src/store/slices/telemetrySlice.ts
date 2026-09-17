import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { monitoringService } from '@/services/monitoringService';
import type { TelemetryData } from '@/types';

interface TelemetryState {
  devices: TelemetryData[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: TelemetryState = {
  devices: [],
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
        state.devices[idx] = action.payload;
      } else {
        state.devices.push(action.payload);
      }
      state.lastUpdated = action.payload.lastUpdated;
    },
    setDevices: (state, action: PayloadAction<TelemetryData[]>) => {
      state.devices = action.payload;
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
      .addCase(fetchTelemetry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTelemetry.fulfilled, (state, action) => {
        state.loading = false;
        state.devices = action.payload;
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
