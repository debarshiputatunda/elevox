export type BuckleState = 'fastened' | 'open' | 'offline' | 'unknown';

export type BuckleKey = 'buckle1' | 'buckle2' | 'buckle3';

export type HookKey = 'hookA' | 'hookB';

export type HarnessPointerKey = BuckleKey | HookKey;

export const isHookKey = (key: HarnessPointerKey): key is HookKey =>
  key === 'hookA' || key === 'hookB';

export interface BuckleConfig {
  key: BuckleKey;
  label: string;
  region: string;
  /** Local-space anchor on the centered 3D harness model */
  position3d: [number, number, number];
  fastenedDescription: string;
  openDescription: string;
}

export const BUCKLE_CONFIG: BuckleConfig[] = [
  {
    key: 'buckle2',
    label: 'Buckle 2',
    region: 'Chest Buckle',
    position3d: [0, 0.42, 0.14],
    fastenedDescription: 'Chest buckle securely fastened.',
    openDescription: 'Chest buckle is open. Immediate attention required.',
  },
  {
    key: 'buckle1',
    label: 'Buckle 1',
    region: 'Left Leg Buckle',
    position3d: [0.32, -0.32, 0.1],
    fastenedDescription: 'Left leg buckle securely fastened.',
    openDescription: 'Left leg buckle disconnected.',
  },
  {
    key: 'buckle3',
    label: 'Buckle 3',
    region: 'Right Leg Buckle',
    position3d: [-0.32, -0.32, 0.1],
    fastenedDescription: 'Right leg buckle securely fastened.',
    openDescription: 'Right leg buckle disconnected.',
  },
];

export const getBuckleState = (value?: number, isOffline?: boolean): BuckleState => {
  if (isOffline) return 'offline';
  if (value === 0) return 'fastened';
  if (value === 1) return 'open';
  return 'unknown';
};

export const getBuckleStatusLabel = (state: BuckleState): string => {
  switch (state) {
    case 'fastened':
      return 'FASTENED';
    case 'open':
      return 'OPEN';
    case 'offline':
      return 'OFFLINE';
    default:
      return 'N/A';
  }
};

export interface HookConfig {
  key: HookKey;
  label: string;
  region: string;
  /** Local-space anchor on the centered 3D harness model */
  position3d: [number, number, number];
  normalDescription: string;
  exceededDescription: string;
}

export const HOOK_CONFIG: HookConfig[] = [
  {
    key: 'hookA',
    label: 'Hook A',
    region: 'Left Lanyard Hook',
    // Fallback until the GLB mesh is sampled. Live anchors come from the
    // leftmost / rightmost hook vertices so side view stays attached.
    position3d: [-0.58, 0.08, 0.38],
    normalDescription: 'Hook A load is within the set threshold.',
    exceededDescription: 'Hook A load has exceeded the threshold.',
  },
  {
    key: 'hookB',
    label: 'Hook B',
    region: 'Right Lanyard Hook',
    // Fallback until the GLB mesh is sampled. Live anchors come from the
    // leftmost / rightmost hook vertices so side view stays attached.
    position3d: [0.58, 0.08, 0.38],
    normalDescription: 'Hook B load is within the set threshold.',
    exceededDescription: 'Hook B load has exceeded the threshold.',
  },
];

export const HARNESS_POINTER_KEYS: HarnessPointerKey[] = [
  ...BUCKLE_CONFIG.map((config) => config.key),
  ...HOOK_CONFIG.map((config) => config.key),
];

export const getHookState = (
  isOffline?: boolean,
  exceeded?: boolean,
  invalid?: boolean,
): BuckleState => {
  if (isOffline) return 'offline';
  if (invalid) return 'unknown';
  if (exceeded) return 'open';
  return 'fastened';
};

export const getHookStatusLabel = (state: BuckleState): string => {
  switch (state) {
    case 'fastened':
      return 'NORMAL';
    case 'open':
      return 'EXCEEDED';
    case 'offline':
      return 'OFFLINE';
    default:
      return 'INVALID';
  }
};

export const getHookDescription = (config: HookConfig, state: BuckleState): string => {
  switch (state) {
    case 'fastened':
      return config.normalDescription;
    case 'open':
      return config.exceededDescription;
    case 'offline':
      return 'Controller offline. Hook status unavailable.';
    default:
      return 'Invalid hook measurement. See sensing diagnostics.';
  }
};

export const getBuckleDescription = (config: BuckleConfig, state: BuckleState): string => {
  switch (state) {
    case 'fastened':
      return config.fastenedDescription;
    case 'open':
      return config.openDescription;
    case 'offline':
      return 'Controller offline. Buckle status unavailable.';
    default:
      return 'Buckle status unknown.';
  }
};
