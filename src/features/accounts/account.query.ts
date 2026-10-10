import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { IAccountBody } from './account.types'

// Loaded on first use, and the Firestore SDK with it, so the login page starts
// without it (src/lib/firestore.ts).
const api = () => import('./accounts.api')

// Query keys in one place so invalidation never drifts out of sync.
// `detail` starts with the same 'accounts' prefix, so invalidating
// `accountKeys.all` refreshes the list AND every cached detail at once.
export const accountKeys = {
  all: ['accounts'] as const,
  detail: (id: string) => ['accounts', id] as const,
}

export const useAccounts = () =>
  useQuery({ queryKey: accountKeys.all, queryFn: async () => (await api()).getAccounts() })

export const useAccount = (id: string, enabled = true) =>
  useQuery({
    queryKey: accountKeys.detail(id),
    queryFn: async () => (await api()).getAccount(id),
    enabled: enabled && id !== '',
  })

// Every write invalidates the whole prefix, so the list, the total and an
// open detail page all refresh from one place.
const useInvalidateAccounts = () => {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: accountKeys.all })
}

export const useCreateAccount = () => {
  const invalidate = useInvalidateAccounts()
  return useMutation({
    mutationFn: async (body: IAccountBody) => (await api()).createAccount(body),
    onSuccess: invalidate,
  })
}

export const useUpdateAccount = () => {
  const invalidate = useInvalidateAccounts()
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: IAccountBody }) =>
      (await api()).updateAccount(id, body),
    onSuccess: invalidate,
  })
}

export const useSetAccountArchived = () => {
  const invalidate = useInvalidateAccounts()
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) =>
      (await api()).setAccountArchived(id, archived),
    onSuccess: invalidate,
  })
}

export const useReconcileAccount = () => {
  const invalidate = useInvalidateAccounts()
  return useMutation({
    mutationFn: async ({ id, actualBalance }: { id: string; actualBalance: number }) =>
      (await api()).reconcileAccount(id, actualBalance),
    onSuccess: invalidate,
  })
}

export const useDeleteAccount = () => {
  const invalidate = useInvalidateAccounts()
  return useMutation({
    mutationFn: async (id: string) => (await api()).deleteAccount(id),
    onSuccess: invalidate,
  })
}
