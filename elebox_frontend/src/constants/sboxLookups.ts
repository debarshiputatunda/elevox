export const ACTIVITY_STATUS_OPTIONS = [
  { id: 1, name: 'Active' },
  { id: 2, name: 'Inactive' },
] as const;

export const BOX_HEALTH_STATUS_OPTIONS = [
  { id: 1, name: 'Healthy' },
  { id: 2, name: 'Warning' },
  { id: 3, name: 'Critical' },
] as const;

export const lookupSboxStatusName = (
  options: readonly { id: number; name: string }[],
  id?: number | null,
): string | undefined => {
  if (id == null) return undefined;
  return options.find((option) => option.id === id)?.name;
};
