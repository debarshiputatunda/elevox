import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAppSelector } from '@/hooks/redux';
import { ROUTES } from '@/constants/routes';

export const ProtectedRoute = () => {
  const location = useLocation();
  const { isAuthenticated, initialized, loading } = useAppSelector((s) => s.auth);

  if (!initialized && loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <Outlet />;
};
