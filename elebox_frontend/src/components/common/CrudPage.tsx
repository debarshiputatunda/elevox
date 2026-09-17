import { useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  Stack,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from './PageHeader';
import { SearchBar } from './SearchBar';
import { AppTable, type Column } from './AppTable';
import { ConfirmationDialog } from './ConfirmationDialog';
import { useCrudList } from '@/hooks/useCrudList';
import { useDialogFullScreen } from '@/hooks/useResponsive';

interface CrudPageProps<T extends { id: number }> {
  title: string;
  subtitle?: string;
  queryKey: string;
  service: {
    getAll: Parameters<typeof useCrudList<T>>[1]['getAll'];
    create: Parameters<typeof useCrudList<T>>[1]['create'];
    update: Parameters<typeof useCrudList<T>>[1]['update'];
    delete: Parameters<typeof useCrudList<T>>[1]['delete'];
  };
  columns: Column<T>[];
  renderForm: (props: {
    values: Partial<T>;
    onChange: (field: string, value: unknown) => void;
    isEdit: boolean;
  }) => ReactNode;
  getInitialValues: () => Partial<T>;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  breadcrumbs?: { label: string; path?: string }[];
}

export function CrudPage<T extends { id: number }>({
  title,
  subtitle,
  queryKey,
  service,
  columns: baseColumns,
  renderForm,
  getInitialValues,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  breadcrumbs,
}: CrudPageProps<T>) {
  const crud = useCrudList(queryKey, service);
  const fullScreen = useDialogFullScreen();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<Partial<T>>({});
  const [editId, setEditId] = useState<number | null>(null);

  const openCreate = () => {
    setEditId(null);
    setFormValues(getInitialValues());
    setDialogOpen(true);
  };

  const openEdit = (row: T) => {
    setEditId(row.id);
    setFormValues({ ...row });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editId) {
      await crud.updateMutation.mutateAsync({ id: editId, payload: formValues });
    } else {
      await crud.createMutation.mutateAsync(formValues as Omit<T, 'id'>);
    }
    setDialogOpen(false);
  };

  const actionColumns: Column<T>[] = canEdit || canDelete
    ? [
        ...baseColumns,
        {
          id: 'actions',
          label: 'Actions',
          align: 'right' as const,
          render: (row: T) => (
            <Box>
              {canEdit && (
                <IconButton size="small" onClick={() => openEdit(row)} aria-label="edit">
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
              {canDelete && (
                <IconButton size="small" color="error" onClick={() => setDeleteId(row.id)} aria-label="delete">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ),
        },
      ]
    : baseColumns;

  return (
    <Box>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        action={
          canCreate ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Add {title.replace(/s$/, '')}
            </Button>
          ) : undefined
        }
      />
      <Stack spacing={2} mb={2}>
        <SearchBar value={crud.search} onChange={crud.setSearch} placeholder={`Search ${title.toLowerCase()}...`} />
      </Stack>
      <AppTable
        columns={actionColumns}
        rows={crud.rows}
        total={crud.total}
        page={crud.page}
        pageSize={crud.pageSize}
        loading={crud.isLoading}
        sortBy={crud.sortBy}
        sortOrder={crud.sortOrder}
        onPageChange={crud.setPage}
        onPageSizeChange={crud.setPageSize}
        onSort={crud.handleSort}
        getRowId={(r) => r.id}
      />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
      >
        <DialogTitle>{editId ? `Edit ${title}` : `Create ${title}`}</DialogTitle>
        <DialogContent>
          {renderForm({
            values: formValues,
            onChange: (field, value) => setFormValues((v) => ({ ...v, [field]: value })),
            isEdit: !!editId,
          })}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {editId ? 'Save Changes' : `Create ${title.replace(/s$/, '')}`}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmationDialog
        open={deleteId !== null}
        title="Confirm Delete"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmColor="error"
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleteId) await crud.deleteMutation.mutateAsync(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
}
