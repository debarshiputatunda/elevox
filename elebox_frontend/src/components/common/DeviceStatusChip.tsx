import { Chip } from '@mui/material';
import type { DeviceStatus } from '@/types';
import { getDeviceStatusColor, getDeviceStatusLabel } from '@/utils/helpers';

interface DeviceStatusChipProps {
  status: DeviceStatus;
}

export const DeviceStatusChip = ({ status }: DeviceStatusChipProps) => (
  <Chip
    label={getDeviceStatusLabel(status)}
    color={getDeviceStatusColor(status)}
    size="small"
    sx={{ fontWeight: 600 }}
  />
);
