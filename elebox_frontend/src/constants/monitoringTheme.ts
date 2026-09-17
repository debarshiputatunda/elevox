import { FONT_MONO } from '@/theme';

/** Shared monitoring utilities (visual styling uses MUI theme tokens). */
export const monitoringMono = FONT_MONO;

export const batteryColor = (level: number): string => {
  if (level < 40) return '#d32f2f';
  if (level <= 60) return '#ed6c02';
  return '#2e7d32';
};

export const batteryMuiColor = (level: number): 'error.main' | 'warning.main' | 'success.main' => {
  if (level < 40) return 'error.main';
  if (level <= 60) return 'warning.main';
  return 'success.main';
};
