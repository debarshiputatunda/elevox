import { Box, Typography, keyframes } from '@mui/material';

const openPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
  50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
`;

const dotPulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
`;

interface BuckleSlotProps {
  label: string;
  value?: number;
}

const BuckleSlot = ({ label, value }: BuckleSlotProps) => {
  const isOpen = value === 1;
  const isFastened = value === 0;
  const status = isOpen ? 'OPEN' : isFastened ? 'OK' : '—';

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        py: 1,
        px: 0.75,
        borderRadius: 1,
        border: 1,
        borderColor: isOpen ? 'error.main' : 'divider',
        bgcolor: isOpen ? 'error.light' : 'action.hover',
        animation: isOpen ? `${openPulse} 1.8s infinite` : 'none',
        transition: 'border-color 0.25s, background-color 0.25s',
      }}
    >
      <Typography
        variant="caption"
        fontWeight={700}
        color="text.secondary"
        fontSize="0.65rem"
        letterSpacing={0.8}
      >
        {label}
      </Typography>
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          bgcolor: isOpen ? 'error.main' : isFastened ? 'success.main' : 'text.disabled',
          animation: isOpen ? `${dotPulse} 1s infinite` : 'none',
          transition: 'background-color 0.25s',
        }}
      />
      <Typography
        variant="caption"
        fontWeight={700}
        color={isOpen ? 'error.main' : isFastened ? 'success.main' : 'text.disabled'}
        fontSize="0.6rem"
        letterSpacing={0.5}
      >
        {status}
      </Typography>
    </Box>
  );
};

interface BuckleIndicatorProps {
  buckle1?: number;
  buckle2?: number;
  buckle3?: number;
}

export const BuckleIndicator = ({ buckle1, buckle2, buckle3 }: BuckleIndicatorProps) => {
  const anyOpen = buckle1 === 1 || buckle2 === 1 || buckle3 === 1;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography
          variant="caption"
          fontWeight={700}
          color="text.secondary"
          textTransform="uppercase"
          letterSpacing={1}
          fontSize="0.65rem"
        >
          Buckle Status
        </Typography>
        {anyOpen && (
          <Typography
            variant="caption"
            fontWeight={700}
            color="error.main"
            fontSize="0.6rem"
            letterSpacing={0.5}
          >
            ALERT
          </Typography>
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 0.75, flex: 1 }}>
        <BuckleSlot label="B1" value={buckle1} />
        <BuckleSlot label="B2" value={buckle2} />
        <BuckleSlot label="B3" value={buckle3} />
      </Box>
    </Box>
  );
};
