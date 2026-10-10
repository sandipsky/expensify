import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTransactions } from '@/features/transactions/transaction.query'
import type { DateRange } from '@/utils'
import {
  createBudget,
  deleteBudget,
  getBudgets,
  recordBudgetAlert,
  setBudgetActive,
  updateBudget,
} from './budgets.api'
import type { BudgetAlert, IBudgetBody } from './budget.types'

// Query keys in one place so invalidation never drifts out of sync.
export const budgetKeys = {
  all: ['budgets'] as const,
}

/** Every budget, paused ones too. A handful at most, so one query serves the app. */
export const useBudgets = () => useQuery({ queryKey: budgetKeys.all, queryFn: getBudgets })

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
    mutationFn: (body: IBudgetBody) => createBudget(body),
    onSuccess: invalidate,
  })
}

export const useUpdateBudget = () => {
  const invalidate = useInvalidateBudgets()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: IBudgetBody }) => updateBudget(id, body),
    onSuccess: invalidate,
  })
}

export const useSetBudgetActive = () => {
  const invalidate = useInvalidateBudgets()
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => setBudgetActive(id, active),
    onSuccess: invalidate,
  })
}

export const useRecordBudgetAlert = () => {
  const invalidate = useInvalidateBudgets()
  return useMutation({
    mutationFn: ({ id, alert }: { id: number; alert: BudgetAlert }) => recordBudgetAlert(id, alert),
    onSuccess: invalidate,
  })
}

export const useDeleteBudget = () => {
  const invalidate = useInvalidateBudgets()
  return useMutation({
    mutationFn: (id: number) => deleteBudget(id),
    onSuccess: invalidate,
  })
}
