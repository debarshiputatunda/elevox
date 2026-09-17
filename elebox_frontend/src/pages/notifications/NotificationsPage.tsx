import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { NotificationDetailDrawer } from '@/components/notifications/NotificationDetailDrawer';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { AppTable } from '@/components/common/AppTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  NOTIFICATION_SEVERITIES,
  NOTIFICATION_TYPES,
} from '@/constants/notifications';
import { notificationApiService } from '@/services/notificationApiService';
import { locationService } from '@/services/locationService';
import { sboxService } from '@/services/sboxService';
import { userService } from '@/services/userService';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '@/store/slices/notificationsSlice';
import type { NotificationFilterParams, SystemNotification } from '@/types';
import { formatDateTime } from '@/utils/helpers';

const severityColor = (severity: string) => {
  if (severity === 'CRITICAL') return 'error';
  if (severity === 'HIGH' || severity === 'WARNING') return 'warning';
  if (severity === 'MEDIUM') return 'info';
  return 'default';
};

const emptyFilters = (): NotificationFilterParams => ({
  search: '',
  severity: '',
  notificationType: '',
  sboxId: undefined,
  locationId: undefined,
  userId: undefined,
  startDate: '',
  endDate: '',
  isRead: undefined,
});

export const NotificationsPage = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const bellItems = useAppSelector((s) => s.notifications.bellItems);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<NotificationFilterParams>(emptyFilters);
  const [selectedNotification, setSelectedNotification] = useState<SystemNotification | null>(null);

  const queryParams = useMemo<NotificationFilterParams>(
    () => ({
      page: page + 1,
      pageSize,
      search: filters.search || undefined,
      severity: filters.severity || undefined,
      notificationType: filters.notificationType || undefined,
      sboxId: filters.sboxId,
      locationId: filters.locationId,
      userId: filters.userId,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      isRead: filters.isRead,
    }),
    [page, pageSize, filters],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', queryParams],
    queryFn: () => notificationApiService.getAll(queryParams),
    refetchInterval: 30000,
  });

  const { data: sboxes = [] } = useQuery({
    queryKey: ['sboxes', 'notification-filter'],
    queryFn: async () => {
      const response = await sboxService.getAll({ pageSize: 500 });
      return response.data;
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', 'notification-filter'],
    queryFn: () => locationService.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users', 'notification-filter'],
    queryFn: async () => {
      const response = await userService.getAll({ pageSize: 500 });
      return response.data;
    },
  });

  useEffect(() => {
    if (bellItems.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  }, [bellItems.length, queryClient]);

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationApiService.markRead(id),
    onSuccess: (_, id) => {
      dispatch(markNotificationRead(id));
      setSelectedNotification((current) =>
        current?.id === id ? { ...current, isRead: true } : current,
      );
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApiService.markAllRead(queryParams),
    onSuccess: () => {
      dispatch(markAllNotificationsRead());
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      enqueueSnackbar('Filtered notifications marked as read', { variant: 'success' });
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => notificationApiService.exportCsv(queryParams),
    onSuccess: () => {
      enqueueSnackbar('Notifications exported', { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Export failed', { variant: 'error' });
    },
  });

  const updateFilter = (patch: Partial<NotificationFilterParams>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(0);
  };

  const resetFilters = () => {
    setFilters(emptyFilters());
    setPage(0);
  };

  const hasActiveFilters =
    Boolean(filters.search)
    || Boolean(filters.severity)
    || Boolean(filters.notificationType)
    || Boolean(filters.sboxId)
    || Boolean(filters.locationId)
    || Boolean(filters.userId)
    || Boolean(filters.startDate)
    || Boolean(filters.endDate)
    || filters.isRead !== undefined;

  return (
    <Box>
      <PageHeader
        title="Notifications"
        subtitle="Real-time alerts generated by ESP controllers"
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<MarkEmailReadIcon />}
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending || !data?.total}
            >
              Mark All Read
            </Button>
          </Stack>
        }
      />

      <Box
        display="grid"
        gridTemplateColumns={{
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)',
        }}
        gap={2}
        mb={2}
      >
        <TextField
          select
          size="small"
          label="S-Box"
          value={filters.sboxId ?? ''}
          onChange={(event) =>
            updateFilter({
              sboxId: event.target.value ? Number(event.target.value) : undefined,
            })
          }
        >
          <MenuItem value="">All S-Boxes</MenuItem>
          {sboxes.map((sbox) => (
            <MenuItem key={sbox.id} value={sbox.id}>
              {sbox.serialNo}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Location"
          value={filters.locationId ?? ''}
          onChange={(event) =>
            updateFilter({
              locationId: event.target.value ? Number(event.target.value) : undefined,
            })
          }
        >
          <MenuItem value="">All Locations</MenuItem>
          {locations.map((location) => (
            <MenuItem key={location.id} value={location.id}>
              {location.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="User"
          value={filters.userId ?? ''}
          onChange={(event) =>
            updateFilter({
              userId: event.target.value ? Number(event.target.value) : undefined,
            })
          }
        >
          <MenuItem value="">All Users</MenuItem>
          {users.map((user) => (
            <MenuItem key={user.id} value={user.id}>
              {user.employeeId} - {user.fullName}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Severity"
          value={filters.severity ?? ''}
          onChange={(event) => updateFilter({ severity: event.target.value })}
        >
          <MenuItem value="">All Severities</MenuItem>
          {NOTIFICATION_SEVERITIES.map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Type"
          value={filters.notificationType ?? ''}
          onChange={(event) => updateFilter({ notificationType: event.target.value })}
        >
          <MenuItem value="">All Types</MenuItem>
          {NOTIFICATION_TYPES.map((item) => (
            <MenuItem key={item} value={item}>
              {item.replace(/_/g, ' ')}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          size="small"
          label="Start Date"
          type="date"
          value={filters.startDate ?? ''}
          onChange={(event) => updateFilter({ startDate: event.target.value })}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          size="small"
          label="End Date"
          type="date"
          value={filters.endDate ?? ''}
          onChange={(event) => updateFilter({ endDate: event.target.value })}
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      <Box display="flex" gap={2} mb={2} flexWrap="wrap" alignItems="center">
        <Box flex={1} minWidth={220}>
          <SearchBar
            value={filters.search ?? ''}
            onChange={(value) => updateFilter({ search: value })}
            placeholder="Search notifications, users, S-Boxes..."
          />
        </Box>
        <TextField
          select
          size="small"
          label="Status"
          value={
            filters.isRead === undefined ? '' : filters.isRead ? 'read' : 'unread'
          }
          onChange={(event) => {
            const value = event.target.value;
            updateFilter({
              isRead: value === '' ? undefined : value === 'read',
            });
          }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="unread">Unread</MenuItem>
          <MenuItem value="read">Read</MenuItem>
        </TextField>
        <Button
          variant="outlined"
          startIcon={<RestartAltIcon />}
          onClick={resetFilters}
          disabled={!hasActiveFilters}
        >
          Reset Filters
        </Button>
      </Box>

      <AppTable<SystemNotification>
        columns={[
          {
            id: 'timestamp',
            label: 'Time',
            accessor: (row) => formatDateTime(row.timestamp),
            sortable: true,
          },
          {
            id: 'severity',
            label: 'Severity',
            render: (row) => (
              <StatusBadge label={row.severity} color={severityColor(row.severity)} />
            ),
          },
          {
            id: 'serialNo',
            label: 'S-Box',
            accessor: (row) => row.serialNo ?? row.controllerName ?? '-',
          },
          {
            id: 'employeeName',
            label: 'User',
            accessor: (row) => row.employeeName ?? '-',
          },
          {
            id: 'locationName',
            label: 'Location',
            accessor: (row) => row.locationName ?? '-',
          },
          {
            id: 'title',
            label: 'Title',
            sortable: true,
            mobilePrimary: true,
          },
          {
            id: 'message',
            label: 'Message',
            accessor: (row) => row.message,
          },
          {
            id: 'isRead',
            label: 'Status',
            render: (row) => (
              <StatusBadge
                label={row.isRead ? 'Read' : 'Unread'}
                color={row.isRead ? 'default' : 'warning'}
              />
            ),
          },
          {
            id: 'actions',
            label: 'Actions',
            align: 'right',
            render: (row) => (
              <Button
                size="small"
                disabled={row.isRead}
                onClick={(event) => {
                  event.stopPropagation();
                  markReadMutation.mutate(row.id);
                }}
              >
                Mark Read
              </Button>
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
        onRowClick={setSelectedNotification}
        getRowId={(row) => row.id}
        emptyTitle="No notifications"
        emptyDescription="No safety alerts match the current filters."
      />

      <NotificationDetailDrawer
        open={!!selectedNotification}
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onMarkRead={(id) => markReadMutation.mutate(id)}
        markingRead={markReadMutation.isPending}
      />
    </Box>
  );
};
