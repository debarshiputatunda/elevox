import { Box, Button, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { clearMonitoringEvents } from '@/store/slices/monitoringSlice';
import { formatDateTime } from '@/utils/helpers';

const levelColor = {
  info: 'text.secondary',
  warning: 'warning.main',
  danger: 'error.main',
} as const;

export const MonitoringEventLog = () => {
  const dispatch = useAppDispatch();
  const events = useAppSelector((state) => state.monitoring.events);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle1" fontWeight={600}>
          Safety Event Log
        </Typography>
        <Button size="small" onClick={() => dispatch(clearMonitoringEvents())}>
          Clear
        </Button>
      </Box>
      <Box
        sx={{
          bgcolor: 'action.hover',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          p: 1.5,
          minHeight: 220,
          maxHeight: 280,
          overflowY: 'auto',
          fontFamily: 'monospace',
        }}
      >
        {events.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No events logged yet.
          </Typography>
        ) : (
          events.map((event) => (
            <Box key={event.id} py={0.5} borderBottom={1} borderColor="divider">
              <Typography variant="caption" color="primary.main" fontWeight={700} mr={1}>
                [{formatDateTime(event.timestamp)}]
              </Typography>
              <Typography
                component="span"
                variant="caption"
                color={levelColor[event.level]}
              >
                {event.message}
              </Typography>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};
