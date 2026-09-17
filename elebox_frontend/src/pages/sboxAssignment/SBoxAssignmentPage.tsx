import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { AppTable, type Column } from '@/components/common/AppTable';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { PageHeader } from '@/components/common/PageHeader';
import {
  boxAssignmentService,
  type BoxAssignment,
  type BoxAssignmentLog,
} from '@/services/boxAssignmentService';
import { sboxService } from '@/services/sboxService';
import { userService } from '@/services/userService';
import { workAreaService } from '@/services/workAreaService';
import { formatDateTime } from '@/utils/helpers';

export const SBoxAssignmentPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [boxId, setBoxId] = useState<number | ''>('');
  const [userId, setUserId] = useState<number | ''>('');
  const [workAreaId, setWorkAreaId] = useState<number | ''>('');
  const [assignmentPage, setAssignmentPage] = useState(0);
  const [assignmentPageSize, setAssignmentPageSize] = useState(10);
  const [logsBoxId, setLogsBoxId] = useState<number | null>(null);
  const [deallocateBoxId, setDeallocateBoxId] = useState<number | null>(null);
  const [logPage, setLogPage] = useState(0);
  const [logPageSize, setLogPageSize] = useState(10);

  const { data: sboxResponse, isLoading: sboxesLoading } = useQuery({
    queryKey: ['sboxes', 'assignment-options'],
    queryFn: () => sboxService.getAll({ page: 1, pageSize: 200 }),
  });
  const sboxes = sboxResponse?.data ?? [];

  const { data: usersResponse, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'assignment-options'],
    queryFn: () => userService.getAll({ page: 1, pageSize: 200 }),
  });
  const users = usersResponse?.data ?? [];

  const { data: workAreas = [] } = useQuery({
    queryKey: ['work-areas', 'assignment-options'],
    queryFn: () => workAreaService.list(),
  });

  const {
    data: allAssignments = [],
    isLoading: assignmentsLoading,
    isError: assignmentsError,
  } = useQuery({
    queryKey: ['box-assignments', 'all'],
    queryFn: () => boxAssignmentService.listAll(),
  });

  const assignedBoxIds = useMemo(
    () => new Set(allAssignments.map((item) => item.boxId)),
    [allAssignments],
  );

  const assignedUserIds = useMemo(
    () => new Set(allAssignments.map((item) => item.userId)),
    [allAssignments],
  );

  const availableBoxes = useMemo(
    () => sboxes.filter((box) => !assignedBoxIds.has(box.id)),
    [sboxes, assignedBoxIds],
  );

  const availableUsers = useMemo(
    () => users.filter((user) => !assignedUserIds.has(user.id)),
    [users, assignedUserIds],
  );

  const selectedBox = availableBoxes.find((box) => box.id === boxId)
    ?? sboxes.find((box) => box.id === boxId);

  const filteredWorkAreas = useMemo(
    () => workAreas.filter((area) => area.locationId === selectedBox?.locationId),
    [workAreas, selectedBox?.locationId],
  );

  const { data: logsResponse, isLoading: logsLoading } = useQuery({
    queryKey: ['box-logs', logsBoxId],
    queryFn: () => boxAssignmentService.listLogs(logsBoxId as number),
    enabled: logsBoxId !== null,
  });
  const logs = logsResponse?.data ?? [];

  const pagedAssignments = useMemo(() => {
    const start = assignmentPage * assignmentPageSize;
    return allAssignments.slice(start, start + assignmentPageSize);
  }, [allAssignments, assignmentPage, assignmentPageSize]);

  const pagedLogs = useMemo(() => {
    const start = logPage * logPageSize;
    return logs.slice(start, start + logPageSize);
  }, [logs, logPage, logPageSize]);

  const logsBoxLabel = useMemo(() => {
    if (logsBoxId === null) return null;
    const assignment = allAssignments.find((item) => item.boxId === logsBoxId);
    return assignment?.serialNo ?? `Box-${logsBoxId}`;
  }, [allAssignments, logsBoxId]);

  useEffect(() => {
    if (boxId !== '' && !availableBoxes.some((box) => box.id === boxId)) {
      setBoxId('');
      setWorkAreaId('');
    }
  }, [availableBoxes, boxId]);

  useEffect(() => {
    if (userId !== '' && !availableUsers.some((user) => user.id === userId)) {
      setUserId('');
    }
  }, [availableUsers, userId]);

  const assignMutation = useMutation({
    mutationFn: () =>
      boxAssignmentService.assign(boxId as number, {
        userId: userId as number,
        workAreaId: workAreaId as number,
      }),
    onSuccess: async () => {
      enqueueSnackbar('S-Box assigned successfully', { variant: 'success' });
      setBoxId('');
      setUserId('');
      setWorkAreaId('');
      queryClient.invalidateQueries({ queryKey: ['sboxes'] });
      queryClient.invalidateQueries({ queryKey: ['box-assignments'] });
      await queryClient.refetchQueries({ queryKey: ['box-assignments', 'all'] });
    },
    onError: (err: { message?: string }) => {
      enqueueSnackbar(err.message ?? 'Assignment failed', { variant: 'error' });
    },
  });

  const deallocateMutation = useMutation({
    mutationFn: (targetBoxId: number) => boxAssignmentService.deallocate(targetBoxId),
    onSuccess: async (_data, targetBoxId) => {
      enqueueSnackbar('S-Box deallocated successfully', { variant: 'success' });
      setDeallocateBoxId(null);
      queryClient.invalidateQueries({ queryKey: ['sboxes'] });
      queryClient.invalidateQueries({ queryKey: ['box-assignments'] });
      if (logsBoxId === targetBoxId) {
        queryClient.invalidateQueries({ queryKey: ['box-logs', targetBoxId] });
      }
      await queryClient.refetchQueries({ queryKey: ['box-assignments', 'all'] });
    },
    onError: (err: { message?: string }) => {
      enqueueSnackbar(err.message ?? 'Deallocation failed', { variant: 'error' });
      setDeallocateBoxId(null);
    },
  });

  const assignmentColumns: Column<BoxAssignment>[] = [
    { id: 'serialNo', label: 'S-Box', sortable: false },
    { id: 'employeeName', label: 'Employee', sortable: false },
    { id: 'workAreaName', label: 'Work Area', sortable: false },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setLogsBoxId(row.boxId);
              setLogPage(0);
            }}
          >
            View logs
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => setDeallocateBoxId(row.boxId)}
          >
            Deallocate
          </Button>
        </Box>
      ),
    },
  ];

  const logColumns: Column<BoxAssignmentLog>[] = [
    { id: 'description', label: 'Description', sortable: false },
    { id: 'employeeName', label: 'Employee', sortable: false },
    { id: 'workAreaName', label: 'Work Area', sortable: false },
    {
      id: 'createdAt',
      label: 'Logged At',
      sortable: false,
      render: (row) => formatDateTime(row.createdAt),
    },
  ];

  const canSubmit =
    typeof boxId === 'number'
    && typeof userId === 'number'
    && typeof workAreaId === 'number';

  const noAvailableBoxes = !sboxesLoading && availableBoxes.length === 0;
  const noAvailableEmployees = !usersLoading && availableUsers.length === 0;
  const canAssign = !noAvailableBoxes && !noAvailableEmployees;

  const deallocateTarget = allAssignments.find(
    (item) => item.boxId === deallocateBoxId,
  );

  return (
    <Box>
      <PageHeader
        title="S-Box Assignment"
        subtitle="Assign controllers to employees in a work area"
      />

      {noAvailableBoxes && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No unassigned S-Boxes are available. All controllers are already assigned.
        </Alert>
      )}

      {noAvailableEmployees && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No unassigned employees are available. All employees already have an S-Box.
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} mb={2}>
            New Assignment
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 1,
              mb: 2.5,
              p: 1.5,
              borderRadius: 1.25,
              bgcolor: 'action.hover',
            }}
          >
            {['S-Box', 'Location', 'Work Area', 'Employee'].map((step, index) => (
              <Box key={step} display="flex" alignItems="center" gap={1}>
                {index > 0 && (
                  <Typography color="text.secondary" fontWeight={700} aria-hidden>
                    →
                  </Typography>
                )}
                <Box
                  sx={{
                    px: 1.25,
                    py: 0.5,
                    borderRadius: 1.25,
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                  }}
                >
                  {step}
                </Box>
              </Box>
            ))}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="S-Box"
                value={boxId}
                onChange={(event) => {
                  const nextBoxId = Number(event.target.value);
                  setBoxId(nextBoxId);
                  setWorkAreaId('');
                  const box = availableBoxes.find((item) => item.id === nextBoxId);
                  const defaultArea = workAreas.find(
                    (area) => area.locationId === box?.locationId,
                  );
                  if (defaultArea) setWorkAreaId(defaultArea.id);
                }}
                disabled={noAvailableBoxes}
                helperText={
                  noAvailableBoxes
                    ? 'No unassigned S-Boxes available'
                    : `${availableBoxes.length} available`
                }
              >
                {availableBoxes.map((box) => (
                  <MenuItem key={box.id} value={box.id}>
                    {box.serialNo}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Employee"
                value={userId}
                onChange={(event) => setUserId(Number(event.target.value))}
                disabled={noAvailableEmployees}
                helperText={
                  noAvailableEmployees
                    ? 'No unassigned employees available'
                    : `${availableUsers.length} available`
                }
              >
                {availableUsers.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.fullName}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Work Area"
                value={workAreaId}
                onChange={(event) => setWorkAreaId(Number(event.target.value))}
                disabled={!selectedBox || !canAssign}
                helperText={
                  selectedBox?.locationName
                    ? `Location: ${selectedBox.locationName}`
                    : undefined
                }
              >
                {filteredWorkAreas.map((area) => (
                  <MenuItem key={area.id} value={area.id}>
                    {area.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                disabled={!canSubmit || !canAssign || assignMutation.isPending}
                onClick={() => assignMutation.mutate()}
              >
                Assign S-Box
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
        Active Assignments
      </Typography>
      {assignmentsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load active assignments. Please refresh and try again.
        </Alert>
      )}
      <AppTable
        columns={assignmentColumns}
        rows={pagedAssignments}
        total={allAssignments.length}
        page={assignmentPage}
        pageSize={assignmentPageSize}
        loading={assignmentsLoading}
        onPageChange={setAssignmentPage}
        onPageSizeChange={setAssignmentPageSize}
        getRowId={(row) => row.boxId}
        emptyTitle="No assignments"
        emptyDescription="No active S-Box assignments yet."
      />

      {logsBoxId !== null && (
        <>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mt: 3,
              mb: 1.5,
            }}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              Assignment Logs — {logsBoxLabel}
            </Typography>
            <Button size="small" onClick={() => setLogsBoxId(null)}>
              Close
            </Button>
          </Box>
          <AppTable
            columns={logColumns}
            rows={pagedLogs}
            total={logs.length}
            page={logPage}
            pageSize={logPageSize}
            loading={logsLoading}
            onPageChange={setLogPage}
            onPageSizeChange={setLogPageSize}
            getRowId={(row) => row.logId}
            emptyTitle="No logs"
            emptyDescription="No assignment logs yet."
          />
        </>
      )}

      <ConfirmationDialog
        open={deallocateBoxId !== null}
        title="Deallocate S-Box"
        message={
          deallocateTarget
            ? `Remove assignment of ${deallocateTarget.serialNo ?? `Box-${deallocateTarget.boxId}`} from ${deallocateTarget.employeeName ?? 'this employee'}? The box and employee can then be reassigned.`
            : 'Remove this S-Box assignment?'
        }
        confirmColor="error"
        confirmLabel="Deallocate"
        onConfirm={() => {
          if (deallocateBoxId !== null) {
            deallocateMutation.mutate(deallocateBoxId);
          }
        }}
        onCancel={() => setDeallocateBoxId(null)}
      />
    </Box>
  );
};
