import { Box, Button, Card, CardContent, Chip, Typography } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import { useSafetyModeToggle } from '@/hooks/useSafetyModeToggle';
import { useAppSelector } from '@/hooks/redux';

export const SafetyModeControl = () => {
  const { safetyModeEnabled, toggleSafetyMode } = useSafetyModeToggle();
  const deviceCount = useAppSelector((state) => state.telemetry.devices.length);

  return (
    <Card
      variant="outlined"
      sx={{
        borderWidth: 2,
        borderColor: safetyModeEnabled ? 'primary.main' : 'divider',
        boxShadow: safetyModeEnabled ? '0 0 18px rgba(255, 127, 17, 0.22)' : undefined,
        background: (theme) =>
          safetyModeEnabled
            ? theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(255,101,0,0.12), rgba(30,62,98,0.6))'
              : 'linear-gradient(135deg, rgba(255,127,17,0.08), rgba(255,255,255,0.9))'
            : undefined,
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} mb={1}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
              Browser buckle siren
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Local audio for {deviceCount > 0 ? `${deviceCount} ` : ''}Elevox devices with buckle alarms enabled. Device alarm settings are controlled in Monitoring.
            </Typography>
          </Box>
          <Chip
            label={safetyModeEnabled ? 'Armed' : 'Standby'}
            color={safetyModeEnabled ? 'warning' : 'default'}
            size="small"
            sx={{ fontWeight: 700 }}
          />
        </Box>
        <Button
          fullWidth
          variant={safetyModeEnabled ? 'contained' : 'outlined'}
          color="warning"
          startIcon={<ShieldIcon />}
          onClick={toggleSafetyMode}
          sx={{ fontWeight: 700, py: 1.5, minHeight: 48 }}
        >
          {safetyModeEnabled ? 'Safety Mode Active' : 'Arm Safety Mode'}
        </Button>
        {safetyModeEnabled && (
          <Typography variant="caption" color="warning.main" fontWeight={600} display="block" mt={1.5}>
            Browser audio is armed. Devices with their buckle alarm off are excluded.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};
