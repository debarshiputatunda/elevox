import { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import {
  clearBellNotifications,
  dismissBellNotification,
} from '@/store/slices/notificationsSlice';

export const NotificationBell = () => {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const dispatch = useAppDispatch();
  const bellItems = useAppSelector((s) => s.notifications.bellItems);
  const unreadCount = bellItems.length;

  const handleMarkAllRead = () => {
    dispatch(clearBellNotifications());
  };

  const handleDismiss = (id: number) => {
    dispatch(dismissBellNotification(id));
  };

  return (
    <>
      <IconButton color="inherit" onClick={(e) => setAnchor(e.currentTarget)} aria-label="notifications" sx={{ width: 44, height: 44 }}>
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 360 }, maxWidth: '100%', maxHeight: 400 } }}
      >
        <Box px={2} py={1} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" fontWeight={600}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />
        {bellItems.length === 0 ? (
          <MenuItem disabled>No notifications</MenuItem>
        ) : (
          bellItems.map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => handleDismiss(notification.id)}
              sx={{
                bgcolor: 'action.hover',
                whiteSpace: 'normal',
              }}
            >
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {notification.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {notification.message}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
};
