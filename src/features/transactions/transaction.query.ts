import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountKeys } from '@/features/accounts/account.query'
import type { ITransactionBody, TransactionQuery } from './transaction.types'

// Loaded on first use, and the Firestore SDK with it, so the login page starts
// without it (src/lib/firestore.ts).
const api = () => import('./transactions.api')

// Query keys in one place so invalidation never drifts out of sync. Every
// key starts with 'transactions', so invalidating `all` refreshes each
// period's list and every cached detail at once.
export const transactionKeys = {
  all: ['transactions'] as const,
  list: (query: TransactionQuery) => ['transactions', 'list', query] as const,
  detail: (id: string) => ['transactions', 'detail', id] as const,
}

/** The transactions a query matches, newest first, for `useQuery` or `fetchQuery`. */
export const transactionsQuery = (query: TransactionQuery = {}) =>
  queryOptions({
    queryKey: transactionKeys.list(query),
    queryFn: async () => (await api()).getTransactions(query),
  })

/** The transactions a query matches, newest first. Filters and search run on the device. */
export const useTransactions = (query: TransactionQuery = {}, enabled = true) =>
  useQuery({ ...transactionsQuery(query), enabled })

export const useTransaction = (id: string, enabled = true) =>
  useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: async () => (await api()).getTransaction(id),
    enabled: enabled && id !== '',
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
    mutationFn: async (body: ITransactionBody) => (await api()).createTransaction(body),
    onSuccess: invalidate,
  })
}

export const useUpdateTransaction = () => {
  const invalidate = useInvalidateTransactions()
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: ITransactionBody }) =>
      (await api()).updateTransaction(id, body),
    onSuccess: invalidate,
  })
}

export const useDeleteTransaction = () => {
  const invalidate = useInvalidateTransactions()
  return useMutation({
    mutationFn: async (id: string) => (await api()).deleteTransaction(id),
    onSuccess: invalidate,
  })
}

export const useDeleteAllTransactions = () => {
  const invalidate = useInvalidateTransactions()
  return useMutation({
    mutationFn: async () => (await api()).deleteAllTransactions(),
    onSuccess: invalidate,
  })
}
