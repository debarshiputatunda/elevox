import { Link as RouterLink } from 'react-router-dom';
import { TextField, Button, Box, Link, Alert } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ROUTES } from '@/constants/routes';

const schema = Yup.object({
  email: Yup.string().email('Invalid email').required('Email is required'),
});

export const ForgotPasswordPage = () => {
  const formik = useFormik({
    initialValues: { email: '' },
    validationSchema: schema,
    onSubmit: () => {},
  });

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your email to receive a password reset link."
    >
      <Alert severity="info" sx={{ mb: 2 }}>
        Password reset will be available once the backend email service is connected.
      </Alert>
      <Box component="form" onSubmit={formik.handleSubmit}>
        <TextField
          fullWidth
          margin="normal"
          label="Email"
          name="email"
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.email && Boolean(formik.errors.email)}
          helperText={formik.touched.email && formik.errors.email}
        />
        <Button type="submit" fullWidth variant="contained" size="large" sx={{ mt: 3, mb: 2 }}>
          Send Reset Link
        </Button>
        <Link component={RouterLink} to={ROUTES.LOGIN} variant="body2">
          Back to Sign In
        </Link>
      </Box>
    </AuthLayout>
  );
};
