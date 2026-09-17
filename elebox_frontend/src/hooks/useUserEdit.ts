import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { userService } from '@/services/userService';
import type { User, UserFormValues } from '@/types';
import { userToFormValues } from '@/utils/userForm';

interface OpenEditResult {
  user: User;
  formValues: UserFormValues;
}

export const useUserEdit = () => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const invalidateUsers = () =>
    queryClient.invalidateQueries({ queryKey: ['users'] });

  const loadForEditMutation = useMutation({
    mutationFn: (userId: number) => userService.getForEdit(userId),
  });

  const saveEditMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: UserFormValues }) =>
      userService.edit(id, values),
    onSuccess: () => {
      enqueueSnackbar('User updated successfully', { variant: 'success' });
      invalidateUsers();
    },
    onError: (err: { message?: string }) => {
      enqueueSnackbar(err.message ?? 'Update failed', { variant: 'error' });
    },
  });

  const openForEdit = async (userId: number): Promise<OpenEditResult | null> => {
    try {
      const user = await loadForEditMutation.mutateAsync(userId);
      return {
        user,
        formValues: userToFormValues(user),
      };
    } catch (err) {
      enqueueSnackbar(
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message?: string }).message ?? 'Failed to load user')
          : 'Failed to load user',
        { variant: 'error' },
      );
      return null;
    }
  };

  return {
    openForEdit,
    saveEdit: saveEditMutation.mutateAsync,
    isLoadingEdit: loadForEditMutation.isPending,
    isSavingEdit: saveEditMutation.isPending,
    loadingEditUserId: loadForEditMutation.isPending
      ? loadForEditMutation.variables
      : null,
  };
};
