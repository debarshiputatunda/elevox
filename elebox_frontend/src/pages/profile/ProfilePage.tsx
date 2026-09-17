import { Box, Card, CardContent, Typography, Avatar, Grid, Divider, Button, TextField } from '@mui/material';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAppSelector } from '@/hooks/redux';

export const ProfilePage = () => {
  const user = useAppSelector((s) => s.auth.user);

  if (!user) return null;

  return (
    <Box>
      <PageHeader title="My Profile" subtitle="View and manage your account information" />
      <Card sx={{ maxWidth: 720 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box display="flex" alignItems="center" gap={2} mb={3} flexWrap="wrap">
            <Avatar sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: 28 }}>
              {user.fullName.charAt(0)}
            </Avatar>
            <Box minWidth={0}>
              <Typography variant="h5">{user.fullName}</Typography>
              <Typography color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                {user.email}
              </Typography>
              <Box mt={1}>
                <StatusBadge label={user.role} color="primary" />
              </Box>
            </Box>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Full name" defaultValue={user.fullName} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email" defaultValue={user.email} disabled />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Employee ID" defaultValue={user.employeeId} disabled />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Mobile" defaultValue={user.mobileNumber} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Work Area</Typography>
              <Typography>{user.workAreaName ?? '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Location</Typography>
              <Typography>{user.locationName ?? '-'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              <Typography>{user.status}</Typography>
            </Grid>
          </Grid>
          <Button variant="contained" sx={{ mt: 3 }} disabled>
            Save Changes
          </Button>
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            Profile updates will be available when the account API supports them.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
