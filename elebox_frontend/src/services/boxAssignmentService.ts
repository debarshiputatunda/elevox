import { apiClient } from '@/api/client';

export interface BoxAssignment {
  userId: number;
  employeeName?: string | null;
  boxId: number;
  serialNo?: string | null;
  workAreaId: number;
  workAreaName?: string | null;
}

export interface BoxAssignmentLog {
  logId: number;
  userId: number;
  employeeName?: string | null;
  boxId: number;
  serialNo?: string | null;
  workAreaId?: number | null;
  workAreaName?: string | null;
  description?: string | null;
  createdAt: string;
}

interface BackendBoxAssignment {
  user_id: number;
  employee_name?: string | null;
  box_id: number;
  serial_no?: string | null;
  work_area_id: number;
  work_area_name?: string | null;
}

interface BackendBoxLog {
  log_id: number;
  user_id: number;
  employee_name?: string | null;
  box_id: number;
  serial_no?: string | null;
  work_area_id?: number | null;
  work_area_name?: string | null;
  description?: string | null;
  created_at: string;
}

const mapAssignment = (data: BackendBoxAssignment): BoxAssignment => ({
  userId: data.user_id,
  employeeName: data.employee_name,
  boxId: data.box_id,
  serialNo: data.serial_no,
  workAreaId: data.work_area_id,
  workAreaName: data.work_area_name,
});

const mapLog = (data: BackendBoxLog): BoxAssignmentLog => ({
  logId: data.log_id,
  userId: data.user_id,
  employeeName: data.employee_name,
  boxId: data.box_id,
  serialNo: data.serial_no,
  workAreaId: data.work_area_id,
  workAreaName: data.work_area_name,
  description: data.description,
  createdAt: data.created_at,
});

export const boxAssignmentService = {
  listAll: async (): Promise<BoxAssignment[]> => {
    const { data } = await apiClient.get<BackendBoxAssignment[]>(
      '/sboxes/assignments',
    );
    return data.map(mapAssignment);
  },

  listAssignments: async (boxId: number): Promise<BoxAssignment[]> => {
    const { data } = await apiClient.get<BackendBoxAssignment[]>(
      `/sboxes/${boxId}/assignments`,
    );
    return data.map(mapAssignment);
  },

  assign: async (
    boxId: number,
    payload: { userId: number; workAreaId: number },
  ): Promise<BoxAssignment> => {
    const { data } = await apiClient.post<BackendBoxAssignment>(
      `/sboxes/${boxId}/assignments`,
      {
        user_id: payload.userId,
        work_area_id: payload.workAreaId,
      },
    );
    return mapAssignment(data);
  },

  deallocate: async (boxId: number): Promise<BoxAssignment> => {
    const { data } = await apiClient.delete<BackendBoxAssignment>(
      `/sboxes/${boxId}/assignments`,
    );
    return mapAssignment(data);
  },

  listLogs: async (
    boxId: number,
    params?: { page?: number; pageSize?: number },
  ): Promise<{ data: BoxAssignmentLog[]; total: number }> => {
    const { data } = await apiClient.get<{
      data: BackendBoxLog[];
      total: number;
    }>(`/sboxes/${boxId}/logs`, {
      params: {
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 50,
      },
    });
    return {
      data: data.data.map(mapLog),
      total: data.total,
    };
  },
};
