import type { LUIIconName } from '@lumen-ui/react'
import type { CategoryType } from '@/features/categories/category.types'
import { MISSING_CATEGORY_ICON, type TxLookups } from '@/features/transactions/transaction.labels'
import { type DateRange, parseYmd } from '@/utils'
import { BUDGET_LOOKBACKS, GRANULARITIES, REPORT_PRESETS, type Granularity, type ReportPreset } from './report.types'

/** The report pages, in the order the Reports page lists them. */
export const REPORTS = [
  {
    key: 'cash-flow',
    to: '/reports/cash-flow',
    title: 'Cash flow',
    description: 'Income, expense, net and savings rate over time, by week, month or year.',
    icon: 'bar_chart',
    color: '#15803D',
  },
  {
    key: 'categories',
    to: '/reports/categories',
    title: 'Spending by category',
    description:
      'Every category with its total, share, average entry and change from the period before.',
    icon: 'pie_chart',
    color: '#EA580C',
  },
  {
    key: 'category-trends',
    to: '/reports/category-trends',
    title: 'Category trends',
    description: 'Categories by month in one table, to spot spending that creeps up.',
    icon: 'calendar_month',
    color: '#9333EA',
  },
  {
    key: 'accounts',
    to: '/reports/accounts',
    title: 'Accounts & net worth',
    description:
      'Opening and closing balance of each account, and what you own minus what you owe over time.',
    icon: 'bank',
    color: '#2456E6',
  },
  {
    key: 'budgets',
    to: '/reports/budgets',
    title: 'Budget history',
    description: 'How each budget did period by period, and how often you stayed under the limit.',
    icon: 'donut_large',
    color: '#0D9488',
  },
] as const satisfies readonly {
  key: string
  to: string
  title: string
  description: string
  icon: LUIIconName
  color: string
}[]

export type ReportKey = (typeof REPORTS)[number]['key']

export type ReportInfo = (typeof REPORTS)[number]

export function reportInfo(key: ReportKey): ReportInfo {
  return REPORTS.find((report) => report.key === key)!
}

export const REPORT_PRESET_LABELS: Readonly<Record<ReportPreset, string>> = {
  this_month: 'This month',
  last_month: 'Last month',
  last_3_months: 'Last 3 months',
  last_6_months: 'Last 6 months',
  last_12_months: 'Last 12 months',
  this_year: 'This year',
  last_year: 'Last year',
  custom: 'Custom range',
}

/** Items for the period select. */
export const REPORT_PRESET_OPTIONS = REPORT_PRESETS.map((value) => ({
  value,
  label: REPORT_PRESET_LABELS[value],
}))

export const GRANULARITY_LABELS: Readonly<Record<Granularity, string>> = {
  week: 'Week',
  month: 'Month',
  year: 'Year',
}

/** Items for the "Group by" switch. */
export const GRANULARITY_OPTIONS = GRANULARITIES.map((value) => ({
  value,
  label: GRANULARITY_LABELS[value],
}))

/** "a week", for "Rs 500.00 a week" averages. */
export const PER_BUCKET: Readonly<Record<Granularity, string>> = {
  week: 'a week',
  month: 'a month',
  year: 'a year',
}

export const CATEGORY_TYPE_LABELS: Readonly<Record<CategoryType, string>> = {
  expense: 'Expense',
  income: 'Income',
}

/** Items for the Expense / Income switch. */
export const CATEGORY_TYPE_OPTIONS = (['expense', 'income'] as const).map((value) => ({
  value,
  label: CATEGORY_TYPE_LABELS[value],
}))

/** Items for the budget report's look-back select. */
export const BUDGET_LOOKBACK_OPTIONS = BUDGET_LOOKBACKS.map((value) => ({
  value,
  label: `Last ${value} periods`,
}))

/** The browser's language, which month names are written in. */
const locale = () => navigator.language || 'en-US'

/**
 * A bucket's short axis label: "Sep" (or "Sep 26" when the report spans
 * years) for a month, "28 Sep" for a week, "2026" for a year. A bucket cut
 * short by the range still reads as the period it belongs to.
 */
export function bucketLabel(range: DateRange, by: Granularity, multiYear: boolean): string {
  const start = parseYmd(range.start)
  if (by === 'year') return range.start.slice(0, 4)
  if (by === 'week') {
    return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short' }).format(start)
  }
  return new Intl.DateTimeFormat(
    locale(),
    multiYear ? { month: 'short', year: '2-digit' } : { month: 'short' },
  ).format(start)
}

/** Whether the buckets cross a new year, so month labels need the year. */
export function spansYears(buckets: readonly DateRange[]): boolean {
  return (
    buckets.length > 0 && buckets[0].start.slice(0, 4) !== buckets[buckets.length - 1].end.slice(0, 4)
  )
}

/** How a category reads in a report, with stand-ins for entries without one or a deleted one. */
export function categoryView(
  lookups: Pick<TxLookups, 'categoriesById'>,
  categoryId: number | null,
): { name: string; icon: LUIIconName; color: string | null; archived: boolean } {
  const category = categoryId !== null ? lookups.categoriesById.get(categoryId) : undefined
  if (category) {
    return { name: category.name, icon: category.icon, color: category.color, archived: category.archived }
  }
  return {
    name: categoryId === null ? 'Uncategorized' : 'Deleted category',
    icon: MISSING_CATEGORY_ICON,
    color: null,
    archived: false,
  }
}

/** The accounts a filter names, for the export's details: "Cash, Bank", or `none` when empty. */
export function accountsText(
  lookups: Pick<TxLookups, 'accountsById'>,
  ids: readonly number[],
  none = 'All accounts',
): string {
  if (!ids.length) return none
  return ids.map((id) => lookups.accountsById.get(id)?.name ?? 'Deleted account').join(', ')
}

/** The categories a filter names: "Food, Transport", or "All categories" when empty. */
export function categoriesText(
  lookups: Pick<TxLookups, 'categoriesById'>,
  ids: readonly number[],
): string {
  if (!ids.length) return 'All categories'
  return ids.map((id) => categoryView(lookups, id).name).join(', ')
}

/**
 * Axis labels for many columns: every `step`-th keeps its label so they
 * never collide; the tooltip and the table still name every column.
 */
export function thinLabels<T extends { label: string }>(groups: readonly T[], most = 12): T[] {
  const step = Math.ceil(groups.length / most)
  if (step <= 1) return [...groups]
  return groups.map((group, i) => (i % step === 0 ? group : { ...group, label: '' }))
}

/** "34%", or "—" when there's nothing to take a share of. */
export function percentText(percent: number | null): string {
  return percent === null ? '—' : `${percent}%`
}

/** "1 period", "6 periods". */
export function periodCount(count: number): string {
  return `${count} ${count === 1 ? 'period' : 'periods'}`
}
