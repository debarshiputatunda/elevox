import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import dashboardReducer from './slices/dashboardSlice';
import telemetryReducer from './slices/telemetrySlice';
import notificationsReducer from './slices/notificationsSlice';
import websocketReducer from './slices/websocketSlice';
import monitoringReducer from './slices/monitoringSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    telemetry: telemetryReducer,
    notifications: notificationsReducer,
    websocket: websocketReducer,
    monitoring: monitoringReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
