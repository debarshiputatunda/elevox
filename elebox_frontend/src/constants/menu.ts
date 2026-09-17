import type { UserRole } from '@/types';
import type { Permission } from './roles';
import { hasAnyPermission } from './roles';
import { ROUTES } from './routes';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import WorkIcon from '@mui/icons-material/Work';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import DevicesIcon from '@mui/icons-material/Devices';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CampaignIcon from '@mui/icons-material/Campaign';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import type { SvgIconComponent } from '@mui/icons-material';

export interface MenuLeaf {
  type: 'item';
  label: string;
  path: string;
  icon: SvgIconComponent;
  permissions: Permission[];
}

export interface MenuGroup {
  type: 'group';
  label: string;
  icon: SvgIconComponent;
  children: MenuLeaf[];
}

export type MenuEntry = MenuLeaf | MenuGroup;

const canAccess = (role: UserRole, permissions: Permission[]) =>
  hasAnyPermission(role, permissions);

const resolveSBoxPath = (role: UserRole) =>
  role === 'Employee' ? ROUTES.MY_SBOXES : ROUTES.SBOXES;

const resolveTicketsPath = (role: UserRole) =>
  role === 'Employee' ? ROUTES.MY_TICKETS : ROUTES.TICKETS;

const buildMenuStructure = (role: UserRole): MenuEntry[] => [
  {
    type: 'item',
    label: 'Dashboard',
    path: ROUTES.DASHBOARD,
    icon: DashboardIcon,
    permissions: ['dashboard'],
  },
  {
    type: 'item',
    label: 'S-Boxes',
    path: resolveSBoxPath(role),
    icon: DevicesIcon,
    permissions: ['sboxes.manage', 'sboxes.view'],
  },
  {
    type: 'item',
    label: 'Assignment',
    path: ROUTES.SBOX_ASSIGNMENT,
    icon: AssignmentIndIcon,
    permissions: ['sboxes.manage'],
  },
  {
    type: 'item',
    label: 'Monitoring',
    path: ROUTES.MONITORING,
    icon: MonitorHeartIcon,
    permissions: ['monitoring'],
  },
  {
    type: 'group',
    label: 'Alerts',
    icon: CampaignIcon,
    children: [
      {
        type: 'item',
        label: 'Notifications',
        path: ROUTES.NOTIFICATIONS,
        icon: NotificationsIcon,
        permissions: ['notifications'],
      },
      {
        type: 'item',
        label: 'Battery Health',
        path: ROUTES.BATTERY_HEALTH,
        icon: BatteryChargingFullIcon,
        permissions: ['batteryHealth'],
      },
      {
        type: 'item',
        label: 'Reports',
        path: ROUTES.REPORTS,
        icon: AssessmentIcon,
        permissions: ['reports'],
      },
    ],
  },
  {
    type: 'group',
    label: 'Administrator',
    icon: AdminPanelSettingsIcon,
    children: [
      {
        type: 'item',
        label: 'Users',
        path: ROUTES.USERS,
        icon: PeopleIcon,
        permissions: ['users.manage', 'users.view'],
      },
      {
        type: 'item',
        label: 'Locations',
        path: ROUTES.LOCATIONS,
        icon: LocationOnIcon,
        permissions: ['locations.manage', 'locations.view'],
      },
      {
        type: 'item',
        label: 'Work Areas',
        path: ROUTES.WORK_AREAS,
        icon: WorkIcon,
        permissions: ['workAreas.manage', 'workAreas.view'],
      },
    ],
  },
  {
    type: 'group',
    label: 'Bulk Import',
    icon: UploadFileIcon,
    children: [
      {
        type: 'item',
        label: 'Import Locations',
        path: ROUTES.IMPORT_LOCATIONS,
        icon: LocationOnIcon,
        permissions: ['locations.manage'],
      },
      {
        type: 'item',
        label: 'Import Work Areas',
        path: ROUTES.IMPORT_WORK_AREAS,
        icon: WorkIcon,
        permissions: ['workAreas.manage'],
      },
      {
        type: 'item',
        label: 'Import Users',
        path: ROUTES.IMPORT_USERS,
        icon: PeopleIcon,
        permissions: ['users.manage'],
      },
      {
        type: 'item',
        label: 'Import S-Boxes',
        path: ROUTES.IMPORT_SBOXES,
        icon: DevicesIcon,
        permissions: ['sboxes.manage'],
      },
    ],
  },
  {
    type: 'item',
    label: 'Tickets',
    path: resolveTicketsPath(role),
    icon: ConfirmationNumberIcon,
    permissions: ['tickets.manage', 'tickets.view'],
  },
  {
    type: 'item',
    label: 'Settings',
    path: ROUTES.SETTINGS,
    icon: SettingsIcon,
    permissions: ['settings'],
  },
];

export const getMenuForRole = (role: UserRole): MenuEntry[] => {
  const structure = buildMenuStructure(role);
  const menu: MenuEntry[] = [];

  structure.forEach((entry) => {
    if (entry.type === 'item') {
      if (canAccess(role, entry.permissions)) {
        menu.push(entry);
      }
      return;
    }

    const visibleChildren = entry.children.filter((child) =>
      canAccess(role, child.permissions),
    );

    if (visibleChildren.length > 0) {
      menu.push({ ...entry, children: visibleChildren });
    }
  });

  return menu;
};
