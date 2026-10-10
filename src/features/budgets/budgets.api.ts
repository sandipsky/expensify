import { apiClient } from '@/lib'
import type { BudgetAlert, IBudget, IBudgetBody } from './budget.types'

export const getBudgets = async () => {
  const res = await apiClient.get<IBudget[]>('/budgets')
  return res.data
}

export const createBudget = async (body: IBudgetBody) => {
  const res = await apiClient.post<IBudget>('/budgets', body)
  return res.data
}

export const updateBudget = async (id: number, body: IBudgetBody) => {
  const res = await apiClient.put<IBudget>(`/budgets/${id}`, body)
  return res.data
}

/** Pausing keeps the settings; it only stops tracking and alerts. */
export const setBudgetActive = async (id: number, active: boolean) => {
  const res = await apiClient.patch<IBudget>(`/budgets/${id}/active`, { active })
  return res.data
}

/** Records that an alert was shown, so it isn't shown again that period. */
export const recordBudgetAlert = async (id: number, alert: BudgetAlert) => {
  const res = await apiClient.patch<IBudget>(`/budgets/${id}/alert`, alert)
  return res.data
}

export const deleteBudget = async (id: number) => {
  await apiClient.delete(`/budgets/${id}`)
}
