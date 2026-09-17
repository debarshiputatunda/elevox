import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import { NotificationBell } from '@/components/common/NotificationBell';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { usePermission } from '@/hooks/usePermission';
import { logout } from '@/store/slices/authSlice';
import { useThemeMode } from '@/context/ThemeContext';
import { ROUTES } from '@/constants/routes';
import { SIDEBAR_WIDTH } from './Sidebar';
import { SIDEBAR_BREAKPOINT } from '@/theme';

interface TopNavbarProps {
  onMenuClick: () => void;
}

export const TopNavbar = ({ onMenuClick }: TopNavbarProps) => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const { can } = usePermission();
  const { mode, toggleTheme } = useThemeMode();

  const handleLogout = () => {
    dispatch(logout());
    navigate(ROUTES.LOGIN);
  };

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        width: { [SIDEBAR_BREAKPOINT]: `calc(100% - ${SIDEBAR_WIDTH}px)` },
        ml: { [SIDEBAR_BREAKPOINT]: `${SIDEBAR_WIDTH}px` },
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, gap: 1, px: { xs: 1, sm: 2 } }}>
        <IconButton
          edge="start"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          sx={{ display: { [SIDEBAR_BREAKPOINT]: 'none' }, width: 44, height: 44 }}
        >
          <MenuIcon />
        </IconButton>
        <Typography
          variant="body2"
          color="text.secondary"
          fontWeight={600}
          noWrap
          sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}
        >
          Industrial Safety Monitoring Platform
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          fontWeight={700}
          noWrap
          sx={{ flexGrow: 1, display: { xs: 'block', sm: 'none' } }}
        >
          S-Box Safety
        </Typography>
        <Box display="flex" alignItems="center" gap={0.25}>
          <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
            <IconButton
              onClick={toggleTheme}
              color="inherit"
              aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
              sx={{ width: 44, height: 44 }}
            >
              {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
            </IconButton>
          </Tooltip>
          {can('notifications') && <NotificationBell />}
          <IconButton
            onClick={(e) => setAnchor(e.currentTarget)}
            aria-label="Account menu"
            sx={{ width: 44, height: 44 }}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13 }}>
              {user?.fullName?.charAt(0) ?? 'U'}
            </Avatar>
          </IconButton>
        </Box>
        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
          slotProps={{ paper: { sx: { minWidth: 220 } } }}
        >
          <Box px={2} py={1}>
            <Typography variant="subtitle2">{user?.fullName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.role} · {user?.email}
            </Typography>
          </Box>
          <Divider />
          <MenuItem
            onClick={() => {
              setAnchor(null);
              navigate(ROUTES.PROFILE);
            }}
          >
            <PersonIcon fontSize="small" sx={{ mr: 1 }} /> Profile
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};
