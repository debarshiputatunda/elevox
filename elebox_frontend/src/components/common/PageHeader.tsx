import { Box, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: ReactNode;
}

export const PageHeader = ({ title, subtitle, breadcrumbs, action }: PageHeaderProps) => (
  <Box
    display="flex"
    justifyContent="space-between"
    alignItems={{ xs: 'stretch', sm: 'flex-start' }}
    flexDirection={{ xs: 'column', sm: 'row' }}
    mb={{ xs: 2, md: 3 }}
    gap={1.5}
  >
    <Box minWidth={0}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs sx={{ mb: 1 }}>
          {breadcrumbs.map((bc, i) =>
            bc.path ? (
              <MuiLink key={i} component={Link} to={bc.path} underline="hover" color="inherit">
                {bc.label}
              </MuiLink>
            ) : (
              <Typography key={i} color="text.primary" fontSize={14}>
                {bc.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
      )}
      <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.2rem', md: '1.35rem' } }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {action && (
      <Box
        display="flex"
        flexWrap="wrap"
        gap={1}
        sx={{
          '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } },
        }}
      >
        {action}
      </Box>
    )}
  </Box>
);
