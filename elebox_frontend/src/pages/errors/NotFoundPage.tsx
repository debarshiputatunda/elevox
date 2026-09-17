import { Box, Typography, Button, Paper } from '@mui/material';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

export const NotFoundPage = () => {
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
        <SearchOffIcon sx={{ fontSize: 72, color: 'primary.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Page not found
        </Typography>
        <Typography color="text.secondary" mb={3}>
          The page you are looking for does not exist or has been moved.
        </Typography>
        <Button variant="contained" onClick={() => navigate(ROUTES.DASHBOARD)}>
          Go to Dashboard
        </Button>
      </Paper>
    </Box>
  );
};
