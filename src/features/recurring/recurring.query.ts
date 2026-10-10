import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountKeys } from '@/features/accounts/account.query'
import { transactionKeys } from '@/features/transactions/transaction.query'
import { isAppError } from '@/lib/errors'
import type { IRecurringRuleBody, OccurrencesBody } from './recurring.types'

// Loaded on first use, and the Firestore SDK with it, so the login page starts
// without it (src/lib/firestore.ts).
const api = () => import('./recurring.api')

// Query keys in one place so invalidation never drifts out of sync.
export const recurringKeys = {
  all: ['recurring'] as const,
}

/** Every rule, paused and ended ones too. A handful at most, so one query serves the app. */
export const useRecurringRules = () =>
  useQuery({ queryKey: recurringKeys.all, queryFn: async () => (await api()).getRecurringRules() })

/** Whether a write failed because another tab (or the runner) already handled that date. */
export const isAlreadyHandled = (error: unknown) => isAppError(error, 'stale')

const useInvalidateRules = () => {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: recurringKeys.all })
}

export const useCreateRecurringRule = () => {
  const invalidate = useInvalidateRules()
  return useMutation({
    mutationFn: async (body: IRecurringRuleBody) => (await api()).createRecurringRule(body),
    onSuccess: invalidate,
  })
}

export const useUpdateRecurringRule = () => {
  const invalidate = useInvalidateRules()
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: IRecurringRuleBody }) =>
      (await api()).updateRecurringRule(id, body),
    onSuccess: invalidate,
  })
}

/** Pausing, or resuming from `nextDueDate`. */
type ActiveChange = { id: string; active: boolean; nextDueDate?: string }

export const useSetRecurringRuleActive = () => {
  const invalidate = useInvalidateRules()
  return useMutation({
    mutationFn: async ({ id, active, nextDueDate }: ActiveChange) =>
      (await api()).setRecurringRuleActive(id, active, nextDueDate),
    onSuccess: invalidate,
  })
}

// Adding entries moves balances too, so rules, transactions and accounts all
// refresh. A stale write refreshes the rules as well, to show where the
// other tab left them.
export const useAddOccurrences = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: OccurrencesBody }) =>
      (await api()).addOccurrences(id, body),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: recurringKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
        queryClient.invalidateQueries({ queryKey: accountKeys.all }),
      ]),
  })
}

/** Passing over the entry due on `date`, moving the rule on to `nextDueDate`. */
type Skip = { id: string; date: string; nextDueDate: string }

export const useSkipOccurrence = () => {
  const invalidate = useInvalidateRules()
  return useMutation({
    mutationFn: async ({ id, date, nextDueDate }: Skip) =>
      (await api()).skipOccurrence(id, date, nextDueDate),
    onSettled: invalidate,
  })
}

export const useDeleteRecurringRule = () => {
  const invalidate = useInvalidateRules()
  return useMutation({
    mutationFn: async (id: string) => (await api()).deleteRecurringRule(id),
    onSuccess: invalidate,
  })
}
