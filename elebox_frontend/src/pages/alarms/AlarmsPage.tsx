import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, Chip, Alert,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { PageHeader } from '@/components/common/PageHeader';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { alarmService } from '@/services';

type AlarmAction = 'activate' | 'deactivate' | 'reset' | null;

export const AlarmsPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<AlarmAction>(null);

  const { data: alarm, isLoading } = useQuery({
    queryKey: ['alarm-state'],
    queryFn: alarmService.getState,
    refetchInterval: 5000,
  });

  const mutation = useMutation({
    mutationFn: (action: Exclude<AlarmAction, null>) => {
      if (action === 'activate') return alarmService.activate();
      if (action === 'deactivate') return alarmService.deactivate();
      return alarmService.reset();
    },
    onSuccess: () => {
      enqueueSnackbar('Alarm updated successfully', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['alarm-state'] });
      setPendingAction(null);
    },
    onError: (err: { message?: string }) => {
      enqueueSnackbar(err.message ?? 'Action failed', { variant: 'error' });
      setPendingAction(null);
    },
  });

  if (isLoading) return <LoadingSkeleton variant="card" rows={2} />;

  const actionMessages: Record<Exclude<AlarmAction, null>, string> = {
    activate: 'This will activate the facility alarm siren. Continue?',
    deactivate: 'This will deactivate the alarm siren. Continue?',
    reset: 'This will reset all alarm states. Continue?',
  };

  return (
    <Box>
      <PageHeader
        title="Alarm & Siren Control"
        subtitle="Admin-only facility alarm management panel"
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: alarm?.isActive ? 'error.dark' : 'background.paper', color: alarm?.isActive ? 'error.contrastText' : 'inherit' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <WarningIcon fontSize="large" />
                <Typography variant="h6">Current Alarm Status</Typography>
              </Box>
              <Typography variant="h3" fontWeight={700}>
                {alarm?.isActive ? 'ACTIVE' : 'INACTIVE'}
              </Typography>
              {alarm?.lastActivated && (
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Last activated: {new Date(alarm.lastActivated).toLocaleString()}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Active Alerts</Typography>
              <Typography variant="h3" fontWeight={700} color="warning.main">
                {alarm?.activeAlerts ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Critical Devices</Typography>
              <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                {(alarm?.criticalDevices ?? []).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">None</Typography>
                ) : (
                  alarm?.criticalDevices.map((d) => (
                    <Chip key={d} label={d} color="error" size="small" />
                  ))
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Control Actions</Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Alarm controls affect the entire facility siren system. Use with caution.
              </Alert>
              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  color="error"
                  disabled={alarm?.isActive}
                  onClick={() => setPendingAction('activate')}
                >
                  Activate Alarm
                </Button>
                <Button
                  variant="contained"
                  color="warning"
                  disabled={!alarm?.isActive}
                  onClick={() => setPendingAction('deactivate')}
                >
                  Deactivate Alarm
                </Button>
                <Button variant="outlined" onClick={() => setPendingAction('reset')}>
                  Reset Alarm
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ConfirmationDialog
        open={pendingAction !== null}
        title="Confirm Alarm Action"
        message={pendingAction ? actionMessages[pendingAction] : ''}
        confirmColor="error"
        loading={mutation.isPending}
        onConfirm={() => pendingAction && mutation.mutate(pendingAction)}
        onCancel={() => setPendingAction(null)}
      />
    </Box>
  );
};
