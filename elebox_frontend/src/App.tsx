import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { fetchCurrentUser, setInitialized } from '@/store/slices/authSlice';
import { router } from '@/routes/router';
import { tokenStorage } from '@/utils/storage';

const AppInitializer = () => {
  const dispatch = useAppDispatch();
  const { initialized, loading } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (initialized) return;
    if (tokenStorage.getAccessToken()) {
      dispatch(fetchCurrentUser());
    } else {
      dispatch(setInitialized());
    }
  }, [dispatch, initialized]);

  const showBootstrapLoader = !initialized && loading && Boolean(tokenStorage.getAccessToken());

  return (
    <>
      {showBootstrapLoader && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: (theme) => theme.zIndex.modal + 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
          }}
        >
          <CircularProgress />
        </Box>
      )}
      <RouterProvider router={router} />
    </>
  );
};

export default function App() {
  return <AppInitializer />;
}
