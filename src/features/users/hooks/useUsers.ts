import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from '../services/userService';
import type {
  IUserCreateFormValues,
  IUserUpdateFormValues,
} from '../validations';

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: () => [...userKeys.lists()] as const,
};

export function useUsers() {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: listUsers,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: IUserCreateFormValues) => createUser(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

interface UpdateUserInput {
  id: string;
  values: IUserUpdateFormValues;
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: UpdateUserInput) => updateUser(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
