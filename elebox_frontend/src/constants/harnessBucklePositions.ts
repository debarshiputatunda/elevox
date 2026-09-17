import type { BuckleKey } from '@/constants/harnessBuckles';

export interface BucklePositionPercent {
  /** Horizontal position as % of harness image width (0–100) */
  x: number;
  /** Vertical position as % of harness image height (0–100) */
  y: number;
}

export type BucklePositionsMap = Record<BuckleKey, BucklePositionPercent>;

export const DEFAULT_BUCKLE_POSITIONS: BucklePositionsMap = {
  buckle1: { x: 87.0, y: 69.1 },
  buckle2: { x: 52.9, y: 29.4 },
  buckle3: { x: 12.9, y: 69.8 },
};

const STORAGE_KEY = 'elebox.harness.bucklePositions';

const isValidPosition = (value: unknown): value is BucklePositionPercent => {
  if (!value || typeof value !== 'object') return false;
  const pos = value as BucklePositionPercent;
  return (
    typeof pos.x === 'number' &&
    typeof pos.y === 'number' &&
    Number.isFinite(pos.x) &&
    Number.isFinite(pos.y)
  );
};

export const toCssPosition = (position: BucklePositionPercent): { left: string; top: string } => ({
  left: `${position.x.toFixed(1)}%`,
  top: `${position.y.toFixed(1)}%`,
});

export const clampPosition = (position: BucklePositionPercent): BucklePositionPercent => ({
  x: Math.min(100, Math.max(0, position.x)),
  y: Math.min(100, Math.max(0, position.y)),
});

export const loadBucklePositions = (): BucklePositionsMap => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BUCKLE_POSITIONS };

    const parsed = JSON.parse(raw) as Partial<BucklePositionsMap>;
    return {
      buckle1: isValidPosition(parsed.buckle1) ? clampPosition(parsed.buckle1) : DEFAULT_BUCKLE_POSITIONS.buckle1,
      buckle2: isValidPosition(parsed.buckle2) ? clampPosition(parsed.buckle2) : DEFAULT_BUCKLE_POSITIONS.buckle2,
      buckle3: isValidPosition(parsed.buckle3) ? clampPosition(parsed.buckle3) : DEFAULT_BUCKLE_POSITIONS.buckle3,
    };
  } catch {
    return { ...DEFAULT_BUCKLE_POSITIONS };
  }
};

export const saveBucklePositions = (positions: BucklePositionsMap): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
};

export const clearSavedBucklePositions = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const formatPositionClipboard = (key: BuckleKey, position: BucklePositionPercent): string => {
  const css = toCssPosition(position);
  return `${key}: {
    left: "${css.left}",
    top: "${css.top}"
}`;
};

export const exportPositionsJson = (positions: BucklePositionsMap): string => {
  const payload = Object.fromEntries(
    (Object.keys(positions) as BuckleKey[]).map((key) => {
      const css = toCssPosition(positions[key]);
      return [key, { left: css.left, top: css.top }];
    }),
  );
  return JSON.stringify(payload, null, 2);
};
