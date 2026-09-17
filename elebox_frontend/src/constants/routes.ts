export const ROUTES = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  DASHBOARD: '/dashboard',
  USERS: '/users',
  LOCATIONS: '/locations',
  WORK_AREAS: '/work-areas',
  TICKETS: '/tickets',
  MY_TICKETS: '/my-tickets',
  SBOXES: '/sboxes',
  MY_SBOXES: '/my-sboxes',
  SBOX_DETAIL: '/sboxes/:id',
  SBOX_REGISTER: '/sboxes/register',
  SBOX_ASSIGNMENT: '/sbox-assignment',
  MONITORING: '/monitoring',
  NOTIFICATIONS: '/notifications',
  BATTERY_HEALTH: '/battery-health',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  IMPORT_LOCATIONS: '/imports/locations',
  IMPORT_WORK_AREAS: '/imports/work-areas',
  IMPORT_USERS: '/imports/users',
  IMPORT_SBOXES: '/imports/sboxes',
  FORBIDDEN: '/403',
  NOT_FOUND: '/404',
} as const;

export const getDefaultRouteForRole = (role: string): string => {
  switch (role) {
    case 'Admin':
    case 'Manager':
      return ROUTES.DASHBOARD;
    case 'Employee':
      return ROUTES.MY_SBOXES;
    default:
      return ROUTES.DASHBOARD;
  }
};
