export const ESP_HOOK_OVERLOAD_MAX = 40000;

/** Fine resistance range: 2.5k – 4.5k */
export const getFinePercent = (value: number): number =>
  Math.max(0, Math.min(((value - 2500) / (4500 - 2500)) * 100, 100));

export const getFineColor = (percent: number): string => {
  const ratio = percent / 100;
  return `rgb(${Math.floor(255 * ratio)}, ${Math.floor(255 * (1 - ratio))}, 0)`;
};

/** Overload range: 4.5k – 40k */
export const getOverloadPercent = (value: number): number =>
  Math.max(0, Math.min(((value - 4500) / (40000 - 4500)) * 100, 100));

export const getOverloadColor = (percent: number): string =>
  `rgb(255, ${Math.floor(165 * (1 - percent / 100))}, 0)`;
