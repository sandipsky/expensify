import { apiClient } from '@/lib'
import type {
  IRecurringRule,
  IRecurringRuleBody,
  OccurrencesBody,
  OccurrencesResult,
} from './recurring.types'

export const getRecurringRules = async () => {
  const res = await apiClient.get<IRecurringRule[]>('/recurring')
  return res.data
}

export const createRecurringRule = async (body: IRecurringRuleBody) => {
  const res = await apiClient.post<IRecurringRule>('/recurring', body)
  return res.data
}

/** Reaches future entries only; the ones already added stay as they are. */
export const updateRecurringRule = async (id: number, body: IRecurringRuleBody) => {
  const res = await apiClient.put<IRecurringRule>(`/recurring/${id}`, body)
  return res.data
}

/** Resuming passes the date to pick up from, so dates passed while paused are left out. */
export const setRecurringRuleActive = async (id: number, active: boolean, nextDueDate?: string) => {
  const res = await apiClient.patch<IRecurringRule>(`/recurring/${id}/active`, {
    active,
    nextDueDate,
  })
  return res.data
}

/**
 * Adds the entries due on `dates` and moves the rule on, in one write. The
 * server answers 409 when another tab already handled the first date.
 */
export const addOccurrences = async (id: number, body: OccurrencesBody) => {
  const res = await apiClient.post<OccurrencesResult>(`/recurring/${id}/occurrences`, body)
  return res.data
}

/** Passes over the entry due on `date`; 409 when it was already handled. */
export const skipOccurrence = async (id: number, date: string, nextDueDate: string) => {
  const res = await apiClient.post<IRecurringRule>(`/recurring/${id}/skip`, { date, nextDueDate })
  return res.data
}

/** The entries it already added stay. */
export const deleteRecurringRule = async (id: number) => {
  await apiClient.delete(`/recurring/${id}`)
}
