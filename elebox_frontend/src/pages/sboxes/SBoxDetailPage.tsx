import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Grid, Card, CardContent, Typography, Divider, List, ListItem, ListItemText, Skeleton, Button,
} from '@mui/material';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import { PageHeader } from '@/components/common/PageHeader';
import { DeviceStatusChip } from '@/components/common/DeviceStatusChip';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { sboxService, violationService } from '@/services';
import { ROUTES } from '@/constants/routes';
import { formatDateTime } from '@/utils/helpers';
import { mapHealthToDeviceStatus } from '@/utils/sboxMapper';

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <Box mb={1.25}>
    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
      {label}
    </Typography>
    <Typography variant="body2">{value}</Typography>
  </Box>
);

export const SBoxDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const boxId = Number(id);

  const { data: device, isLoading } = useQuery({
    queryKey: ['sbox', boxId],
    queryFn: () => sboxService.getById(boxId),
    enabled: !!boxId,
  });

  const { data: violations } = useQuery({
    queryKey: ['violations', device?.serialNo],
    queryFn: () => violationService.getAll({ search: device?.serialNo }),
    enabled: !!device?.serialNo,
  });

  if (isLoading) return <LoadingSkeleton variant="card" rows={4} />;
  if (!device) {
    return (
      <EmptyState
        title="Device not found"
        description="This S-Box could not be loaded."
        actionLabel="Back to S-Boxes"
        onAction={() => navigate(ROUTES.SBOXES)}
      />
    );
  }

  return (
    <Box>
      <PageHeader
        title={device.serialNo}
        subtitle={device.boxIp}
        breadcrumbs={[
          { label: 'S-Boxes', path: ROUTES.SBOXES },
          { label: device.serialNo },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<MonitorHeartIcon />}
            onClick={() => navigate(`${ROUTES.MONITORING}?boxId=${device.id}`)}
          >
            Open Monitoring
          </Button>
        }
      />
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Device Information</Typography>
              <Divider sx={{ mb: 2 }} />
              <InfoRow label="Device ID" value={String(device.id)} />
              <InfoRow label="Serial Number" value={device.serialNo} />
              <InfoRow label="Box IP" value={device.boxIp} />
              <InfoRow label="Manufacturing Date" value={device.mfgDate ?? '-'} />
              <InfoRow label="Details" value={device.boxDetails ?? '-'} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Current Status</Typography>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                <DeviceStatusChip status={mapHealthToDeviceStatus(device)} />
                <StatusBadge
                  label={device.activityStatusName ?? '-'}
                  color={device.activityStatusName === 'Active' ? 'success' : 'default'}
                />
              </Box>
              <InfoRow
                label="Last Communication"
                value={device.lastSeen ? formatDateTime(device.lastSeen) : 'Never'}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Assignment</Typography>
              <Divider sx={{ mb: 2 }} />
              <InfoRow label="Location" value={device.locationName ?? '-'} />
              <InfoRow label="Work Area" value={device.workAreaName ?? '-'} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Hook Configuration</Typography>
              <Divider sx={{ mb: 2 }} />
              <InfoRow label="Hook A Threshold" value={String(device.hookAThreshold ?? '-')} />
              <InfoRow label="Hook B Threshold" value={String(device.hookBThreshold ?? '-')} />
              <Typography variant="body2" color="text.secondary">
                Live loads, buckle state, alarm, and battery are shown in monitoring.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Violation History</Typography>
              {!violations ? (
                <Skeleton height={100} />
              ) : (violations.data ?? []).length === 0 ? (
                <EmptyState
                  title="No violations"
                  description="This S-Box has no recorded violations."
                />
              ) : (
                <List dense>
                  {(violations.data ?? []).map((v) => (
                    <ListItem key={v.id} divider>
                      <ListItemText
                        primary={v.title}
                        secondary={`${v.timestamp} — ${v.severity}`}
                      />
                      <StatusBadge label={v.isRead ? 'Read' : 'Unread'} />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
