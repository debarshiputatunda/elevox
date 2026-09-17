export type BatteryStatus = 'Healthy' | 'Warning' | 'Critical' | 'Unknown';

export const resolveBatteryStatus = (percent: number | null | undefined): BatteryStatus => {
  if (percent === null || percent === undefined) return 'Unknown';
  if (percent > 50) return 'Healthy';
  if (percent >= 20) return 'Warning';
  return 'Critical';
};

export const batteryStatusColor = (status: string): string => {
  switch (status) {
    case 'Healthy':
      return '#2e7d32';
    case 'Warning':
      return '#ed6c02';
    case 'Critical':
      return '#d32f2f';
    default:
      return '#757575';
  }
};

export const batteryStatusMuiColor = (
  status: string,
): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'Healthy':
      return 'success';
    case 'Warning':
      return 'warning';
    case 'Critical':
      return 'error';
    default:
      return 'default';
  }
};

export const formatRelativeTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${Math.max(seconds, 0)} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};
