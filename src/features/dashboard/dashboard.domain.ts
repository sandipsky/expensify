// Dashboard figures: pure functions on plain amounts and `YYYY-MM-DD` strings,
// ported from expensify-web's reports domain, which the reports page will
// share. Every total leaves transfers out. Percentages are rounded only here,
// for display: `Math.round`, which rounds halves up.
import type { CategoryType } from '@/features/categories/category.types'
import { totalsOf } from '@/features/transactions/transaction.domain'
import type { ITransaction } from '@/features/transactions/transaction.types'
import { type DateRange, inRange, monthPeriod, previousRanges, sameRange } from '@/utils'
import type { DashboardPreset } from './dashboard.types'

/** The trend shows the selected period and the five before it. */
export const TREND_PERIODS = 6
/** Slices before the rest folds into "Other". */
export const TOP_CATEGORIES = 5
/** Budgets on the card before "See all". */
export const TOP_BUDGETS = 5
/** Entries on the recent card. */
export const RECENT_COUNT = 5
/** How far ahead the upcoming card looks. */
export const UPCOMING_DAYS = 7

type ReportTx = Pick<ITransaction, 'type' | 'amount' | 'categoryId' | 'date'>

/** Whole percent of `total`, or null when there's no total to share. */
export function shareOf(amount: number, total: number): number | null {
  return total > 0 ? Math.round((amount * 100) / total) : null
}

/** Savings rate: net ÷ income × 100, whole percent; null ("—") when there's no income. */
export function savingsRate(income: number, net: number): number | null {
  return income > 0 ? Math.round((net * 100) / income) : null
}

/** Change from `previous` to `current` as whole percent; null when there was nothing before. */
export function changePercent(previous: number, current: number): number | null {
  return previous !== 0 ? Math.round(((current - previous) * 100) / Math.abs(previous)) : null
}

/** How a figure moved from the previous period: the difference and, when there was something before, the whole percent. */
export interface Change {
  amount: number
  percent: number | null
}

export function changeOf(previous: number, current: number): Change {
  return { amount: current - previous, percent: changePercent(previous, current) }
}

/** Each summary figure's change from `previous` to `current`. */
export interface SummaryChange {
  income: Change
  expense: Change
  net: Change
  /** In percentage points; null when either period has no income. */
  savingsRate: number | null
}

export function summaryChange(
  previous: Pick<PeriodSummary, 'income' | 'expense' | 'net' | 'savingsRate'>,
  current: Pick<PeriodSummary, 'income' | 'expense' | 'net' | 'savingsRate'>,
): SummaryChange {
  return {
    income: changeOf(previous.income, current.income),
    expense: changeOf(previous.expense, current.expense),
    net: changeOf(previous.net, current.net),
    savingsRate:
      previous.savingsRate === null || current.savingsRate === null
        ? null
        : current.savingsRate - previous.savingsRate,
  }
}

/** One category's part of a period's income or expense. */
export interface CategoryTotal {
  /** Null for entries without a category. */
  categoryId: string | null
  amount: number
  count: number
}

/**
 * The type's totals per category, largest first. Entries without a category
 * count under null so the total still adds up; ties sort by ID so the list
 * never reorders between renders.
 */
export function categoryTotals(txs: readonly ReportTx[], type: CategoryType): CategoryTotal[] {
  const totals = new Map<string | null, CategoryTotal>()
  for (const tx of txs) {
    if (tx.type !== type) continue
    const total = totals.get(tx.categoryId) ?? { categoryId: tx.categoryId, amount: 0, count: 0 }
    total.amount += tx.amount
    total.count += 1
    totals.set(tx.categoryId, total)
  }
  return [...totals.values()].sort(
    (a, b) => b.amount - a.amount || (a.categoryId ?? '').localeCompare(b.categoryId ?? ''),
  )
}

/** The first `keep` rows, and what the rest add up to ("Other"), or null when nothing's left over. */
export function topAndOther(
  rows: readonly CategoryTotal[],
  keep: number,
): {
  top: CategoryTotal[]
  other: { amount: number; count: number; categoryIds: string[] } | null
} {
  const top = rows.slice(0, keep)
  const rest = rows.slice(keep)
  if (!rest.length) return { top, other: null }
  return {
    top,
    other: {
      amount: rest.reduce((sum, r) => sum + r.amount, 0),
      count: rest.reduce((sum, r) => sum + r.count, 0),
      categoryIds: rest.map((r) => r.categoryId).filter((id): id is string => id !== null),
    },
  }
}

/** Income, expense, net and savings rate for one period. */
export interface PeriodSummary {
  range: DateRange
  income: number
  expense: number
  net: number
  savingsRate: number | null
}

/** One summary of everything in `txs`, labelled with `range`. */
export function summaryOf(range: DateRange, txs: readonly ReportTx[]): PeriodSummary {
  const { income, expense, net } = totalsOf(txs)
  return { range, income, expense, net, savingsRate: savingsRate(income, net) }
}

/** Each range's summary, in the order given. `txs` must cover them all and may cover more. */
export function periodSummaries(
  txs: readonly ReportTx[],
  ranges: readonly DateRange[],
): PeriodSummary[] {
  return ranges.map((range) =>
    summaryOf(
      range,
      txs.filter((tx) => inRange(tx.date, range)),
    ),
  )
}

/** The range a preset stands for on `today`; `custom` returns the given range. */
export function dashboardRange(preset: DashboardPreset, today: string, custom: DateRange): DateRange {
  switch (preset) {
    case 'this_month':
      return monthPeriod(today)
    case 'last_month':
      return monthPeriod(today, -1)
    case 'custom':
      return custom
  }
}

/**
 * The selected period and the five before it, oldest first: calendar months
 * for the presets, ranges of the same length for a custom range.
 */
export function trendPeriods(preset: DashboardPreset, range: DateRange, today: string): DateRange[] {
  if (preset === 'custom') {
    return [...previousRanges(range, TREND_PERIODS - 1), range]
  }
  const last = preset === 'this_month' ? 0 : -1
  return Array.from({ length: TREND_PERIODS }, (_, i) =>
    monthPeriod(today, last - (TREND_PERIODS - 1) + i),
  )
}

/** The preset a range falls under on `today`, or `custom` for any other range. */
export function dashboardPresetOf(range: DateRange, today: string): DashboardPreset {
  if (sameRange(range, monthPeriod(today))) return 'this_month'
  if (sameRange(range, monthPeriod(today, -1))) return 'last_month'
  return 'custom'
}
