import { Chip } from '@mui/material';

interface StatusBadgeProps {
  label: string;
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  size?: 'small' | 'medium';
}

export const StatusBadge = ({ label, color = 'default', size = 'small' }: StatusBadgeProps) => (
  <Chip
    label={label}
    color={color}
    size={size}
    variant="outlined"
    sx={{ fontWeight: 700, letterSpacing: 0.2 }}
  />
);
