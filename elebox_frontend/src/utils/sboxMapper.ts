import {
  ACTIVITY_STATUS_OPTIONS,
  BOX_HEALTH_STATUS_OPTIONS,
  lookupSboxStatusName,
} from '@/constants/sboxLookups';
import type { DeviceStatus, SBox, SBoxFormValues } from '@/types';

export interface BackendSBox {
  box_id: number;
  serial_no?: string | null;
  box_ip?: string | null;
  box_details?: string | null;
  location_id?: number | null;
  location_name?: string | null;
  work_area_id?: number | null;
  work_area_name?: string | null;
  last_seen?: string | null;
  is_online?: boolean | null;
  connectivity?: 'online' | 'offline' | null;
  activity_status?: number | null;
  activity_status_name?: string | null;
  box_health_status?: number | null;
  box_health_status_name?: string | null;
  mfg_date?: string | null;
  hookA_threshold?: number | null;
  hookB_threshold?: number | null;
  is_assigned?: number | null;
}

export const mapHealthToDeviceStatus = (sbox: SBox): DeviceStatus => {
  if (sbox.activityStatusName !== 'Active') return 'offline';
  if (sbox.isOnline === false || sbox.connectivity === 'offline') return 'offline';
  if (!sbox.lastSeen && sbox.isOnline !== true) return 'offline';
  if (sbox.boxHealthStatusName === 'Critical') return 'violation';
  if (sbox.boxHealthStatusName === 'Warning') return 'warning';
  return 'normal';
};

export const mapBackendSBox = (data: BackendSBox): SBox => ({
  id: data.box_id,
  serialNo: data.serial_no ?? '',
  boxIp: data.box_ip ?? '',
  boxDetails: data.box_details ?? undefined,
  locationId: data.location_id ?? 0,
  locationName: data.location_name ?? undefined,
  workAreaId: data.work_area_id ?? 0,
  workAreaName: data.work_area_name ?? undefined,
  lastSeen: data.last_seen ?? undefined,
  isOnline: data.is_online ?? undefined,
  connectivity: data.connectivity ?? undefined,
  activityStatus: data.activity_status ?? 1,
  activityStatusName:
    data.activity_status_name
    ?? lookupSboxStatusName(ACTIVITY_STATUS_OPTIONS, data.activity_status),
  boxHealthStatus: data.box_health_status ?? undefined,
  boxHealthStatusName:
    data.box_health_status_name
    ?? lookupSboxStatusName(BOX_HEALTH_STATUS_OPTIONS, data.box_health_status),
  mfgDate: data.mfg_date ?? undefined,
  hookAThreshold: data.hookA_threshold ?? undefined,
  hookBThreshold: data.hookB_threshold ?? undefined,
  isAssigned: data.is_assigned ?? 0,
});

export const mapSBoxFormToCreateRequest = (values: SBoxFormValues) => ({
  serial_no: values.serialNo?.trim() || undefined,
  box_ip: values.boxIp.trim(),
  box_details: values.boxDetails?.trim() || undefined,
  location_id: values.locationId,
  work_area_id: values.workAreaId,
  activity_status: values.activityStatus,
  mfg_date: values.mfgDate || undefined,
});

export const mapSBoxFormToUpdateRequest = (values: SBoxFormValues) => ({
  box_ip: values.boxIp.trim(),
  box_details: values.boxDetails?.trim() || undefined,
  location_id: values.locationId,
  work_area_id: values.workAreaId,
  activity_status: values.activityStatus,
  mfg_date: values.mfgDate || undefined,
});

export const sboxToFormValues = (sbox: SBox): SBoxFormValues => ({
  serialNo: sbox.serialNo,
  boxIp: sbox.boxIp,
  boxDetails: sbox.boxDetails ?? '',
  locationId: sbox.locationId,
  workAreaId: sbox.workAreaId,
  activityStatus: sbox.activityStatus,
  mfgDate: sbox.mfgDate,
});
