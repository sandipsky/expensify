import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from '../services/transactionService';
import type { ITransactionFormValues } from '../validations';
import { accountKeys } from '../../accounts/hooks/useAccounts';

export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: () => [...transactionKeys.lists()] as const,
};

export function useTransactions() {
  return useQuery({
    queryKey: transactionKeys.list(),
    queryFn: listTransactions,
  });
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
  queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ITransactionFormValues) => createTransaction(values),
    onSuccess: () => invalidateAll(queryClient),
  });
}

interface UpdateTransactionInput {
  id: string;
  values: ITransactionFormValues;
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: UpdateTransactionInput) =>
      updateTransaction(id, values),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => invalidateAll(queryClient),
  });
}
