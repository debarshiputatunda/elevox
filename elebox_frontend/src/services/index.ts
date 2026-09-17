import {
  MOCK_TICKETS,
  MOCK_DASHBOARD_SUMMARY,
  MOCK_NOTIFICATION_SETTINGS,
} from '@/mocks/data';
import { createCrudService } from './crudService';
import { authService } from './authService';
import { locationService } from './locationService';
import { roleService } from './roleService';
import { userService } from './userService';
import { workAreaService } from './workAreaService';
import { sboxService } from './sboxService';
import { monitoringService } from './monitoringService';
import { notificationApiService } from './notificationApiService';
import { alarmService } from './alarmService';
import { importService } from './importService';
import { batteryHealthService } from './batteryHealthService';
import { apiClient, isMockMode } from '@/api/client';
import { delay } from '@/utils/helpers';
import type {
  DashboardSummary,
  NotificationSetting,
} from '@/types';

const ticketsStore = { current: [...MOCK_TICKETS] };
const notificationsStore = { current: [...MOCK_NOTIFICATION_SETTINGS] };

export {
  authService,
  locationService,
  roleService,
  userService,
  workAreaService,
  sboxService,
  monitoringService,
  notificationApiService,
  alarmService,
  importService,
  batteryHealthService,
};

export const ticketService = createCrudService('/tickets', ticketsStore);
export const notificationService = createCrudService<NotificationSetting>(
  '/notifications/settings',
  notificationsStore,
);

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    if (isMockMode()) {
      await delay(500);
      return MOCK_DASHBOARD_SUMMARY;
    }
    const { data } = await apiClient.get('/monitoring/dashboard');
    return {
      totalDevices: data.total_devices,
      activeDevices: data.online_devices,
      offlineDevices: data.offline_devices,
      totalViolations: data.unread_notifications,
      todayViolations: data.critical_notifications,
      criticalAlerts: data.active_alarms,
    };
  },
};

// Backward-compatible aliases
export const violationService = notificationApiService;
