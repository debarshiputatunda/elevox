import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, Toolbar } from '@mui/material';
import { Sidebar, SIDEBAR_WIDTH } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { useTelemetryWebSocketBootstrap } from '@/hooks/useTelemetryWebSocket';
import { useDeviceDetachToast } from '@/hooks/useDeviceDetachToast';
import { useSafetyMonitor } from '@/hooks/useSafetyMonitor';
import { CONTENT_MAX_WIDTH, SIDEBAR_BREAKPOINT } from '@/theme';

export const MainLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useTelemetryWebSocketBootstrap();
  useDeviceDetachToast();
  useSafetyMonitor();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden' }}>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          width: { [SIDEBAR_BREAKPOINT]: `calc(100% - ${SIDEBAR_WIDTH}px)` },
          minWidth: 0,
        }}
      >
        <TopNavbar onMenuClick={() => setMobileOpen(true)} />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            bgcolor: 'background.default',
            minWidth: 0,
          }}
        >
          <Toolbar />
          <Box
            key={location.pathname}
            sx={{
              px: { xs: 1.5, sm: 2, md: 2, lg: 3 },
              py: { xs: 1.5, sm: 2, lg: 3 },
              maxWidth: CONTENT_MAX_WIDTH,
              mx: 'auto',
              width: '100%',
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
