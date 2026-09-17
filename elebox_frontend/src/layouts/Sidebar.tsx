import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Collapse,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Typography,
  Divider,
  Badge,
  Avatar,
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useAppSelector } from '@/hooks/redux';
import { getMenuForRole, type MenuEntry, type MenuLeaf } from '@/constants/menu';
import { ROUTES } from '@/constants/routes';
import { SIDEBAR_BREAKPOINT } from '@/theme';

const DRAWER_WIDTH = 260;
const ALWAYS_OPEN_GROUPS = new Set(['Alerts', 'Administrator']);
const OTHER_LABELS = new Set(['Bulk Import', 'Tickets', 'Settings']);

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const isPathActive = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`);

const entryLabel = (entry: MenuEntry) => (entry.type === 'group' ? entry.label : entry.label);

const isOtherEntry = (entry: MenuEntry) => OTHER_LABELS.has(entryLabel(entry));

const SectionLabel = ({ children }: { children: string }) => (
  <Typography
    variant="caption"
    color="text.secondary"
    fontWeight={700}
    letterSpacing={0.8}
    sx={{
      px: 1.5,
      pt: 1.5,
      pb: 0.5,
      display: 'block',
      textTransform: 'uppercase',
      fontSize: '0.65rem',
    }}
  >
    {children}
  </Typography>
);

export const Sidebar = ({ mobileOpen, onClose }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const unreadCount = useAppSelector((s) => s.notifications.unreadCount);
  const menuItems = useMemo(
    () => (user ? getMenuForRole(user.role) : []),
    [user?.role],
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const expanded: Record<string, boolean> = {};
    menuItems.forEach((entry) => {
      if (entry.type === 'group') {
        const hasActiveChild = entry.children.some((child) =>
          isPathActive(location.pathname, child.path),
        );
        if (hasActiveChild) {
          expanded[entry.label] = true;
        }
      }
    });
    setOpenGroups((current) => ({ ...current, ...expanded }));
  }, [location.pathname, menuItems]);

  const toggleGroup = (label: string) => {
    setOpenGroups((current) => ({
      ...current,
      [label]: !current[label],
    }));
  };

  const handleNavigate = (path: string) => {
    if (location.pathname !== path) {
      navigate(path);
    }
    onClose();
  };

  const navButtonSx = (active: boolean) => ({
    borderRadius: 2,
    mb: 0.5,
    minHeight: 44,
    borderLeft: 3,
    borderColor: active ? 'primary.main' : 'transparent',
    bgcolor: active ? 'action.selected' : 'transparent',
  });

  const renderLeaf = (entry: MenuLeaf, inset = false) => {
    const Icon = entry.icon;
    const active = isPathActive(location.pathname, entry.path);
    const showBadge = entry.path === ROUTES.NOTIFICATIONS && unreadCount > 0;
    return (
      <ListItemButton
        key={entry.path}
        selected={active}
        onClick={() => handleNavigate(entry.path)}
        sx={{ ...navButtonSx(active), pl: inset ? 4 : 2 }}
        aria-current={active ? 'page' : undefined}
      >
        <ListItemIcon sx={{ minWidth: inset ? 36 : 40 }}>
          {showBadge ? (
            <Badge badgeContent={unreadCount} color="error" max={99}>
              <Icon fontSize="small" color={active ? 'primary' : 'inherit'} />
            </Badge>
          ) : (
            <Icon fontSize="small" color={active ? 'primary' : 'inherit'} />
          )}
        </ListItemIcon>
        <ListItemText
          primary={entry.label}
          primaryTypographyProps={{
            fontSize: inset ? 13 : 14,
            fontWeight: active ? 600 : 400,
          }}
        />
      </ListItemButton>
    );
  };

  const content = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ gap: 1.5, minHeight: { xs: 64, sm: 64 } }}>
        <ShieldIcon color="primary" sx={{ fontSize: 32 }} />
        <Box minWidth={0}>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2} noWrap>
            S-Box Safety
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            Industrial Monitoring
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1, px: 1, py: 1, overflowY: 'auto' }} aria-label="Main navigation">
        {menuItems.map((entry, index) => {
          const previous = menuItems[index - 1];
          const showMain = index === 0;
          const showOther = isOtherEntry(entry) && (!previous || !isOtherEntry(previous));
          const showGroupSection =
            entry.type === 'group' && ALWAYS_OPEN_GROUPS.has(entry.label);

          return (
            <Box key={entry.type === 'group' ? entry.label : entry.path}>
              {showMain && <SectionLabel>Main</SectionLabel>}
              {showGroupSection && <SectionLabel>{entry.label}</SectionLabel>}
              {showOther && <SectionLabel>Other</SectionLabel>}

              {entry.type === 'item' && renderLeaf(entry)}

              {entry.type === 'group' && ALWAYS_OPEN_GROUPS.has(entry.label) && (
                entry.children.map((child) => renderLeaf(child))
              )}

              {entry.type === 'group' && !ALWAYS_OPEN_GROUPS.has(entry.label) && (() => {
                const GroupIcon = entry.icon;
                const groupOpen = openGroups[entry.label] ?? false;
                const groupActive = entry.children.some((child) =>
                  isPathActive(location.pathname, child.path),
                );
                return (
                  <>
                    <ListItemButton
                      onClick={() => toggleGroup(entry.label)}
                      sx={{
                        borderRadius: 2,
                        minHeight: 44,
                        bgcolor: groupActive ? 'action.selected' : 'transparent',
                      }}
                      aria-expanded={groupOpen}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <GroupIcon fontSize="small" color={groupActive ? 'primary' : 'inherit'} />
                      </ListItemIcon>
                      <ListItemText
                        primary={entry.label}
                        primaryTypographyProps={{ fontSize: 14, fontWeight: groupActive ? 600 : 500 }}
                      />
                      {groupOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                    </ListItemButton>
                    <Collapse in={groupOpen} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {entry.children.map((child) => renderLeaf(child, true))}
                      </List>
                    </Collapse>
                  </>
                );
              })()}
            </Box>
          );
        })}
      </List>
      <Divider />
      <Box px={2} py={1.5} display="flex" alignItems="center" gap={1.25}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13 }}>
          {user?.fullName?.charAt(0) ?? 'U'}
        </Avatar>
        <Box minWidth={0}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {user?.fullName ?? 'Operator'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {user?.role ?? 'Guest'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { [SIDEBAR_BREAKPOINT]: DRAWER_WIDTH }, flexShrink: { [SIDEBAR_BREAKPOINT]: 0 } }}
      aria-label="Application"
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', [SIDEBAR_BREAKPOINT]: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: 1,
            borderColor: 'divider',
          },
        }}
      >
        {content}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', [SIDEBAR_BREAKPOINT]: 'block' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: 1,
            borderColor: 'divider',
          },
        }}
        open
      >
        {content}
      </Drawer>
    </Box>
  );
};

export const SIDEBAR_WIDTH = DRAWER_WIDTH;
