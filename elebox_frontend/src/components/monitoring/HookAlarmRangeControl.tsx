import { useState } from 'react';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import type { TelemetryData } from '@/types';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { setDeviceHookRanges } from '@/store/slices/telemetrySlice';
import { validHookAlarmRanges, type HookAlarmRanges } from '@/utils/hookAlarmRanges';

export const HookAlarmRangeControl = ({ device, canManage }: { device: TelemetryData; canManage: boolean }) => {
  const dispatch = useAppDispatch();
  const write = useAppSelector((state) => state.telemetry.hookRangeWrites[device.boxId]);
  const [draft, setDraft] = useState<{ base: number | undefined; values: string[] } | null>(null);
  if (!device.hookAlarmRanges) return null;
  const confirmed = [...device.hookAlarmRanges.a.flat(), ...device.hookAlarmRanges.b.flat()].map(String);
  const values = draft?.values ?? confirmed;
  const numbers = values.map((value) => value.trim() === '' ? NaN : Number(value));
  const ranges: HookAlarmRanges = { a: [[numbers[0], numbers[1]], [numbers[2], numbers[3]]], b: [[numbers[4], numbers[5]], [numbers[6], numbers[7]]] };
  const valid = validHookAlarmRanges(ranges);
  const conflict = draft !== null && draft.base !== device.hookRangesRevision;
  const pending = write?.status === 'pending';
  const disabled = !device.isOnline || !canManage || pending || device.hookRangesRevision == null;
  const dirty = values.some((value, index) => value !== confirmed[index]);
  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    <Typography variant="subtitle2">Hook alarm ranges</Typography>
    <Typography variant="caption" color="text.secondary">Alarm when both hooks are inside either of their two ranges, including the endpoints. Each hook may match a different range.</Typography>
    {(['A', 'B'] as const).map((hook, hookIndex) => <Box key={hook}>
      <Typography variant="body2" fontWeight={700}>Hook {hook}</Typography>
      {[0, 1].map((rangeIndex) => <Box key={rangeIndex} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1 }}>
        {['Minimum', 'Maximum'].map((bound, boundIndex) => {
          const index = hookIndex * 4 + rangeIndex * 2 + boundIndex;
          return <TextField key={bound} size="small" type="number" label={`Hook ${hook} range ${rangeIndex + 1} ${bound.toLowerCase()}`} value={values[index]} disabled={disabled}
            slotProps={{ htmlInput: { min: 0, max: 1000000, step: 1 } }}
            onChange={(event) => setDraft({ base: draft?.base ?? device.hookRangesRevision, values: values.map((value, i) => i === index ? event.target.value : value) })} />;
        })}
      </Box>)}
    </Box>)}
    {!valid && <Alert severity="error">Use whole numbers from 0 to 1,000,000. Each minimum must be at most its maximum; range 1 must end before range 2 starts.</Alert>}
    {conflict && <Alert severity="warning">Device settings changed while you were editing. Reload the device settings before saving.</Alert>}
    {write?.status === 'error' && <Alert severity="error">{write.error}</Alert>}
    <Box display="flex" gap={1}>
      <Button variant="contained" disabled={disabled || !dirty || !valid || conflict} onClick={async () => {
        const result = await dispatch(setDeviceHookRanges({ boxId: device.boxId, ranges, expectedRevision: device.hookRangesRevision! }));
        if (setDeviceHookRanges.fulfilled.match(result)) setDraft(null);
      }}>{pending ? 'Waiting for device…' : 'Save ranges'}</Button>
      {draft && <Button disabled={pending} onClick={() => setDraft(null)}>Reload device settings</Button>}
    </Box>
    <Typography variant="caption" color="text.secondary">{!device.isOnline ? 'Device offline.' : pending ? 'Waiting for device acknowledgment.' : dirty ? 'Unsaved changes.' : `Device-confirmed settings · revision ${device.hookRangesRevision ?? 'unknown'}`}</Typography>
  </Box>;
};
