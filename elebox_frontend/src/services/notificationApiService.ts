import { apiClient, isMockMode } from '@/api/client';
import { MOCK_VIOLATIONS, MOCK_USERS } from '@/mocks/data';
import type {
  NotificationFilterParams,
  PaginatedResponse,
  SystemNotification,
} from '@/types';
import { delay, paginate } from '@/utils/helpers';

interface BackendNotification {
  notification_id: number;
  box_id?: number | null;
  serial_no?: string | null;
  box_ip?: string | null;
  location_id?: number | null;
  location_name?: string | null;
  work_area_id?: number | null;
  work_area_name?: string | null;
  user_id?: number | null;
  employee_id?: string | null;
  employee_name?: string | null;
  email?: string | null;
  phone?: string | null;
  severity: string;
  title: string;
  message: string;
  notification_type: string;
  created_at: string;
  is_read: boolean;
}

interface BackendNotificationListResponse {
  data: BackendNotification[];
  total: number;
  page: number;
  page_size: number;
  unread_count: number;
}

const mapNotification = (item: BackendNotification): SystemNotification => ({
  id: item.notification_id,
  boxId: item.box_id ?? undefined,
  serialNo: item.serial_no ?? undefined,
  boxIp: item.box_ip ?? undefined,
  locationId: item.location_id ?? undefined,
  locationName: item.location_name ?? undefined,
  workAreaId: item.work_area_id ?? undefined,
  workAreaName: item.work_area_name ?? undefined,
  userId: item.user_id ?? undefined,
  employeeId: item.employee_id ?? undefined,
  employeeName: item.employee_name ?? undefined,
  email: item.email ?? undefined,
  phone: item.phone ?? undefined,
  deviceId: item.box_id ?? undefined,
  controllerName: item.serial_no ?? undefined,
  severity: item.severity,
  title: item.title,
  message: item.message,
  notificationType: item.notification_type,
  timestamp: item.created_at,
  isRead: item.is_read,
});

const buildQueryParams = (params?: NotificationFilterParams) => ({
  page: params?.page,
  page_size: params?.pageSize,
  search: params?.search,
  severity: params?.severity,
  notification_type: params?.notificationType,
  is_read: params?.isRead,
  sbox_id: params?.sboxId,
  serial_no: params?.serialNo,
  location_id: params?.locationId,
  user_id: params?.userId,
  employee_id: params?.employeeId,
  employee_name: params?.employeeName,
  start_date: params?.startDate,
  end_date: params?.endDate,
});

const filterMockNotifications = (
  items: SystemNotification[],
  params?: NotificationFilterParams,
) => {
  let filtered = [...items];
  if (params?.search) {
    const term = params.search.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(term)
        || item.message.toLowerCase().includes(term)
        || (item.serialNo ?? '').toLowerCase().includes(term)
        || (item.locationName ?? '').toLowerCase().includes(term)
        || (item.employeeName ?? '').toLowerCase().includes(term)
        || (item.employeeId ?? '').toLowerCase().includes(term),
    );
  }
  if (params?.severity) {
    filtered = filtered.filter((item) => item.severity === params.severity);
  }
  if (params?.notificationType) {
    filtered = filtered.filter(
      (item) => item.notificationType === params.notificationType,
    );
  }
  if (params?.isRead !== undefined) {
    filtered = filtered.filter((item) => item.isRead === params.isRead);
  }
  if (params?.sboxId) {
    filtered = filtered.filter((item) => item.boxId === params.sboxId);
  }
  if (params?.locationId) {
    filtered = filtered.filter((item) => item.locationId === params.locationId);
  }
  if (params?.userId) {
    filtered = filtered.filter((item) => item.userId === params.userId);
  }
  if (params?.employeeId) {
    filtered = filtered.filter((item) => item.employeeId === params.employeeId);
  }
  if (params?.employeeName) {
    const term = params.employeeName.toLowerCase();
    filtered = filtered.filter((item) =>
      (item.employeeName ?? '').toLowerCase().includes(term),
    );
  }
  return filtered;
};

export const notificationApiService = {
  getAll: async (
    params?: NotificationFilterParams,
  ): Promise<PaginatedResponse<SystemNotification> & { unreadCount: number }> => {
    if (isMockMode()) {
      await delay(400);
      const mockUser = MOCK_USERS[0];
      const mapped = MOCK_VIOLATIONS.map((item, index) => ({
        id: item.id,
        boxId: Number(item.deviceId) || index + 1,
        serialNo: item.serialNumber,
        boxIp: '192.168.1.100',
        locationId: 1,
        locationName: item.location,
        workAreaId: 1,
        workAreaName: item.workArea,
        userId: mockUser?.id,
        employeeId: mockUser?.employeeId,
        employeeName: mockUser?.fullName,
        email: mockUser?.email,
        phone: mockUser?.mobileNumber,
        deviceId: Number(item.deviceId) || undefined,
        controllerName: item.serialNumber,
        severity: item.severity === 'Critical' ? 'CRITICAL' : 'WARNING',
        title: item.violationType,
        message: item.reason ?? item.violationType,
        notificationType: item.violationType.toUpperCase().replace(/\s+/g, '_'),
        timestamp: `${item.date}T${item.time}`,
        isRead: item.status === 'Resolved',
      })) as SystemNotification[];
      const filtered = filterMockNotifications(mapped, params);
      const result = paginate(filtered, {
        page: params?.page,
        pageSize: params?.pageSize,
      });
      return {
        ...result,
        unreadCount: mapped.filter((item) => !item.isRead).length,
      };
    }

    const { data } = await apiClient.get<BackendNotificationListResponse>(
      '/notifications',
      { params: buildQueryParams(params) },
    );

    return {
      data: data.data.map(mapNotification),
      total: data.total,
      page: data.page,
      pageSize: data.page_size,
      unreadCount: data.unread_count,
    };
  },

  exportCsv: async (params?: NotificationFilterParams): Promise<void> => {
    if (isMockMode()) {
      await delay(300);
      return;
    }
    const response = await apiClient.get('/notifications/export', {
      params: buildQueryParams(params),
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'notifications_export.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  markRead: async (id: number): Promise<void> => {
    if (isMockMode()) {
      await delay(200);
      return;
    }
    await apiClient.patch(`/notifications/${id}/read`);
  },

  markAllRead: async (params?: NotificationFilterParams): Promise<void> => {
    if (isMockMode()) {
      await delay(200);
      return;
    }
    await apiClient.patch('/notifications/read-all', null, {
      params: buildQueryParams(params),
    });
  },
};

export type { NotificationFilterParams } from '@/types';
