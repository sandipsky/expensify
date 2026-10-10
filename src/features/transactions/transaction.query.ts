import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountKeys } from '@/features/accounts/account.query'
import {
  createTransaction,
  deleteAllTransactions,
  deleteTransaction,
  getTransaction,
  getTransactions,
  updateTransaction,
} from './transactions.api'
import type { ITransactionBody, TransactionQuery } from './transaction.types'

// Query keys in one place so invalidation never drifts out of sync. Every
// key starts with 'transactions', so invalidating `all` refreshes each
// period's list and every cached detail at once.
export const transactionKeys = {
  all: ['transactions'] as const,
  list: (query: TransactionQuery) => ['transactions', 'list', query] as const,
  detail: (id: number) => ['transactions', 'detail', id] as const,
}

/** The transactions a query matches, newest first. Filters and search run on the device. */
export const useTransactions = (query: TransactionQuery = {}, enabled = true) =>
  useQuery({
    queryKey: transactionKeys.list(query),
    queryFn: () => getTransactions(query),
    enabled,
  })

export const useTransaction = (id: number, enabled = true) =>
  useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => getTransaction(id),
    enabled: enabled && Number.isFinite(id),
  })

// Every write moves account balances too, so both features refresh.
const useInvalidateTransactions = () => {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
      queryClient.invalidateQueries({ queryKey: accountKeys.all }),
    ])
}

export const useCreateTransaction = () => {
  const invalidate = useInvalidateTransactions()
  return useMutation({
    mutationFn: (body: ITransactionBody) => createTransaction(body),
    onSuccess: invalidate,
  })
}

export const useUpdateTransaction = () => {
  const invalidate = useInvalidateTransactions()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ITransactionBody }) =>
      updateTransaction(id, body),
    onSuccess: invalidate,
  })
}

export const useDeleteTransaction = () => {
  const invalidate = useInvalidateTransactions()
  return useMutation({
    mutationFn: (id: number) => deleteTransaction(id),
    onSuccess: invalidate,
  })
}

export const useDeleteAllTransactions = () => {
  const invalidate = useInvalidateTransactions()
  return useMutation({
    mutationFn: deleteAllTransactions,
    onSuccess: invalidate,
  })
}
