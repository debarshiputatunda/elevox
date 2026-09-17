import { Box, Paper, Typography } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import type { ReactNode } from 'react';
import { palette, darkPalette } from '@/theme';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => (
  <Box
    minHeight="100vh"
    display="flex"
    alignItems="center"
    justifyContent="center"
    sx={{
      background: (theme) =>
        theme.palette.mode === 'light'
          ? `linear-gradient(160deg, ${palette.cream} 0%, #F7F9F0 48%, ${palette.sage} 100%)`
          : `linear-gradient(160deg, ${darkPalette.black} 0%, ${darkPalette.deep} 55%, ${darkPalette.muted} 100%)`,
      p: { xs: 1.5, sm: 2, md: 3 },
    }}
  >
    <Paper
      elevation={0}
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', sm: 420, md: 440 },
        p: { xs: 2.5, sm: 4 },
        borderRadius: 2.5,
        border: 1,
        borderColor: 'divider',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      }}
    >
      <Box display="flex" alignItems="center" gap={1.5} mb={3}>
        <ShieldIcon color="primary" sx={{ fontSize: { xs: 36, sm: 40 } }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            S-Box Safety
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Industrial Safety Monitoring Platform
          </Typography>
        </Box>
      </Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" mb={3}>
          {subtitle}
        </Typography>
      )}
      {children}
    </Paper>
  </Box>
);
