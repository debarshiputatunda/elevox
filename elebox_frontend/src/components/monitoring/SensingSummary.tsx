import { Box, Typography } from '@mui/material';
import type { TelemetryData } from '@/types';
import { monitoringMono } from '@/constants/monitoringTheme';

const reasons = { ok: 'Unavailable', reset_timeout: 'Reset timeout', rise_timeout: 'Rise timeout', below_resolution: 'Below resolution', waiting: 'Waiting for coupling measurement' };
export const SensingSummary = ({ device, isOnline }: { device?: TelemetryData; isOnline: boolean }) => {
  const validLink = device?.mutualValid === true && Number.isFinite(device.link) && device.link! > 0;
  const reason = device?.mutualStatus ? reasons[device.mutualStatus] : 'Coupling diagnostics unavailable';
  const coupling = device?.mutual;
  const finiteCoupling = coupling != null && Number.isFinite(coupling) && coupling >= 0;
  const timedOut = device?.mutualStatus === 'reset_timeout' || device?.mutualStatus === 'rise_timeout';
  const couplingText = !finiteCoupling ? reason : timedOut ? `≥${coupling} · ${reason}` : device?.mutualValid === true ? coupling : `${coupling} · ${reason}`;
  const guard = device?.guard ?? 'Unknown';
  return <Box aria-label="Sensing summary" sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
    <Typography variant="subtitle2" fontWeight={700}>Sensing summary</Typography>
    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
      Active guard: {guard} · {device?.sensingName || 'Sensing mode unavailable'}
      {!isOnline ? ' · Offline — last reported mode' : ''}
    </Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
      <Box><Typography variant="caption" color="text.secondary">LinkIndex</Typography>
        <Typography fontFamily={monitoringMono} fontWeight={700}>{!isOnline ? 'Offline' : validLink ? device!.link : reason}</Typography></Box>
      <Box><Typography variant="caption" color="text.secondary">Raw coupling (cycles)</Typography>
        <Typography fontFamily={monitoringMono} fontWeight={700}>{!isOnline ? 'Offline' : couplingText}</Typography></Box>
    </Box>
    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
      Sensing diagnostics are independent of prediction and do not indicate safe attachment.
    </Typography>
  </Box>;
};
