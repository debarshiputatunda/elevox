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
import { workAreaService } from '@/services/workAreaService';
import { useDialogFullScreen } from '@/hooks/useResponsive';
import type { WorkArea, WorkAreaFormValues } from '@/types';

const defaultFormValues = (): WorkAreaFormValues => ({
  name: '',
  locationId: 1,
});

const workAreaSchema = Yup.object({
  name: Yup.string().trim().required('Work area name is required').max(255),
  locationId: Yup.number().required('Location is required'),
});

export const WorkAreasPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string | undefined>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editWorkArea, setEditWorkArea] = useState<WorkArea | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<WorkAreaFormValues>(
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
    queryKey: ['work-areas', listParams],
    queryFn: () => workAreaService.getAll(listParams),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', 'options'],
    queryFn: () => locationService.list(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['work-areas'] });

  const createMutation = useMutation({
    mutationFn: workAreaService.create,
    onSuccess: () => {
      enqueueSnackbar('Work area created successfully', { variant: 'success' });
      invalidate();
      setDialogOpen(false);
    },
    onError: (err: { message?: string }) => {
      enqueueSnackbar(err.message ?? 'Create failed', { variant: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: WorkAreaFormValues }) =>
      workAreaService.update(id, values),
    onSuccess: () => {
      enqueueSnackbar('Work area updated successfully', { variant: 'success' });
      invalidate();
      setDialogOpen(false);
    },
    onError: (err: { message?: string }) => {
      enqueueSnackbar(err.message ?? 'Update failed', { variant: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: workAreaService.delete,
    onSuccess: () => {
      enqueueSnackbar('Work area deleted successfully', { variant: 'success' });
      invalidate();
      setDeleteId(null);
    },
    onError: (err: { message?: string }) => {
      enqueueSnackbar(err.message ?? 'Delete failed', { variant: 'error' });
    },
  });

  const validationSchema = useMemo(() => workAreaSchema, []);

  const formik = useFormik<WorkAreaFormValues>({
    initialValues: formInitialValues,
    validationSchema,
    enableReinitialize: true,
    onSubmit: (values) => {
      if (editWorkArea) {
        updateMutation.mutate({ id: editWorkArea.id, values });
        return;
      }
      createMutation.mutate(values);
    },
  });

  const openCreate = () => {
    setEditWorkArea(null);
    setFormInitialValues({
      ...defaultFormValues(),
      locationId: locations[0]?.id ?? 1,
    });
    setDialogOpen(true);
  };

  const openEdit = (workArea: WorkArea) => {
    setEditWorkArea(workArea);
    setFormInitialValues({
      name: workArea.name,
      locationId: workArea.locationId,
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

  const columns: Column<WorkArea>[] = [
    { id: 'name', label: 'Work Area', sortable: true },
    {
      id: 'locationName',
      label: 'Location',
      accessor: (row) => row.locationName ?? '-',
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <Box>
          <IconButton size="small" onClick={() => openEdit(row)} aria-label="edit work area">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => setDeleteId(row.id)}
            aria-label="delete work area"
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
        title="Work Areas"
        subtitle="Manage work areas within locations"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Work Areas' },
        ]}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add Work Area
          </Button>
        }
      />

      <Stack spacing={2} mb={2}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search work areas..."
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
            {editWorkArea ? 'Edit Work Area' : 'Create Work Area'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Work Area Name"
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
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Location"
                  name="locationId"
                  value={formik.values.locationId}
                  onChange={formik.handleChange}
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
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSaving}>
              {isSaving ? (
                <CircularProgress size={22} color="inherit" />
              ) : editWorkArea ? (
                'Save Changes'
              ) : (
                'Create Work Area'
              )}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmationDialog
        open={deleteId !== null}
        title="Delete Work Area"
        message="Are you sure you want to delete this work area? This action cannot be undone."
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
