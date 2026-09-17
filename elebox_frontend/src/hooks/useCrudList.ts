import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import type { ListParams, PaginatedResponse } from '@/types';

interface CrudService<T> {
  getAll: (params?: ListParams) => Promise<PaginatedResponse<T>>;
  create: (payload: Omit<T, 'id'>) => Promise<T>;
  update: (id: number, payload: Partial<T>) => Promise<T>;
  delete: (id: number) => Promise<void>;
}

export const useCrudList = <T extends { id: number }>(
  queryKey: string,
  service: CrudService<T>,
) => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const params: ListParams = {
    page: page + 1,
    pageSize,
    search: search || undefined,
    sortBy,
    sortOrder,
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [queryKey, params],
    queryFn: () => service.getAll(params),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [queryKey] });

  const createMutation = useMutation({
    mutationFn: (payload: Omit<T, 'id'>) => service.create(payload),
    onSuccess: () => {
      enqueueSnackbar('Created successfully', { variant: 'success' });
      invalidate();
    },
    onError: (err: { message?: string }) => {
      enqueueSnackbar(err.message ?? 'Create failed', { variant: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<T> }) =>
      service.update(id, payload),
    onSuccess: () => {
      enqueueSnackbar('Updated successfully', { variant: 'success' });
      invalidate();
    },
    onError: (err: { message?: string }) => {
      enqueueSnackbar(err.message ?? 'Update failed', { variant: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => service.delete(id),
    onSuccess: () => {
      enqueueSnackbar('Deleted successfully', { variant: 'success' });
      invalidate();
    },
    onError: (err: { message?: string }) => {
      enqueueSnackbar(err.message ?? 'Delete failed', { variant: 'error' });
    },
  });

  const handleSort = useCallback(
    (column: string) => {
      if (sortBy === column) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(column);
        setSortOrder('asc');
      }
    },
    [sortBy],
  );

  return {
    rows: data?.data ?? [],
    total: data?.total ?? 0,
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
    isLoading,
    isError,
    setPage,
    setPageSize,
    setSearch,
    handleSort,
    refetch,
    createMutation,
    updateMutation,
    deleteMutation,
  };
};
