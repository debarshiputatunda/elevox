import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type MonitoringEventLevel = 'info' | 'warning' | 'danger';

export interface MonitoringEvent {
  id: string;
  timestamp: string;
  message: string;
  level: MonitoringEventLevel;
}

interface MonitoringState {
  safetyModeEnabled: boolean;
  events: MonitoringEvent[];
}

const MAX_EVENTS = 50;

const initialState: MonitoringState = {
  safetyModeEnabled: false,
  events: [{
    id: 'boot',
    timestamp: new Date().toISOString(),
    message: 'Monitoring command center online.',
    level: 'info',
  }],
};

const monitoringSlice = createSlice({
  name: 'monitoring',
  initialState,
  reducers: {
    setSafetyModeEnabled: (state, action: PayloadAction<boolean>) => {
      state.safetyModeEnabled = action.payload;
    },
    addMonitoringEvent: (
      state,
      action: PayloadAction<{ message: string; level?: MonitoringEventLevel }>,
    ) => {
      state.events.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        message: action.payload.message,
        level: action.payload.level ?? 'info',
      });
      if (state.events.length > MAX_EVENTS) {
        state.events = state.events.slice(0, MAX_EVENTS);
      }
    },
    clearMonitoringEvents: (state) => {
      state.events = [];
    },
  },
});

export const {
  setSafetyModeEnabled,
  addMonitoringEvent,
  clearMonitoringEvents,
} = monitoringSlice.actions;

export default monitoringSlice.reducer;
