import type { WorkArea, WorkAreaFormValues } from '@/types';

export interface BackendWorkArea {
  work_area_id: number;
  work_area_name: string;
  location_id: number;
  location_name?: string | null;
}

export const mapBackendWorkArea = (data: BackendWorkArea): WorkArea => ({
  id: data.work_area_id,
  name: data.work_area_name,
  locationId: data.location_id,
  locationName: data.location_name ?? undefined,
});

export const mapWorkAreaFormToCreateRequest = (values: WorkAreaFormValues) => ({
  work_area_name: values.name.trim(),
  location_id: values.locationId,
});

export const mapWorkAreaFormToUpdateRequest = (values: WorkAreaFormValues) => ({
  work_area_name: values.name.trim(),
  location_id: values.locationId,
});
