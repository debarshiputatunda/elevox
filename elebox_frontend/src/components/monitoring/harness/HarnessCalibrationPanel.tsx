import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import type { BuckleKey } from '@/constants/harnessBuckles';
import {
  exportPositionsJson,
  formatPositionClipboard,
  toCssPosition,
  type BucklePositionPercent,
  type BucklePositionsMap,
} from '@/constants/harnessBucklePositions';

interface HarnessCalibrationPanelProps {
  activeBuckle: BuckleKey | null;
  activePosition: BucklePositionPercent | null;
  draftPositions: BucklePositionsMap;
  configByKey: Record<BuckleKey, { label: string }>;
  onSave: () => void;
  onReset: () => void;
  onCancel: () => void;
}

export const HarnessCalibrationPanel = ({
  activeBuckle,
  activePosition,
  draftPositions,
  configByKey,
  onSave,
  onReset,
  onCancel,
}: HarnessCalibrationPanelProps) => {
  const [snackbar, setSnackbar] = useState('');

  const copyText = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSnackbar(message);
    } catch {
      setSnackbar('Unable to copy to clipboard');
    }
  };

  const panelBuckle = activeBuckle ?? 'buckle1';
  const panelPosition = activePosition ?? draftPositions[panelBuckle];
  const css = toCssPosition(panelPosition);

  return (
    <>
      <Alert severity="info" sx={{ mb: 1.5, py: 0.75, borderRadius: 2 }}>
        <Typography variant="caption" fontWeight={800} display="block">
          Pointer Calibration Mode
        </Typography>
        <Typography variant="caption">
          Drag each buckle indicator to its correct position. Connector lines update live. Click Save when finished.
        </Typography>
      </Alert>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        <Button size="small" variant="contained" onClick={onSave}>
          Save Positions
        </Button>
        <Button size="small" variant="outlined" onClick={onReset}>
          Reset Default
        </Button>
        <Button size="small" variant="text" color="inherit" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />}
          onClick={() => copyText(exportPositionsJson(draftPositions), 'JSON exported to clipboard')}
        >
          Export JSON
        </Button>
      </Stack>

      {activeBuckle && activePosition && (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" fontWeight={800} display="block">
            {configByKey[activeBuckle].label}
          </Typography>
          <Typography variant="caption" display="block" fontFamily="monospace">
            X : {activePosition.x.toFixed(1)}%
          </Typography>
          <Typography variant="caption" display="block" fontFamily="monospace">
            Y : {activePosition.y.toFixed(1)}%
          </Typography>
        </Box>
      )}

      <Card
        variant="outlined"
        sx={{
          p: 1.25,
          minWidth: 180,
          maxWidth: 220,
          bgcolor: 'background.paper',
          boxShadow: 3,
          borderColor: 'primary.light',
        }}
      >
        <Typography variant="caption" fontWeight={800} color="primary.main" display="block" gutterBottom>
          Developer Panel
        </Typography>
        <Typography variant="caption" fontWeight={700} display="block">
          {configByKey[panelBuckle].label}
        </Typography>
        <Typography variant="caption" display="block" fontFamily="monospace" sx={{ mt: 0.5 }}>
          Left : {css.left}
        </Typography>
        <Typography variant="caption" display="block" fontFamily="monospace">
          Top : {css.top}
        </Typography>
        <Button
          size="small"
          fullWidth
          variant="outlined"
          startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
          sx={{ mt: 1, fontSize: '0.65rem' }}
          onClick={() =>
            copyText(
              formatPositionClipboard(panelBuckle, panelPosition),
              'Coordinates copied to clipboard',
            )
          }
        >
          Copy Coordinates
        </Button>
      </Card>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={2500}
        onClose={() => setSnackbar('')}
        message={snackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
};
