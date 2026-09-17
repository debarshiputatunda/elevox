import { useCallback, useEffect, useRef, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { Box, IconButton, Slider, TextField, Typography } from '@mui/material';
import { monitoringMono } from '@/constants/monitoringTheme';
import {
  HOOK_THRESHOLD_MAX,
  HOOK_THRESHOLD_MIN,
  HOOK_THRESHOLD_STEP,
  normalizeHookThreshold,
  clampHookThreshold,
} from '@/utils/hookThreshold';

interface HookThresholdControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  exceeded?: boolean;
  compact?: boolean;
}

export const HookThresholdControl = ({
  label,
  value,
  onChange,
  disabled = false,
  exceeded: _exceeded = false,
  compact = false,
}: HookThresholdControlProps) => {
  const [draft, setDraft] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);
  const valueRef = useRef(value);
  const repeatDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const clearRepeat = useCallback(() => {
    if (repeatDelayRef.current !== null) {
      clearTimeout(repeatDelayRef.current);
      repeatDelayRef.current = null;
    }
    if (repeatIntervalRef.current !== null) {
      clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
  }, []);

  useEffect(() => () => clearRepeat(), [clearRepeat]);

  useEffect(() => {
    if (!isEditing) {
      setDraft(String(value));
    }
  }, [value, isEditing]);

  const commitDraft = () => {
    const parsed = Number(draft);
    const normalized = Number.isFinite(parsed)
      ? normalizeHookThreshold(parsed)
      : value;
    onChange(normalized);
    setDraft(String(normalized));
    setIsEditing(false);
  };

  const applyStep = useCallback(
    (delta: number) => {
      const next = clampHookThreshold(valueRef.current + delta);
      if (next === valueRef.current) return false;
      valueRef.current = next;
      onChange(next);
      setIsEditing(false);
      return true;
    },
    [onChange],
  );

  const startRepeat = useCallback(
    (delta: number) => {
      if (!applyStep(delta)) return;
      repeatDelayRef.current = setTimeout(() => {
        repeatIntervalRef.current = setInterval(() => {
          if (!applyStep(delta)) clearRepeat();
        }, 75);
      }, 350);
    },
    [applyStep, clearRepeat],
  );

  const bindStepPress = (delta: number, isDisabled: boolean) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      if (isDisabled) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      startRepeat(delta);
    },
    onPointerUp: clearRepeat,
    onPointerCancel: clearRepeat,
    onLostPointerCapture: clearRepeat,
  });

  const stepButtonSx = {
    width: { xs: 40, sm: compact ? 32 : 36 },
    height: { xs: 40, sm: compact ? 32 : 36 },
    border: 1,
    borderColor: 'divider',
    borderRadius: 1.25,
    bgcolor: 'background.paper',
    color: 'primary.main',
    '&:hover': {
      bgcolor: 'primary.main',
      color: 'primary.contrastText',
      borderColor: 'primary.main',
    },
    '&.Mui-disabled': {
      opacity: 0.4,
    },
    userSelect: 'none',
    touchAction: 'manipulation',
  } as const;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 1.25 : 2,
        bgcolor: 'action.hover',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1.25,
        px: compact ? 1.25 : 2,
        py: compact ? 1.25 : 1.5,
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease, background-color 0.25s ease',
      }}
    >
      <Typography
        variant="body2"
        fontWeight={800}
        sx={{
          minWidth: compact ? 60 : 68,
          textTransform: 'none',
          letterSpacing: 0.2,
          color: 'text.primary',
          whiteSpace: 'nowrap',
          fontSize: compact ? '0.85rem' : '0.9rem',
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
      <Slider
        value={value}
        min={HOOK_THRESHOLD_MIN}
        max={HOOK_THRESHOLD_MAX}
        step={HOOK_THRESHOLD_STEP}
        disabled={disabled}
        color="primary"
        onChange={(_, next) => onChange(normalizeHookThreshold(next as number))}
        sx={{
          flex: 1,
          py: compact ? 1.25 : 1.5,
          '& .MuiSlider-thumb': {
            width: compact ? 16 : 18,
            height: compact ? 16 : 18,
          },
          '& .MuiSlider-rail': {
            opacity: 1,
            bgcolor: 'divider',
            height: compact ? 8 : 10,
            borderRadius: 4,
          },
          '& .MuiSlider-track': {
            height: compact ? 8 : 10,
            borderRadius: 4,
          },
        }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
        <IconButton
          size="small"
          disabled={disabled || value <= HOOK_THRESHOLD_MIN}
          aria-label={`Decrease ${label} threshold`}
          sx={stepButtonSx}
          {...bindStepPress(-1, disabled || value <= HOOK_THRESHOLD_MIN)}
        >
          <RemoveIcon sx={{ fontSize: compact ? 16 : 18 }} />
        </IconButton>
        <TextField
          value={draft}
          disabled={disabled}
          type="number"
          variant="standard"
          onFocus={() => {
            setIsEditing(true);
            setDraft(String(value));
          }}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commitDraft();
              (event.target as HTMLInputElement).blur();
            }
          }}
          slotProps={{
            htmlInput: {
              min: HOOK_THRESHOLD_MIN,
              max: HOOK_THRESHOLD_MAX,
              step: HOOK_THRESHOLD_STEP,
              style: { textAlign: 'center' },
            },
          }}
          sx={{
            width: compact ? 72 : 84,
            '& .MuiInputBase-input': {
              fontFamily: monitoringMono,
              fontWeight: 700,
              color: 'primary.main',
              fontSize: compact ? '1.25rem' : '1.4rem',
              lineHeight: 1,
              py: 0,
            },
            '& .MuiInput-underline:before': { borderBottom: 'none' },
            '& .MuiInput-underline:after': { borderBottom: 'none' },
            '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
            '& input[type=number]': {
              MozAppearance: 'textfield',
            },
            '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
              WebkitAppearance: 'none',
              margin: 0,
            },
          }}
        />
        <IconButton
          size="small"
          disabled={disabled || value >= HOOK_THRESHOLD_MAX}
          aria-label={`Increase ${label} threshold`}
          sx={stepButtonSx}
          {...bindStepPress(1, disabled || value >= HOOK_THRESHOLD_MAX)}
        >
          <AddIcon sx={{ fontSize: compact ? 16 : 18 }} />
        </IconButton>
      </Box>
    </Box>
  );
};
