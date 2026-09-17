import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ResponsiveDrawer } from '@/components/common/ResponsiveDrawer';
import type { SystemNotification } from '@/types';
import { formatDateTime } from '@/utils/helpers';

interface NotificationDetailDrawerProps {
  open: boolean;
  notification: SystemNotification | null;
  onClose: () => void;
  onMarkRead?: (id: number) => void;
  markingRead?: boolean;
}

const severityColor = (severity: string) => {
  if (severity === 'CRITICAL') return 'error';
  if (severity === 'HIGH' || severity === 'WARNING') return 'warning';
  if (severity === 'MEDIUM') return 'info';
  return 'default';
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" display="block">
      {label}
    </Typography>
    <Typography variant="body2">{value}</Typography>
  </Box>
);

const SectionTitle = ({ children }: { children: string }) => (
  <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ mt: 1 }}>
    {children}
  </Typography>
);

export const NotificationDetailDrawer = ({
  open,
  notification,
  onClose,
  onMarkRead,
  markingRead,
}: NotificationDetailDrawerProps) => {
  if (!notification) return null;

  return (
    <ResponsiveDrawer open={open} onClose={onClose}>
      <Box p={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={700}>
            Notification Details
          </Typography>
          <IconButton onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
          <StatusBadge
            label={notification.severity}
            color={severityColor(notification.severity)}
          />
          <Chip
            label={notification.isRead ? 'Read' : 'Unread'}
            size="small"
            color={notification.isRead ? 'default' : 'warning'}
            variant="outlined"
          />
        </Stack>

        <Stack spacing={2}>
          <SectionTitle>Notification Information</SectionTitle>
          <DetailRow label="Notification ID" value={String(notification.id)} />
          <DetailRow label="Created Time" value={formatDateTime(notification.timestamp)} />
          <DetailRow label="Severity" value={notification.severity} />
          <DetailRow
            label="Type"
            value={notification.notificationType.replace(/_/g, ' ')}
          />

          <Divider />

          <SectionTitle>S-Box Information</SectionTitle>
          <DetailRow
            label="Serial Number"
            value={notification.serialNo ?? notification.controllerName ?? '—'}
          />
          <DetailRow label="IP Address" value={notification.boxIp ?? '—'} />
          <DetailRow label="Location" value={notification.locationName ?? '—'} />
          <DetailRow label="Work Area" value={notification.workAreaName ?? '—'} />

          <Divider />

          <SectionTitle>Assigned User</SectionTitle>
          <DetailRow label="Employee ID" value={notification.employeeId ?? '—'} />
          <DetailRow label="Employee Name" value={notification.employeeName ?? '—'} />
          <DetailRow label="Email" value={notification.email ?? '—'} />
          <DetailRow label="Phone Number" value={notification.phone ?? '—'} />

          <Divider />

          <SectionTitle>Notification Message</SectionTitle>
          <DetailRow label="Title" value={notification.title} />
          <DetailRow label="Message" value={notification.message} />
        </Stack>

        {!notification.isRead && onMarkRead && (
          <Button
            fullWidth
            variant="contained"
            sx={{ mt: 3 }}
            disabled={markingRead}
            onClick={() => onMarkRead(notification.id)}
          >
            Mark as Read
          </Button>
        )}
      </Box>
    </ResponsiveDrawer>
  );
};
