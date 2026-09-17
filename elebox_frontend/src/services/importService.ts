import { apiClient } from '@/api/client';
import type { ImportResponse, ImportType } from '@/types';

const buildFormData = (file: File): FormData => {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
};

export const importService = {
  downloadTemplate: async (importType: ImportType): Promise<void> => {
    const response = await apiClient.get(`/imports/templates/${importType}`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${importType.replace('-', '_')}_import_template.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  importLocations: async (file: File): Promise<ImportResponse> => {
    const { data } = await apiClient.post<ImportResponse>(
      '/imports/locations',
      buildFormData(file),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  importWorkAreas: async (file: File): Promise<ImportResponse> => {
    const { data } = await apiClient.post<ImportResponse>(
      '/imports/work-areas',
      buildFormData(file),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  importUsers: async (file: File): Promise<ImportResponse> => {
    const { data } = await apiClient.post<ImportResponse>(
      '/imports/users',
      buildFormData(file),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  importSboxes: async (file: File): Promise<ImportResponse> => {
    const { data } = await apiClient.post<ImportResponse>(
      '/imports/sboxes',
      buildFormData(file),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
};
