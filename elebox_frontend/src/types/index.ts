export type UserRole = 'Admin' | 'Manager' | 'Employee';

export type AccountStatus = 'Active' | 'Inactive' | 'Blocked';

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type DeviceStatus = 'normal' | 'warning' | 'violation' | 'offline';

export type ViolationSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type ViolationStatus = 'Open' | 'Acknowledged' | 'Resolved';

export interface User {
  id: number;
  employeeId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  role: UserRole;
  roleId: number;
  roleIds: number[];
  jobTitleId: number;
  workAreaId: number;
  locationId: number;
  statusId: number;
  status: AccountStatus;
  workAreaName?: string;
  locationName?: string;
  jobTitleName?: string;
  createdAt?: string;
  photo?: string;
}

export interface UserFormValues {
  employeeId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  password: string;
  roleId: number;
  jobTitleId: number;
  workAreaId: number;
  locationId: number;
  statusId: number;
}

/** Payload sent to PUT /users/{id}/edit */
export interface UserEditRequest {
  employee_id: string;
  employee_name: string;
  email_id: string;
  phonenumber: string;
  status_id: number;
  job_title_id: number;
  work_area_id: number;
  location_id: number;
  role_ids: number[];
  password?: string;
}

export interface RoleOption {
  role_id: number;
  role_name: string;
  description?: string | null;
}

export interface AuthUser extends User {
  roles: UserRole[];
  permissions?: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user: AuthUser;
}

export interface Location {
  id: number;
  name: string;
  countryId: number;
  countryName?: string;
  cityId: number;
  cityName?: string;
}

export interface LocationFormValues {
  name: string;
  countryId: number;
  cityId: number;
}

export interface CountryOption {
  id: number;
  name: string;
}

export interface CityOption {
  id: number;
  name: string;
}

export interface WorkArea {
  id: number;
  name: string;
  locationId: number;
  locationName?: string;
}

export interface WorkAreaFormValues {
  name: string;
  locationId: number;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedUserId?: number;
  assignedUserName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SBox {
  id: number;
  serialNo: string;
  boxIp: string;
  boxDetails?: string;
  locationId: number;
  locationName?: string;
  workAreaId: number;
  workAreaName?: string;
  lastSeen?: string;
  isOnline?: boolean;
  connectivity?: 'online' | 'offline';
  activityStatus: number;
  activityStatusName?: string;
  boxHealthStatus?: number;
  boxHealthStatusName?: string;
  mfgDate?: string;
  hookAThreshold?: number;
  hookBThreshold?: number;
  isAssigned?: number;
}

export interface SBoxFormValues {
  serialNo?: string;
  boxIp: string;
  boxDetails?: string;
  locationId: number;
  workAreaId: number;
  activityStatus: number;
  mfgDate?: string;
}

export interface TelemetryData {
  boxId: number;
  deviceId: string;
  serialNumber: string;
  deviceName: string;
  ipAddress?: string;
  hookAValue: number;
  hookBValue: number;
  hookAPercent: number;
  hookBPercent: number;
  hookAThreshold: number;
  hookBThreshold: number;
  buckle1?: number;
  buckle2?: number;
  buckle3?: number;
  buckleStatus: 'secured' | 'unsecured' | 'unknown';
  alarmActive?: boolean;
  alarmCause?: string;
  buckleAlarmEnabled?: boolean | null;
  hookAlarmRanges?: import('@/utils/hookAlarmRanges').HookAlarmRanges;
  hookRangesRevision?: number;
  hookRawA?: number;
  hookRawB?: number;
  firmwareProtocol?: string;
  hookAValid?: boolean;
  hookBValid?: boolean;
  thresholdSync?: 'backend-only' | 'unsupported' | 'pending' | 'synced' | 'error';
  deviceThresholdA?: number | null;
  deviceThresholdB?: number | null;
  connectivity: 'online' | 'offline';
  isOnline: boolean;
  batteryLevel: number;
  batteryVoltage?: number;
  signalStrength: number;
  status: DeviceStatus;
  locationName?: string;
  workAreaName?: string;
  lastUpdated: string;
}

export interface TelemetryHistoryPoint {
  id: number;
  boxId: number;
  hookAValue: number;
  hookBValue: number;
  hookAPercent: number;
  hookBPercent: number;
  batteryLevel: number;
  batteryVoltage: number;
  alarmActive: boolean;
  recordedAt: string;
}

export type NotificationSeverityLevel =
  | 'INFO'
  | 'WARNING'
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW';

export interface SystemNotification {
  id: number;
  boxId?: number;
  serialNo?: string;
  boxIp?: string;
  locationId?: number;
  locationName?: string;
  workAreaId?: number;
  workAreaName?: string;
  userId?: number;
  employeeId?: string;
  employeeName?: string;
  email?: string;
  phone?: string;
  deviceId?: number;
  controllerName?: string;
  severity: NotificationSeverityLevel | string;
  title: string;
  message: string;
  notificationType: string;
  timestamp: string;
  isRead: boolean;
}

export interface NotificationFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  severity?: string;
  notificationType?: string;
  isRead?: boolean;
  sboxId?: number;
  serialNo?: string;
  locationId?: number;
  userId?: number;
  employeeId?: string;
  employeeName?: string;
  startDate?: string;
  endDate?: string;
}

export interface Violation {
  id: number;
  date: string;
  time: string;
  deviceId: string;
  serialNumber: string;
  location: string;
  workArea: string;
  violationType: string;
  severity: ViolationSeverity;
  status: ViolationStatus;
  hookAValue?: number;
  hookBValue?: number;
  buckleStatus?: string;
  reason?: string;
  assignedOfficer?: string;
  resolutionNotes?: string;
}

export interface DashboardSummary {
  totalDevices: number;
  activeDevices: number;
  offlineDevices: number;
  totalViolations: number;
  todayViolations: number;
  criticalAlerts: number;
}

export interface NotificationSetting {
  id: number;
  email: string;
  alertType: string;
  enabled: boolean;
}

export interface AlarmState {
  isActive: boolean;
  activeAlerts: number;
  criticalDevices: string[];
  lastActivated?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  message: string;
  status?: number;
  details?: Record<string, string[]>;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | number | undefined;
}

export type ImportType = 'locations' | 'work-areas' | 'users' | 'sboxes';

export interface ImportErrorDetail {
  row: number;
  message: string;
}

export interface ImportResponse {
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  errors: ImportErrorDetail[];
  import_id?: number | null;
}
