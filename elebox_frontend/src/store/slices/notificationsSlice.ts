import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { logout } from '@/store/slices/authSlice';
import type { SystemNotification } from '@/types';

const MAX_BELL_ITEMS = 30;

interface NotificationsState {
  items: SystemNotification[];
  unreadCount: number;
  bellItems: SystemNotification[];
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  bellItems: [],
};

const mapSocketNotification = (payload: Record<string, unknown>): SystemNotification => ({
  id: Number(payload.id),
  deviceId: payload.device_id != null ? Number(payload.device_id) : undefined,
  controllerName: (payload.controller_name as string | undefined) ?? undefined,
  severity: (payload.severity as SystemNotification['severity']) ?? 'INFO',
  title: String(payload.title ?? 'Notification'),
  message: String(payload.message ?? ''),
  notificationType: String(payload.notification_type ?? 'GENERIC'),
  timestamp: String(payload.timestamp ?? new Date().toISOString()),
  isRead: false,
});

const upsertBellItem = (items: SystemNotification[], notification: SystemNotification) => {
  const index = items.findIndex((item) => item.id === notification.id);
  if (index >= 0) {
    items[index] = notification;
    return;
  }
  items.unshift(notification);
  if (items.length > MAX_BELL_ITEMS) {
    items.length = MAX_BELL_ITEMS;
  }
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications: (
      state,
      action: PayloadAction<{ items: SystemNotification[]; unreadCount: number }>,
    ) => {
      state.items = action.payload.items;
      state.unreadCount = action.payload.unreadCount;
    },
    upsertNotificationFromSocket: (state, action: PayloadAction<Record<string, unknown>>) => {
      const notification = mapSocketNotification(action.payload);
      upsertBellItem(state.bellItems, notification);
    },
    dismissBellNotification: (state, action: PayloadAction<number>) => {
      state.bellItems = state.bellItems.filter((item) => item.id !== action.payload);
    },
    clearBellNotifications: (state) => {
      state.bellItems = [];
    },
    markNotificationRead: (state, action: PayloadAction<number>) => {
      const item = state.items.find((notification) => notification.id === action.payload);
      if (item && !item.isRead) {
        item.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllNotificationsRead: (state) => {
      state.items.forEach((item) => {
        item.isRead = true;
      });
      state.unreadCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout, (state) => {
      state.bellItems = [];
    });
  },
});

export const {
  setNotifications,
  upsertNotificationFromSocket,
  dismissBellNotification,
  clearBellNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = notificationsSlice.actions;
export default notificationsSlice.reducer;
