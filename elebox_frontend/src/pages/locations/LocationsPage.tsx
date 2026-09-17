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
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { AppTable, type Column } from '@/components/common/AppTable';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { locationService } from '@/services/locationService';
import { useDialogFullScreen } from '@/hooks/useResponsive';
import type { Location, LocationFormValues } from '@/types';

const defaultFormValues = (): LocationFormValues => ({
  name: '',
  countryId: 1,
  cityId: 1,
});

const locationSchema = Yup.object({
  name: Yup.string().trim().required('Location name is required').max(255),
  countryId: Yup.number().required('Country is required'),
  cityId: Yup.number().required('City is required'),
});

export const LocationsPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string | undefined>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editLocation, setEditLocation] = useState<Location | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<LocationFormValues>(
    defaultFormValues(),
  );
  const fullScreen = useDialogFullScreen();

  const listParams = {
    page: page + 1,
    pageSize,
    search: search || undefined,
    sortBy,
    sortOrder,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['locations', listParams],
    queryFn: () => locationService.getAll(listParams),
  });

  const { data: countries = [] } = useQuery({
    queryKey: ['locations', 'countries'],
    queryFn: () => locationService.listCountries(),
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['locations', 'cities'],
    queryFn: () => locationService.listCities(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['locations'] });

  const createMutation = useMutation({
    mutationFn: locationService.create,
    onSuccess: () => {
      enqueueSnackbar('Location created successfully', { variant: 'success' });
      invalidate();
      setDialogOpen(false);
    },
    onError: (err: { message?: string }) => {
      enqueueSnackbar(err.message ?? 'Create failed', { variant: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: LocationFormValues }) =>
      locationService.update(id, values),
    onSuccess: () => {
      enqueueSnackbar('Location updated successfully', { variant: 'success' });
      invalidate();
      setDialogOpen(false);
    },
    onError: (err: { message?: string }) => {
      enqueueSnackbar(err.message ?? 'Update failed', { variant: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: locationService.delete,
    onSuccess: () => {
      enqueueSnackbar('Location deleted successfully', { variant: 'success' });
      invalidate();
      setDeleteId(null);
    },
    onError: (err: { message?: string }) => {
      enqueueSnackbar(err.message ?? 'Delete failed', { variant: 'error' });
    },
  });

  const validationSchema = useMemo(() => locationSchema, []);

  const formik = useFormik<LocationFormValues>({
    initialValues: formInitialValues,
    validationSchema,
    enableReinitialize: true,
    onSubmit: (values) => {
      if (editLocation) {
        updateMutation.mutate({ id: editLocation.id, values });
        return;
      }
      createMutation.mutate(values);
    },
  });

  const openCreate = () => {
    setEditLocation(null);
    setFormInitialValues(defaultFormValues());
    setDialogOpen(true);
  };

  const openEdit = (location: Location) => {
    setEditLocation(location);
    setFormInitialValues({
      name: location.name,
      countryId: location.countryId,
      cityId: location.cityId,
    });
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

  const columns: Column<Location>[] = [
    { id: 'name', label: 'Location Name', sortable: true },
    {
      id: 'countryName',
      label: 'Country',
      accessor: (row) => row.countryName ?? '-',
    },
    {
      id: 'cityName',
      label: 'City',
      accessor: (row) => row.cityName ?? '-',
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <Box>
          <IconButton size="small" onClick={() => openEdit(row)} aria-label="edit location">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => setDeleteId(row.id)}
            aria-label="delete location"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Box>
      <PageHeader
        title="Locations"
        subtitle="Manage facility locations"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Locations' },
        ]}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add Location
          </Button>
        }
      />

      <Stack spacing={2} mb={2}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search locations..."
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
      />

      <Dialog
        open={dialogOpen}
        onClose={() => !isSaving && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
      >
        <Box component="form" onSubmit={formik.handleSubmit}>
          <DialogTitle>
            {editLocation ? 'Edit Location' : 'Create Location'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Location Name"
                  name="name"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isSaving}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                  autoFocus
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Country"
                  name="countryId"
                  value={formik.values.countryId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isSaving}
                  error={formik.touched.countryId && Boolean(formik.errors.countryId)}
                  helperText={formik.touched.countryId && formik.errors.countryId}
                >
                  {countries.map((country) => (
                    <MenuItem key={country.id} value={country.id}>
                      {country.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="City"
                  name="cityId"
                  value={formik.values.cityId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isSaving}
                  error={formik.touched.cityId && Boolean(formik.errors.cityId)}
                  helperText={formik.touched.cityId && formik.errors.cityId}
                >
                  {cities.map((city) => (
                    <MenuItem key={city.id} value={city.id}>
                      {city.name}
                    </MenuItem>
                  ))}
                </TextField>
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
              ) : editLocation ? (
                'Save Changes'
              ) : (
                'Create Location'
              )}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmationDialog
        open={deleteId !== null}
        title="Delete Location"
        message="Are you sure you want to delete this location? This action cannot be undone."
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
