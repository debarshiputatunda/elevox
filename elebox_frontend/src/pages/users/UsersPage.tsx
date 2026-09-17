import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { AppTable, type Column } from '@/components/common/AppTable';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  ACCOUNT_STATUS_OPTIONS,
  JOB_TITLE_OPTIONS,
} from '@/constants/userLookups';
import { useUserEdit } from '@/hooks/useUserEdit';
import { locationService } from '@/services/locationService';
import { workAreaService } from '@/services/workAreaService';
import { roleService } from '@/services/roleService';
import { userService } from '@/services/userService';
import { useDialogFullScreen } from '@/hooks/useResponsive';
import type { User, UserFormValues } from '@/types';
import { defaultUserFormValues, userToFormValues } from '@/utils/userForm';
import { formatDateTime } from '@/utils/helpers';

const createSchema = Yup.object({
  employeeId: Yup.string().trim().required('Employee ID is required'),
  fullName: Yup.string().trim().required('Full name is required'),
  email: Yup.string().trim().email('Enter a valid email').required('Email is required'),
  mobileNumber: Yup.string().trim().required('Mobile number is required'),
  password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  roleId: Yup.number().required('Role is required'),
  jobTitleId: Yup.number().required('Job title is required'),
  workAreaId: Yup.number().required('Work area is required'),
  locationId: Yup.number().required('Location is required'),
  statusId: Yup.number().required('Status is required'),
});

const updateSchema = createSchema.shape({
  password: Yup.string().min(6, 'Password must be at least 6 characters'),
});

export const UsersPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const {
    openForEdit,
    saveEdit,
    isLoadingEdit,
    isSavingEdit,
    loadingEditUserId,
  } = useUserEdit();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string | undefined>('employeeId');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<UserFormValues>(
    defaultUserFormValues(),
  );
  const [showPassword, setShowPassword] = useState(false);
  const fullScreen = useDialogFullScreen();

  const listParams = {
    page: page + 1,
    pageSize,
    search: search || undefined,
    sortBy,
    sortOrder,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['users', listParams],
    queryFn: () => userService.getAll(listParams),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleService.list(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', 'options'],
    queryFn: () => locationService.list(),
  });

  const { data: workAreas = [] } = useQuery({
    queryKey: ['work-areas', 'options'],
    queryFn: () => workAreaService.list(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const createMutation = useMutation({
    mutationFn: userService.create,
    onSuccess: () => {
      enqueueSnackbar('User created successfully', { variant: 'success' });
      invalidate();
      setDialogOpen(false);
    },
    onError: (err: { message?: string }) => {
      enqueueSnackbar(err.message ?? 'Create failed', { variant: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: userService.delete,
    onSuccess: () => {
      enqueueSnackbar('User deleted successfully', { variant: 'success' });
      invalidate();
      setDeleteId(null);
    },
    onError: (err: { message?: string }) => {
      enqueueSnackbar(err.message ?? 'Delete failed', { variant: 'error' });
    },
  });

  const validationSchema = useMemo(
    () => (editUser ? updateSchema : createSchema),
    [editUser],
  );

  const formik = useFormik<UserFormValues>({
    initialValues: formInitialValues,
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (editUser) {
        try {
          await saveEdit({ id: editUser.id, values });
          setDialogOpen(false);
          setEditUser(null);
        } catch {
          // Error handled in useUserEdit
        }
        return;
      }
      createMutation.mutate(values);
    },
  });

  const filteredWorkAreas = workAreas.filter(
    (workArea) => workArea.locationId === formik.values.locationId,
  );

  const openCreate = () => {
    setEditUser(null);
    setShowPassword(false);
    setFormInitialValues(defaultUserFormValues());
    setDialogOpen(true);
  };

  const handleOpenEdit = async (user: User) => {
    const result = await openForEdit(user.id);
    if (!result) return;

    setShowPassword(false);
    setEditUser(result.user);
    setFormInitialValues(userToFormValues(result.user));
    setDialogOpen(true);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((order) => (order === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortOrder('asc');
  };

  const columns: Column<User>[] = [
    { id: 'employeeId', label: 'Employee ID', sortable: true },
    { id: 'fullName', label: 'Full Name', sortable: true, mobilePrimary: true },
    { id: 'email', label: 'Email', sortable: true },
    { id: 'mobileNumber', label: 'Mobile' },
    {
      id: 'role',
      label: 'Role',
      render: (row) => <StatusBadge label={row.role} color="primary" />,
    },
    {
      id: 'jobTitleName',
      label: 'Job Title',
      accessor: (row) => row.jobTitleName ?? '-',
    },
    {
      id: 'workAreaName',
      label: 'Work Area',
      accessor: (row) => row.workAreaName ?? '-',
    },
    {
      id: 'locationName',
      label: 'Location',
      accessor: (row) => row.locationName ?? '-',
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge
          label={row.status}
          color={row.status === 'Active' ? 'success' : 'default'}
        />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleOpenEdit(row)}
            disabled={isLoadingEdit}
            aria-label="edit user"
          >
            {loadingEditUserId === row.id ? (
              <CircularProgress size={18} />
            ) : (
              <EditIcon fontSize="small" />
            )}
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => setDeleteId(row.id)}
            disabled={isLoadingEdit}
            aria-label="delete user"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const isSaving = createMutation.isPending || isSavingEdit;

  return (
    <Box>
      <PageHeader
        title="Users"
        subtitle="Create, update, and manage employee accounts"
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Users' }]}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add User
          </Button>
        }
      />

      <Stack spacing={2} mb={2}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by employee ID, name, email, or mobile..."
        />
      </Stack>

      <AppTable
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        loading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSort={handleSort}
        getRowId={(row) => row.id}
        emptyTitle="No users"
        emptyDescription="No employee accounts match the current search."
      />

      <Dialog
        open={dialogOpen}
        onClose={() => !isSaving && setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={fullScreen}
      >
        <Box component="form" onSubmit={formik.handleSubmit}>
          <DialogTitle>{editUser ? 'Edit User' : 'Create User'}</DialogTitle>
          <DialogContent>
            {editUser && (
              <Box
                sx={{
                  mt: 1,
                  mb: 2,
                  p: 2,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  User ID: {editUser.id}
                  {editUser.createdAt ? ` · Created: ${formatDateTime(editUser.createdAt)}` : ''}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Current role: {editUser.role}
                  {editUser.jobTitleName ? ` · Job title: ${editUser.jobTitleName}` : ''}
                </Typography>
              </Box>
            )}

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Employee Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Employee ID"
                  name="employeeId"
                  value={formik.values.employeeId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isSaving}
                  error={formik.touched.employeeId && Boolean(formik.errors.employeeId)}
                  helperText={formik.touched.employeeId && formik.errors.employeeId}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="fullName"
                  value={formik.values.fullName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isSaving}
                  error={formik.touched.fullName && Boolean(formik.errors.fullName)}
                  helperText={formik.touched.fullName && formik.errors.fullName}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isSaving}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Mobile Number"
                  name="mobileNumber"
                  value={formik.values.mobileNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isSaving}
                  error={formik.touched.mobileNumber && Boolean(formik.errors.mobileNumber)}
                  helperText={formik.touched.mobileNumber && formik.errors.mobileNumber}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 3, mb: 1 }}>
              Access & Assignment
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Role"
                  name="roleId"
                  value={formik.values.roleId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isSaving}
                  error={formik.touched.roleId && Boolean(formik.errors.roleId)}
                  helperText={formik.touched.roleId && formik.errors.roleId}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.role_id} value={role.role_id}>
                      {role.role_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Job Title"
                  name="jobTitleId"
                  value={formik.values.jobTitleId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isSaving}
                  error={formik.touched.jobTitleId && Boolean(formik.errors.jobTitleId)}
                  helperText={formik.touched.jobTitleId && formik.errors.jobTitleId}
                >
                  {JOB_TITLE_OPTIONS.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Location"
                  name="locationId"
                  value={formik.values.locationId}
                  onChange={(event) => {
                    const nextLocationId = Number(event.target.value);
                    formik.setFieldValue('locationId', nextLocationId);
                    const nextWorkArea = workAreas.find(
                      (workArea) => workArea.locationId === nextLocationId,
                    );
                    if (nextWorkArea) {
                      formik.setFieldValue('workAreaId', nextWorkArea.id);
                    }
                  }}
                  onBlur={formik.handleBlur}
                  disabled={isSaving}
                  error={formik.touched.locationId && Boolean(formik.errors.locationId)}
                  helperText={formik.touched.locationId && formik.errors.locationId}
                >
                  {locations.map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      {location.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Work Area"
                  name="workAreaId"
                  value={formik.values.workAreaId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isSaving}
                  error={formik.touched.workAreaId && Boolean(formik.errors.workAreaId)}
                  helperText={formik.touched.workAreaId && formik.errors.workAreaId}
                >
                  {filteredWorkAreas.map((workArea) => (
                    <MenuItem key={workArea.id} value={workArea.id}>
                      {workArea.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Account Status"
                  name="statusId"
                  value={formik.values.statusId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isSaving}
                  error={formik.touched.statusId && Boolean(formik.errors.statusId)}
                  helperText={formik.touched.statusId && formik.errors.statusId}
                >
                  {ACCOUNT_STATUS_OPTIONS.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 3, mb: 1 }}>
              Security
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={editUser ? 'New Password (optional)' : 'Password'}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isSaving}
                  error={formik.touched.password && Boolean(formik.errors.password)}
                  helperText={
                    (formik.touched.password && formik.errors.password) ||
                    (editUser ? 'Leave blank to keep the current password' : undefined)
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((value) => !value)}
                          edge="end"
                          aria-label="toggle password visibility"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSaving}>
              {isSaving ? (
                <CircularProgress size={22} color="inherit" />
              ) : editUser ? (
                'Save Changes'
              ) : (
                'Create User'
              )}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmationDialog
        open={deleteId !== null}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmColor="error"
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
};
