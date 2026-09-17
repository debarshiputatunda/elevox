import { useMediaQuery, useTheme } from '@mui/material';

export const useIsMobile = () => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('md'));
};

export const useIsTablet = () => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.between('md', 'lg'));
};

export const useDialogFullScreen = () => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
};
