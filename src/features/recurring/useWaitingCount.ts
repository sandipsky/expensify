import { useAccounts } from '@/features/accounts/account.query'
import { useCategories } from '@/features/categories/category.query'
import { useToday } from '@/lib'
import { groupRules } from './recurring.labels'
import { useRecurringRules } from './recurring.query'

/** How many ask-first entries wait for Confirm or Skip, for the navigation badge. */
export function useWaitingCount(): number {
  const today = useToday()
  const rules = useRecurringRules()
  const accounts = useAccounts()
  const categories = useCategories()
  if (!rules.data || !accounts.data || !categories.data) return 0

  const { waiting } = groupRules(rules.data, {
    accountsById: new Map(accounts.data.map((a) => [a.id, a])),
    categoriesById: new Map(categories.data.map((c) => [c.id, c])),
    today,
  })
  return waiting.reduce((sum, view) => sum + view.due.length, 0)
}
