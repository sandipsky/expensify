import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAccount,
  deleteAccount,
  getAccount,
  getAccounts,
  reconcileAccount,
  setAccountArchived,
  updateAccount,
} from './accounts.api'
import type { IAccountBody } from './account.types'

// Query keys in one place so invalidation never drifts out of sync.
// `detail` starts with the same 'accounts' prefix, so invalidating
// `accountKeys.all` refreshes the list AND every cached detail at once.
export const accountKeys = {
  all: ['accounts'] as const,
  detail: (id: number) => ['accounts', id] as const,
}

export const useAccounts = () => useQuery({ queryKey: accountKeys.all, queryFn: getAccounts })

export const useAccount = (id: number, enabled = true) =>
  useQuery({
    queryKey: accountKeys.detail(id),
    queryFn: () => getAccount(id),
    enabled: enabled && Number.isFinite(id),
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
    mutationFn: (body: IAccountBody) => createAccount(body),
    onSuccess: invalidate,
  })
}

export const useUpdateAccount = () => {
  const invalidate = useInvalidateAccounts()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: IAccountBody }) => updateAccount(id, body),
    onSuccess: invalidate,
  })
}

export const useSetAccountArchived = () => {
  const invalidate = useInvalidateAccounts()
  return useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      setAccountArchived(id, archived),
    onSuccess: invalidate,
  })
}

export const useReconcileAccount = () => {
  const invalidate = useInvalidateAccounts()
  return useMutation({
    mutationFn: ({ id, actualBalance }: { id: number; actualBalance: number }) =>
      reconcileAccount(id, actualBalance),
    onSuccess: invalidate,
  })
}

export const useDeleteAccount = () => {
  const invalidate = useInvalidateAccounts()
  return useMutation({
    mutationFn: (id: number) => deleteAccount(id),
    onSuccess: invalidate,
  })
}
