import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { AppTable } from '@/components/common/AppTable';
import { DeviceStatusChip } from '@/components/common/DeviceStatusChip';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { ACTIVITY_STATUS_OPTIONS } from '@/constants/sboxLookups';
import { usePermission } from '@/hooks/usePermission';
import { sboxService } from '@/services/sboxService';
import { locationService } from '@/services/locationService';
import { workAreaService } from '@/services/workAreaService';
import { ROUTES } from '@/constants/routes';
import { useDialogFullScreen } from '@/hooks/useResponsive';
import type { SBox, SBoxFormValues } from '@/types';
import { mapHealthToDeviceStatus, sboxToFormValues } from '@/utils/sboxMapper';
import { formatDateTime, generateSerialNumber } from '@/utils/helpers';

const defaultFormValues = (): SBoxFormValues => ({
  boxIp: '',
  locationId: 1,
  workAreaId: 1,
  activityStatus: 1,
  mfgDate: new Date().toISOString().slice(0, 10),
  boxDetails: '',
});

const sboxSchema = Yup.object({
  boxIp: Yup.string().trim().required('Box IP is required').max(255),
  locationId: Yup.number().required('Location is required'),
  workAreaId: Yup.number().required('Work area is required'),
  activityStatus: Yup.number().required('Activity status is required'),
  mfgDate: Yup.string().required('Manufacturing date is required'),
  boxDetails: Yup.string().max(500),
});

export const SBoxesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const isMySBoxes = location.pathname === ROUTES.MY_SBOXES;
  const fullScreen = useDialogFullScreen();
  const canManageSBoxes = can('sboxes.manage');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editSBox, setEditSBox] = useState<SBox | null>(null);
  const [draftSerialNo, setDraftSerialNo] = useState(() => generateSerialNumber());
  const [formInitialValues, setFormInitialValues] = useState<SBoxFormValues>(
    defaultFormValues(),
  );

  const listParams = {
    page: page + 1,
    pageSize,
    search: search || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['sboxes', listParams, isMySBoxes],
    queryFn: () => sboxService.getAll(listParams, { mine: isMySBoxes }),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', 'options'],
    queryFn: () => locationService.list(),
    enabled: dialogOpen,
  });

  const { data: workAreas = [] } = useQuery({
    queryKey: ['work-areas', 'options'],
    queryFn: () => workAreaService.list(),
    enabled: dialogOpen,
  });

  const createDefaults = useMemo<SBoxFormValues>(
    () => ({
      boxIp: '',
      locationId: locations[0]?.id ?? 1,
      workAreaId: workAreas.find((item) => item.locationId === (locations[0]?.id ?? 1))?.id
        ?? workAreas[0]?.id
        ?? 1,
      activityStatus: 1,
      mfgDate: new Date().toISOString().slice(0, 10),
      boxDetails: '',
    }),
    [locations, workAreas],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sboxes'] });

  const createMutation = useMutation({
    mutationFn: sboxService.create,
    onSuccess: () => {
      enqueueSnackbar('S-Box registered successfully', { variant: 'success' });
      invalidate();
      setDialogOpen(false);
    },
    onError: (err: { message?: string }) => {
      enqueueSnackbar(err.message ?? 'Registration failed', { variant: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: SBoxFormValues }) =>
      sboxService.update(id, values),
    onSuccess: () => {
      enqueueSnackbar('S-Box updated successfully', { variant: 'success' });
      invalidate();
      setDialogOpen(false);
    },
    onError: (err: { message?: string }) => {
      enqueueSnackbar(err.message ?? 'Update failed', { variant: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: sboxService.delete,
    onSuccess: () => {
      enqueueSnackbar('S-Box deleted successfully', { variant: 'success' });
      invalidate();
      setDeleteId(null);
    },
    onError: (err: { message?: string }) => {
      enqueueSnackbar(err.message ?? 'Delete failed', { variant: 'error' });
    },
  });

  const validationSchema = useMemo(() => sboxSchema, []);

  const formik = useFormik<SBoxFormValues>({
    initialValues: formInitialValues,
    validationSchema,
    enableReinitialize: true,
    onSubmit: (values) => {
      if (editSBox) {
        updateMutation.mutate({ id: editSBox.id, values });
        return;
      }
      createMutation.mutate({
        serialNo: draftSerialNo,
        ...values,
      });
    },
  });

  const filteredWorkAreas = workAreas.filter(
    (workArea) => workArea.locationId === formik.values.locationId,
  );

  const openCreate = () => {
    setEditSBox(null);
    setDraftSerialNo(generateSerialNumber());
    setFormInitialValues(defaultFormValues());
    setDialogOpen(true);
  };

  useEffect(() => {
    if (!dialogOpen || editSBox) return;
    if (locations.length === 0) return;
    setFormInitialValues(createDefaults);
  }, [dialogOpen, editSBox, createDefaults, locations.length]);

  const openEdit = (sbox: SBox) => {
    setEditSBox(sbox);
    setFormInitialValues(sboxToFormValues(sbox));
    setDialogOpen(true);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const serialNo = editSBox?.serialNo ?? draftSerialNo;

  return (
    <Box>
      <PageHeader
        title={isMySBoxes ? 'My S-Boxes' : 'S-Box Management'}
        subtitle={
          isMySBoxes
            ? 'View devices assigned to you'
            : 'Register and manage ESP8266 safety monitoring devices'
        }
        action={
          canManageSBoxes && !isMySBoxes ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Register S-Box
            </Button>
          ) : undefined
        }
      />
      <SearchBar value={search} onChange={setSearch} placeholder="Search devices..." />
      <Box mt={2}>
        <AppTable<SBox>
          columns={[
            { id: 'serialNo', label: 'Serial Number', sortable: true, mobilePrimary: true },
            { id: 'boxIp', label: 'Box IP', hideOnMobile: true },
            {
              id: 'connectivity',
              label: 'Status',
              render: (r) => (
                <StatusBadge
                  label={r.isOnline ? 'Online' : 'Offline'}
                  color={r.isOnline ? 'success' : 'warning'}
                />
              ),
            },
            { id: 'locationName', label: 'Location', accessor: (r) => r.locationName ?? '-' },
            { id: 'workAreaName', label: 'Work Area', accessor: (r) => r.workAreaName ?? '-' },
            {
              id: 'lastSeen',
              label: 'Last Communication',
              accessor: (r) => (r.lastSeen ? formatDateTime(r.lastSeen) : '-'),
              hideOnMobile: true,
            },
            {
              id: 'activityStatus',
              label: 'Activity',
              render: (r) => (
                <StatusBadge
                  label={r.activityStatusName ?? '-'}
                  color={r.activityStatusName === 'Active' ? 'success' : 'default'}
                />
              ),
            },
            {
              id: 'healthChip',
              label: 'Health',
              render: (r) => <DeviceStatusChip status={mapHealthToDeviceStatus(r)} />,
            },
            {
              id: 'actions',
              label: 'Actions',
              align: 'right',
              render: (r) => (
                <Box>
                  <IconButton
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(isMySBoxes ? `${ROUTES.MONITORING}?boxId=${r.id}` : `/sboxes/${r.id}`);
                    }}
                    aria-label="view s-box"
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                  {canManageSBoxes && (
                    <>
                      <IconButton
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEdit(r);
                        }}
                        aria-label="edit s-box"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteId(r.id);
                        }}
                        aria-label="delete s-box"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Box>
              ),
            },
          ]}
          rows={data?.data ?? []}
          total={data?.total ?? 0}
          page={page}
          pageSize={pageSize}
          loading={isLoading}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          getRowId={(r) => r.id}
          onRowClick={
            isMySBoxes
              ? (row) => navigate(`${ROUTES.MONITORING}?boxId=${row.id}`)
              : undefined
          }
          emptyTitle={isMySBoxes ? 'No assigned S-Boxes' : 'No S-Boxes'}
          emptyDescription={
            isMySBoxes
              ? 'No safety controllers are currently assigned to you.'
              : 'Register an S-Box to start monitoring.'
          }
        />
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={() => !isSaving && setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={fullScreen}
      >
        <Box component="form" onSubmit={formik.handleSubmit}>
          <DialogTitle>{editSBox ? 'Edit S-Box' : 'Register S-Box'}</DialogTitle>
          <DialogContent>
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
                Serial Number: {serialNo}
                {editSBox ? ` · Box IP: ${editSBox.boxIp}` : ''}
              </Typography>
              {!editSBox && (
                <Typography variant="body2" color="text.secondary">
                  The serial number is auto-generated. Ensure the device is connected to the network
                  before activation.
                </Typography>
              )}
            </Box>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Device Identity
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Serial Number"
                  value={serialNo}
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Box IP"
                  name="boxIp"
                  value={formik.values.boxIp}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isSaving}
                  error={formik.touched.boxIp && Boolean(formik.errors.boxIp)}
                  helperText={formik.touched.boxIp && formik.errors.boxIp}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 3, mb: 1 }}>
              Assignment
            </Typography>
            <Grid container spacing={2}>
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
                  {locations.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name}
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
                  {filteredWorkAreas.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Activity Status"
                  name="activityStatus"
                  value={formik.values.activityStatus}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isSaving}
                  error={formik.touched.activityStatus && Boolean(formik.errors.activityStatus)}
                  helperText={formik.touched.activityStatus && formik.errors.activityStatus}
                >
                  {ACTIVITY_STATUS_OPTIONS.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 3, mb: 1 }}>
              Device Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Manufacturing Date"
                  name="mfgDate"
                  type="date"
                  value={formik.values.mfgDate ?? ''}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isSaving}
                  InputLabelProps={{ shrink: true }}
                  error={formik.touched.mfgDate && Boolean(formik.errors.mfgDate)}
                  helperText={formik.touched.mfgDate && formik.errors.mfgDate}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Details"
                  name="boxDetails"
                  multiline
                  rows={3}
                  value={formik.values.boxDetails}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isSaving}
                  error={formik.touched.boxDetails && Boolean(formik.errors.boxDetails)}
                  helperText={formik.touched.boxDetails && formik.errors.boxDetails}
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
              ) : editSBox ? (
                'Save Changes'
              ) : (
                'Register Device'
              )}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmationDialog
        open={deleteId !== null}
        title="Delete S-Box"
        message="Are you sure you want to delete this S-Box? This action cannot be undone."
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
