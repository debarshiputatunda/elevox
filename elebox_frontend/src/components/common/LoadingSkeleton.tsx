import { Skeleton, Stack, Box, Grid } from '@mui/material';

interface LoadingSkeletonProps {
  rows?: number;
  variant?: 'table' | 'card' | 'form' | 'chart' | 'metrics';
}

export const LoadingSkeleton = ({ rows = 5, variant = 'table' }: LoadingSkeletonProps) => {
  if (variant === 'card') {
    return (
      <Box
        display="grid"
        gridTemplateColumns={{
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          lg: 'repeat(3, 1fr)',
          xl: 'repeat(4, 1fr)',
        }}
        gap={2}
      >
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={160} />
        ))}
      </Box>
    );
  }

  if (variant === 'metrics') {
    return (
      <Grid container spacing={2}>
        {Array.from({ length: rows }).map((_, i) => (
          <Grid item xs={6} md={4} xl={2} key={i}>
            <Skeleton variant="rounded" height={108} />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (variant === 'chart') {
    return <Skeleton variant="rounded" height={260} />;
  }

  if (variant === 'form') {
    return (
      <Stack spacing={2}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={56} />
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={1}>
      <Skeleton variant="rounded" height={48} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={52} />
      ))}
    </Stack>
  );
};
