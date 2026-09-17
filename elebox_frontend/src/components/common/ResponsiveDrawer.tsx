import { Drawer, useTheme } from '@mui/material';
import type { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/useResponsive';

interface ResponsiveDrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

export const ResponsiveDrawer = ({
  open,
  onClose,
  children,
  width = 420,
}: ResponsiveDrawerProps) => {
  const isMobile = useIsMobile();
  const theme = useTheme();

  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: isMobile
          ? {
              height: '92vh',
              maxHeight: '92vh',
              borderTopLeftRadius: `${theme.shape.borderRadius}px`,
              borderTopRightRadius: `${theme.shape.borderRadius}px`,
            }
          : {
              width,
              maxWidth: '100%',
            },
      }}
    >
      {children}
    </Drawer>
  );
};
