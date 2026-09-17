/** Hook threshold control range (raw ESP reading units). */
export const HOOK_THRESHOLD_MIN = 0;
export const HOOK_THRESHOLD_MAX = 100_000;
export const HOOK_THRESHOLD_STEP = 50;
export const HOOK_THRESHOLD_DEFAULT = 3870;

export const ESP_HOOK_FINE_MIN = 2500;
export const ESP_HOOK_FINE_MAX = 4500;

/** Normalize a stored threshold to a raw reading in the allowed control range. */
export const thresholdToRaw = (value: number | undefined | null): number => {
  if (value == null || Number.isNaN(value)) return HOOK_THRESHOLD_DEFAULT;
  return clampHookThreshold(value);
};

export const rawToThresholdPercent = (raw: number): number => {
  const span = ESP_HOOK_FINE_MAX - ESP_HOOK_FINE_MIN;
  if (span <= 0) return 0;
  return Math.round(Math.max(0, Math.min(((raw - ESP_HOOK_FINE_MIN) / span) * 100, 100)));
};

export const isHookExceeded = (hookValue: number, thresholdRaw: number): boolean =>
  hookValue >= thresholdRaw;

export const normalizeHookThreshold = (value: number): number => {
  const snapped = Math.round(value / HOOK_THRESHOLD_STEP) * HOOK_THRESHOLD_STEP;
  return Math.max(HOOK_THRESHOLD_MIN, Math.min(HOOK_THRESHOLD_MAX, snapped));
};

export const clampHookThreshold = (value: number): number =>
  Math.max(HOOK_THRESHOLD_MIN, Math.min(HOOK_THRESHOLD_MAX, value));
