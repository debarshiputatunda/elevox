import { Box, Typography, Button } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';
import type { SvgIconComponent } from '@mui/icons-material';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: SvgIconComponent;
}

export const EmptyState = ({
  title = 'No data found',
  description = 'There are no records to display.',
  actionLabel,
  onAction,
  icon: Icon = InboxIcon,
}: EmptyStateProps) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    py={{ xs: 6, md: 8 }}
    px={2}
    textAlign="center"
  >
    <Icon sx={{ fontSize: { xs: 48, md: 64 }, color: 'text.disabled', mb: 2 }} />
    <Typography variant="h6" gutterBottom>
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary" mb={2} maxWidth={400}>
      {description}
    </Typography>
    {actionLabel && onAction && (
      <Button variant="contained" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </Box>
);
