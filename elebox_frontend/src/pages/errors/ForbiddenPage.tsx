import { Box, Typography, Button, Paper } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

export const ForbiddenPage = () => {
  const navigate = useNavigate();
  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={2}
      bgcolor="background.default"
    >
      <Paper sx={{ p: { xs: 3, md: 5 }, textAlign: 'center', maxWidth: 480, width: '100%' }}>
        <BlockIcon sx={{ fontSize: 72, color: 'error.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Access denied
        </Typography>
        <Typography color="text.secondary" mb={3}>
          You do not have permission to view this page. Contact an administrator if you believe this is a mistake.
        </Typography>
        <Button variant="contained" onClick={() => navigate(ROUTES.DASHBOARD)}>
          Go to Dashboard
        </Button>
      </Paper>
    </Box>
  );
};
