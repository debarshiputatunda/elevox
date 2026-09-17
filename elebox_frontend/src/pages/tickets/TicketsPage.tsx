import { TextField, MenuItem } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { CrudPage } from '@/components/common/CrudPage';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ROUTES } from '@/constants/routes';
import { usePermission } from '@/hooks/usePermission';
import { ticketService } from '@/services';
import type { Ticket, TicketStatus, TicketPriority } from '@/types';

export const TicketsPage = () => {
  const location = useLocation();
  const { can } = usePermission();
  const isMyTickets = location.pathname === ROUTES.MY_TICKETS;
  const canManageTickets = can('tickets.manage');

  return (
    <CrudPage<Ticket>
      title={isMyTickets ? 'My Tickets' : 'Tickets'}
      subtitle={
        isMyTickets
          ? 'View tickets assigned to you'
          : 'Manage support and maintenance tickets'
      }
      queryKey={isMyTickets ? 'my-tickets' : 'tickets'}
      service={ticketService}
      canCreate={canManageTickets}
      canEdit={canManageTickets}
      canDelete={canManageTickets}
      getInitialValues={() => ({
        ticketNumber: `TKT-${Date.now()}`,
        title: '',
        description: '',
        priority: 'Medium' as TicketPriority,
        status: 'Open' as TicketStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })}
      columns={[
        { id: 'ticketNumber', label: 'Ticket #', sortable: true },
        { id: 'title', label: 'Title', sortable: true },
        {
          id: 'priority',
          label: 'Priority',
          render: (r) => (
            <StatusBadge
              label={r.priority}
              color={
                r.priority === 'Critical'
                  ? 'error'
                  : r.priority === 'High'
                    ? 'warning'
                    : 'default'
              }
            />
          ),
        },
        { id: 'status', label: 'Status', render: (r) => <StatusBadge label={r.status} color="primary" /> },
        {
          id: 'assignedUserName',
          label: 'Assigned To',
          accessor: (r) => r.assignedUserName ?? 'Unassigned',
        },
      ]}
      renderForm={({ values, onChange }) => (
        <>
          <TextField
            fullWidth
            margin="normal"
            label="Title"
            value={values.title ?? ''}
            onChange={(e) => onChange('title', e.target.value)}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Description"
            multiline
            rows={3}
            value={values.description ?? ''}
            onChange={(e) => onChange('description', e.target.value)}
          />
          <TextField
            select
            fullWidth
            margin="normal"
            label="Priority"
            value={values.priority ?? 'Medium'}
            onChange={(e) => onChange('priority', e.target.value)}
          >
            {(['Low', 'Medium', 'High', 'Critical'] as TicketPriority[]).map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            fullWidth
            margin="normal"
            label="Status"
            value={values.status ?? 'Open'}
            onChange={(e) => onChange('status', e.target.value)}
          >
            {(['Open', 'In Progress', 'Resolved', 'Closed'] as TicketStatus[]).map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        </>
      )}
    />
  );
};
