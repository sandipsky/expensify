import type { LUIIconName } from '@lumen-ui/react'
import type { BudgetProgress } from '@/features/budgets/budget.domain'
import type { IBudget } from '@/features/budgets/budget.types'
import type { RuleView } from '@/features/recurring/recurring.labels'
import type { TxType } from '@/features/transactions/transaction.types'
import { type DateRange, isYmd } from '@/utils'

/** The periods the switcher offers. */
export const DASHBOARD_PRESETS = ['this_month', 'last_month', 'custom'] as const

export type DashboardPreset = (typeof DASHBOARD_PRESETS)[number]

/** The dashboard state kept in the URL, so Back from a drill-down returns to the same period. */
export interface DashboardSearch {
  period?: DashboardPreset
  /** The custom range, `YYYY-MM-DD`; only read with `period=custom`. */
  from?: string
  to?: string
}

/**
 * The URL's search params as the dashboard reads them. Every key is set, as
 * `undefined` when malformed: the router merges the layout route's raw
 * search underneath, so a key left out would let the raw value through.
 */
export function parseDashboardSearch(search: Record<string, unknown>): DashboardSearch {
  const period = search.period as DashboardPreset
  const [from, to] =
    isYmd(search.from) && isYmd(search.to) ? [search.from, search.to] : [undefined, undefined]
  return { period: DASHBOARD_PRESETS.includes(period) ? period : undefined, from, to }
}

/** One row of the spending card: a category, or "Other" for the rest. */
export interface SpendingRow {
  key: string
  /** The category IDs the row stands for; "Other" holds several. */
  categoryIds: string[]
  name: string
  icon: LUIIconName
  color: string | null
  amount: number
  count: number
  share: number | null
}

/** One budget on the card with its current figures. */
export interface BudgetRow {
  budget: IBudget
  /** Undefined while the budget's spending loads. */
  progress: BudgetProgress | undefined
}

/** One recurring occurrence in the next days. */
export interface UpcomingRow {
  key: string
  view: RuleView
  date: string
  /** The rule's next date, and due by today: an ask-first rule can be confirmed or skipped. */
  due: boolean
}

/** What a drill-down opens the transaction list on. */
export interface DrillDown {
  range: DateRange
  type?: TxType
  categoryIds?: readonly string[]
}
