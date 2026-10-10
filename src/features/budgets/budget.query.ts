import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTransactions } from '@/features/transactions/transaction.query'
import type { DateRange } from '@/utils'
import type { BudgetAlert, IBudgetBody } from './budget.types'

// Loaded on first use, and the Firestore SDK with it, so the login page starts
// without it (src/lib/firestore.ts).
const api = () => import('./budgets.api')

// Query keys in one place so invalidation never drifts out of sync.
export const budgetKeys = {
  all: ['budgets'] as const,
}

/** Every budget, paused ones too. A handful at most, so one query serves the app. */
export const useBudgets = () =>
  useQuery({ queryKey: budgetKeys.all, queryFn: async () => (await api()).getBudgets() })

/**
 * The transactions budget figures read, over one range. The pages and the
 * alerts ask for the same range, so they share one cached list. Nothing
 * loads while there's no range.
 */
export const useSpending = (range: DateRange | null) =>
  useTransactions(range ? { from: range.start, to: range.end } : {}, range !== null)

const useInvalidateBudgets = () => {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: budgetKeys.all })
}

export const useCreateBudget = () => {
  const invalidate = useInvalidateBudgets()
  return useMutation({
    mutationFn: async (body: IBudgetBody) => (await api()).createBudget(body),
    onSuccess: invalidate,
  })
}

export const useUpdateBudget = () => {
  const invalidate = useInvalidateBudgets()
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: IBudgetBody }) =>
      (await api()).updateBudget(id, body),
    onSuccess: invalidate,
  })
}

export const useSetBudgetActive = () => {
  const invalidate = useInvalidateBudgets()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      (await api()).setBudgetActive(id, active),
    onSuccess: invalidate,
  })
}

export const useRecordBudgetAlert = () => {
  const invalidate = useInvalidateBudgets()
  return useMutation({
    mutationFn: async ({ id, alert }: { id: string; alert: BudgetAlert }) =>
      (await api()).recordBudgetAlert(id, alert),
    onSuccess: invalidate,
  })
}

export const useDeleteBudget = () => {
  const invalidate = useInvalidateBudgets()
  return useMutation({
    mutationFn: async (id: string) => (await api()).deleteBudget(id),
    onSuccess: invalidate,
  })
}
