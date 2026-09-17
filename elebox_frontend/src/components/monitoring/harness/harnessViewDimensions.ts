/** Fluid harness viewport — scales down to the column instead of overflowing. */
export const HARNESS_VIEW_SX = {
  position: 'relative' as const,
  width: '100%',
  maxWidth: '20rem',
  aspectRatio: '11 / 17.5',
  height: 'auto',
  mx: 'auto',
  flexShrink: 1,
  borderRadius: 2,
  overflow: 'hidden',
  bgcolor: 'grey.50',
  border: 1,
  borderColor: 'divider',
  boxShadow: '0 2px 12px rgba(15, 23, 42, 0.08)',
} as const;

/**
 * Side-card layout (original): Buckle 3 left, harness center, Buckle 2/1 right.
 * Stack only on very narrow phone panels. Mac half-width columns are often ~24–32rem.
 */
export const HARNESS_SIDE_LAYOUT_MIN = '20rem';

/** Set to true to show the Edit Pointer Positions calibration UI. */
export const ENABLE_POINTER_CALIBRATION = false;
