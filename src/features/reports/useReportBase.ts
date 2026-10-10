import { useAccounts } from '@/features/accounts/account.query'
import { useCategories } from '@/features/categories/category.query'
import type { TxLookups } from '@/features/transactions/transaction.labels'
import { useToday } from '@/lib'
import { DEFAULT_CURRENCY, formatCompactMoney, formatMoney } from '@/utils'

/**
 * What every report reads besides its own figures: today, the accounts and
 * categories it names things from, the currency and the money formats.
 */
export function useReportBase() {
  const today = useToday()
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()

  const accounts = accountsQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  // Accounts share one currency until multi-currency exists.
  const currency = accounts[0]?.currency ?? DEFAULT_CURRENCY
  const lookups: TxLookups = {
    accountsById: new Map(accounts.map((a) => [a.id, a])),
    categoriesById: new Map(categories.map((c) => [c.id, c])),
    today,
  }

  return {
    today,
    accounts,
    categories,
    currency,
    lookups,
    loading: accountsQuery.isLoading || categoriesQuery.isLoading,
    error: accountsQuery.error ?? categoriesQuery.error ?? null,
    /** "Rs 1,234.50". */
    money: (amount: number) => formatMoney(amount, currency),
    /** "+Rs 1,234.50", "−Rs 80.00". */
    signedMoney: (amount: number) => formatMoney(amount, currency, 'exceptZero'),
    /** "Rs 1.2L", for chart axes and captions. */
    compactMoney: (amount: number, signDisplay: 'auto' | 'exceptZero' = 'auto') =>
      formatCompactMoney(amount, currency, signDisplay),
  }
}

export type ReportBase = ReturnType<typeof useReportBase>
