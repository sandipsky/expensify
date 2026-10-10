import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { accountKeys } from '@/features/accounts/account.query'
import { transactionKeys } from '@/features/transactions/transaction.query'
import {
  addOccurrences,
  createRecurringRule,
  deleteRecurringRule,
  getRecurringRules,
  setRecurringRuleActive,
  skipOccurrence,
  updateRecurringRule,
} from './recurring.api'
import type { IRecurringRuleBody, OccurrencesBody } from './recurring.types'

// Query keys in one place so invalidation never drifts out of sync.
export const recurringKeys = {
  all: ['recurring'] as const,
}

/** Every rule, paused and ended ones too. A handful at most, so one query serves the app. */
export const useRecurringRules = () =>
  useQuery({ queryKey: recurringKeys.all, queryFn: getRecurringRules })

/** Whether a write failed because another tab (or the runner) already handled that date. */
export const isAlreadyHandled = (error: unknown) =>
  isAxiosError(error) && error.response?.status === 409

const useInvalidateRules = () => {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: recurringKeys.all })
}

export const useCreateRecurringRule = () => {
  const invalidate = useInvalidateRules()
  return useMutation({
    mutationFn: (body: IRecurringRuleBody) => createRecurringRule(body),
    onSuccess: invalidate,
  })
}

export const useUpdateRecurringRule = () => {
  const invalidate = useInvalidateRules()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: IRecurringRuleBody }) =>
      updateRecurringRule(id, body),
    onSuccess: invalidate,
  })
}

export const useSetRecurringRuleActive = () => {
  const invalidate = useInvalidateRules()
  return useMutation({
    mutationFn: ({ id, active, nextDueDate }: { id: number; active: boolean; nextDueDate?: string }) =>
      setRecurringRuleActive(id, active, nextDueDate),
    onSuccess: invalidate,
  })
}

// Adding entries moves balances too, so rules, transactions and accounts all
// refresh. A stale write (409) refreshes the rules as well, to show where the
// other tab left them.
export const useAddOccurrences = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: OccurrencesBody }) => addOccurrences(id, body),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: recurringKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
        queryClient.invalidateQueries({ queryKey: accountKeys.all }),
      ]),
  })
}

export const useSkipOccurrence = () => {
  const invalidate = useInvalidateRules()
  return useMutation({
    mutationFn: ({ id, date, nextDueDate }: { id: number; date: string; nextDueDate: string }) =>
      skipOccurrence(id, date, nextDueDate),
    onSettled: invalidate,
  })
}

export const useDeleteRecurringRule = () => {
  const invalidate = useInvalidateRules()
  return useMutation({
    mutationFn: (id: number) => deleteRecurringRule(id),
    onSuccess: invalidate,
  })
}
