import type { DeviceStatus, ListParams, PaginatedResponse } from '@/types';

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const paginate = <T>(
  items: T[],
  params: ListParams = {},
): PaginatedResponse<T> => {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  let filtered = [...items];

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(q),
    );
  }

  if (params.sortBy) {
    const key = params.sortBy;
    const order = params.sortOrder === 'desc' ? -1 : 1;
    filtered.sort((a, b) => {
      const av = (a as Record<string, unknown>)[key];
      const bv = (b as Record<string, unknown>)[key];
      if (av === bv) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return av > bv ? order : -order;
    });
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  return {
    data: filtered.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  };
};

export const generateSerialNumber = (): string => {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `SBOX-${year}-${seq}`;
};

export const getDeviceStatusColor = (
  status: DeviceStatus,
): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'normal':
      return 'success';
    case 'warning':
      return 'warning';
    case 'violation':
      return 'error';
    case 'offline':
    default:
      return 'default';
  }
};

export const getDeviceStatusLabel = (status: DeviceStatus): string => {
  switch (status) {
    case 'normal':
      return 'Normal';
    case 'warning':
      return 'Warning';
    case 'violation':
      return 'Violation';
    case 'offline':
      return 'Offline';
    default:
      return status;
  }
};

export const parseUtcDate = (iso: string): Date => {
  if (!iso) return new Date(NaN);
  const hasOffset = /([zZ]|[+-]\d{2}:\d{2})$/.test(iso);
  return new Date(hasOffset ? iso : `${iso}Z`);
};

export const formatDateTime = (iso: string): string => {
  const date = parseUtcDate(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
};

export const formatTime = (iso: string): string => {
  const date = parseUtcDate(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const exportToCsv = (filename: string, rows: Record<string, unknown>[]): void => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','),
    ),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
