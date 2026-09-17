import { Card, CardContent, Typography, Box, Skeleton, Chip } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import { FONT_MONO } from '@/theme';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: SvgIconComponent;
  color?: string;
  loading?: boolean;
  subtitle?: string;
  statusLabel?: string;
  statusColor?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export const MetricCard = ({
  title,
  value,
  icon: Icon,
  color = 'primary.main',
  loading,
  subtitle,
  statusLabel,
  statusColor = 'default',
}: MetricCardProps) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
        <Box minWidth={0}>
          <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom noWrap>
            {title}
          </Typography>
          {loading ? (
            <Skeleton width={64} height={40} />
          ) : (
            <Typography
              variant="h4"
              fontWeight={700}
              fontFamily={FONT_MONO}
              sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, lineHeight: 1.2 }}
            >
              {value}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
              {subtitle}
            </Typography>
          )}
          {statusLabel && (
            <Chip
              label={statusLabel}
              color={statusColor}
              size="small"
              sx={{ mt: 0.75, height: 22, fontSize: '0.65rem' }}
            />
          )}
        </Box>
        <Box
          sx={{
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : `${color}18`,
            color,
            p: { xs: 1, md: 1.5 },
            borderRadius: 2,
            display: 'flex',
            flexShrink: 0,
          }}
        >
          <Icon fontSize="small" />
        </Box>
      </Box>
    </CardContent>
  </Card>
);
