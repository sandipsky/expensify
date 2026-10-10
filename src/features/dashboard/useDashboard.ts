import { useNavigate } from '@tanstack/react-router'
import type { BarChartGroup, ChartSeries, DonutSegment } from '@/components/chart'
import { useAccounts } from '@/features/accounts/account.query'
import { budgetProgress, neededRange, type BudgetProgress } from '@/features/budgets/budget.domain'
import { useBudgets, useSpending } from '@/features/budgets/budget.query'
import { useCategories } from '@/features/categories/category.query'
import { upcomingDates } from '@/features/recurring/recurring.domain'
import { toRuleView } from '@/features/recurring/recurring.labels'
import { useRecurringRules } from '@/features/recurring/recurring.query'
import { MASKED_AMOUNT } from '@/features/transactions/components/TransactionAmount'
import { compareNewestFirst } from '@/features/transactions/transaction.domain'
import {
  MISSING_CATEGORY_ICON,
  type TxLookups,
  type TxRow,
  toRow,
} from '@/features/transactions/transaction.labels'
import { useTransactions } from '@/features/transactions/transaction.query'
import { transactionSearchFor } from '@/features/transactions/transaction.search'
import { useToday } from '@/lib'
import {
  DEFAULT_CURRENCY,
  type DateRange,
  addDays,
  dataColor,
  formatCompactMoney,
  formatMoney,
  formatPeriod,
  fractionDigits,
  inRange,
  monthPeriod,
  orderedRange,
  spanOf,
} from '@/utils'
import {
  RECENT_COUNT,
  TOP_BUDGETS,
  TOP_CATEGORIES,
  TREND_PERIODS,
  UPCOMING_DAYS,
  type SummaryChange,
  categoryTotals,
  dashboardRange,
  periodSummaries,
  dashboardPresetOf,
  shareOf,
  summaryChange,
  summaryOf,
  topAndOther,
  trendPeriods,
} from './dashboard.domain'
import { DASHBOARD_CARDS, PERIOD_CARDS, shortPeriodLabel } from './dashboard.labels'
import { usePrivacy } from './dashboard.privacy'
import type {
  BudgetRow,
  DashboardPreset,
  DashboardSearch,
  DrillDown,
  SpendingRow,
  UpcomingRow,
} from './dashboard.types'

/** Key of the donut's "Other" slice. */
export const OTHER = 'other'
/** Neutral for "Other" and entries without a category, so no category's color is borrowed. */
const NEUTRAL = 'var(--text-quaternary)'

/** Income and expense bars, in the income and expense colors, with a legend and signs elsewhere. */
const FLOW_SERIES: readonly ChartSeries[] = [
  { key: 'income', label: 'Income', color: 'var(--success)' },
  { key: 'expense', label: 'Expense', color: 'var(--error)' },
]

/** Percent used for sorting: a zero limit is over everything, and figures still loading sort last. */
function usedOf(progress: BudgetProgress | undefined): number {
  if (!progress) return -1
  return progress.percent ?? Number.POSITIVE_INFINITY
}

/**
 * The dashboard's state: the selected period from the URL, one query on it
 * and one range query over the five periods before it, and every card's
 * figures from the shared domain functions. Accounts, categories, budgets
 * and recurring rules come from the queries the app already caches.
 */
export function useDashboard(search: DashboardSearch) {
  const navigate = useNavigate()
  const today = useToday()
  const [masked, togglePrivacy] = usePrivacy()

  const preset: DashboardPreset = search.period ?? 'this_month'
  /** The range "Custom" shows; it starts as this month. */
  const custom: DateRange =
    search.from && search.to ? orderedRange(search.from, search.to) : monthPeriod(today)
  /** The selected period. */
  const range = dashboardRange(preset, today, custom)
  const periodLabel = formatPeriod(range)
  /** The selected period and the five before it, oldest first. */
  const periods = trendPeriods(preset, range, today)
  /** The period the summary cards compare with. */
  const previous = periods[TREND_PERIODS - 2]
  /** One range over the five earlier periods: they end the day before the selected one starts. */
  const earlierRange: DateRange = { start: periods[0].start, end: addDays(range.start, -1) }

  // The two ranges the page reads: one query each, never one per card.
  const current = useTransactions({ from: range.start, to: range.end })
  const earlier = useTransactions({ from: earlierRange.start, to: earlierRange.end })
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()
  const budgetsQuery = useBudgets()
  const rulesQuery = useRecurringRules()

  const budgets = budgetsQuery.data ?? []
  const activeBudgets = budgets.filter((b) => b.active)
  // The same range the Budgets page and the alerts read, so all three share one cached list.
  const spending = useSpending(spanOf(activeBudgets.map((b) => neededRange(b, today))))

  /** True until the period's entries and the lists the cards name things from have loaded. */
  const loading =
    current.isLoading ||
    earlier.isLoading ||
    accountsQuery.isLoading ||
    categoriesQuery.isLoading ||
    budgetsQuery.isLoading
  const error =
    current.error ??
    earlier.error ??
    accountsQuery.error ??
    categoriesQuery.error ??
    budgetsQuery.error ??
    null

  const accounts = accountsQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  // Accounts share one currency until multi-currency exists.
  const currency = accounts[0]?.currency ?? DEFAULT_CURRENCY
  const lookups: TxLookups = {
    accountsById: new Map(accounts.map((a) => [a.id, a])),
    categoriesById: new Map(categories.map((c) => [c.id, c])),
    today,
  }

  /** The selected period's entries, newest first; empty while loading. */
  const txs = loading ? [] : [...(current.data ?? [])].sort(compareNewestFirst)
  /** The five earlier periods' entries. */
  const earlierTxs = loading ? [] : (earlier.data ?? [])

  /** The period has no entries at all: one page-level empty state stands in for the period cards. */
  const empty = !loading && !txs.length
  /** The cards to show, in order, minus the period cards when the period is empty. */
  const cards = empty ? DASHBOARD_CARDS.filter((card) => !PERIOD_CARDS.includes(card)) : DASHBOARD_CARDS

  // Formatting. Every amount honours privacy mode.

  /** Full amounts, for values and tooltips. */
  const money = (amount: number): string => (masked ? MASKED_AMOUNT : formatMoney(amount, currency))
  /** Signed amounts: +Rs 12.00, −Rs 5.00. */
  const signedMoney = (amount: number): string =>
    masked ? MASKED_AMOUNT : formatMoney(amount, currency, 'exceptZero')
  /** Short amounts, for chart axes and captions. */
  const compactMoney = (amount: number, signDisplay: 'auto' | 'exceptZero' = 'auto'): string =>
    masked ? MASKED_AMOUNT : formatCompactMoney(amount, currency, signDisplay)
  const compactTick = (amount: number): string => compactMoney(amount)

  // Summary

  const summary = summaryOf(range, txs)
  const previousTxs = earlierTxs.filter((tx) => inRange(tx.date, previous))
  /** The change from the previous period, or null when it had no income or expense entries. */
  const change: SummaryChange | null = previousTxs.some((tx) => tx.type !== 'transfer')
    ? summaryChange(summaryOf(previous, previousTxs), summary)
    : null

  // Spending by category

  const totals = categoryTotals(txs, 'expense')
  const spent = totals.reduce((sum, t) => sum + t.amount, 0)
  const spentCount = totals.reduce((sum, t) => sum + t.count, 0)
  const keep = totals.length <= TOP_CATEGORIES + 1 ? totals.length : TOP_CATEGORIES
  const { top, other } = topAndOther(totals, keep)
  /** The top categories and "Other" (only when it would hold two or more), each with its share. */
  const spendingRows: SpendingRow[] = top.map((total) => {
    const category =
      total.categoryId !== null ? lookups.categoriesById.get(total.categoryId) : undefined
    return {
      key: total.categoryId === null ? 'none' : String(total.categoryId),
      categoryIds: total.categoryId === null ? [] : [total.categoryId],
      name: category
        ? category.name
        : total.categoryId === null
          ? 'Uncategorized'
          : 'Deleted category',
      icon: category?.icon ?? MISSING_CATEGORY_ICON,
      color: category?.color ?? null,
      amount: total.amount,
      count: total.count,
      share: shareOf(total.amount, spent),
    }
  })
  if (other) {
    spendingRows.push({
      key: OTHER,
      categoryIds: other.categoryIds,
      name: 'Other',
      icon: 'category',
      color: null,
      amount: other.amount,
      count: other.count,
      share: shareOf(other.amount, spent),
    })
  }
  const segments: DonutSegment[] = spendingRows.map((row) => ({
    key: row.key,
    label: row.name,
    value: row.amount,
    color: row.color ? dataColor(row.color) : NEUTRAL,
  }))

  // Budgets

  const digits = fractionDigits(currency)
  /** Active budgets, most used first (a zero limit counts as fully used), at most TOP_BUDGETS. */
  const budgetRows: BudgetRow[] = activeBudgets
    .map((budget) => ({
      budget,
      progress: spending.data ? budgetProgress(budget, spending.data, today, digits) : undefined,
    }))
    .sort((a, b) => usedOf(b.progress) - usedOf(a.progress))
    .slice(0, TOP_BUDGETS)
  const moreBudgets = activeBudgets.length > TOP_BUDGETS

  // Trend

  const trend = periodSummaries([...earlierTxs, ...txs], periods)
  const trendEmpty = !earlierTxs.length && !txs.length
  /** Each period as a group of income and expense bars, with its net under the label. */
  const trendGroups: BarChartGroup[] = trend.map((s) => ({
    key: s.range.start,
    label: shortPeriodLabel(s.range),
    title: formatPeriod(s.range),
    values: { income: s.income, expense: s.expense },
    caption: compactMoney(s.net, 'exceptZero'),
  }))

  // Recent

  const recent: TxRow[] = txs.slice(0, RECENT_COUNT).map((tx) => toRow(tx, lookups))

  // Upcoming

  /** Occurrences of running rules due by today or in the next seven days, soonest first. */
  const upcoming: UpcomingRow[] = (rulesQuery.data ?? [])
    .map((rule) => toRuleView(rule, lookups))
    .filter((view) => view.status === 'active')
    .flatMap((view) =>
      upcomingDates(view.rule, today, UPCOMING_DAYS).map((date) => ({
        key: `${view.id}_${date}`,
        view,
        date,
        due: date <= today && date === view.rule.nextDueDate,
      })),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.view.name.localeCompare(b.view.name))

  // Navigation. The period lives in the URL, replaced in place so Back leaves the page.

  const set = (next: DashboardSearch) => void navigate({ to: '/', search: next, replace: true })

  const setPreset = (next: DashboardPreset) => {
    // Custom starts from whatever the page showed.
    if (next === 'custom') set({ period: next, from: range.start, to: range.end })
    else set({ period: next })
  }

  const setCustom = (next: DateRange) => {
    const { start, end } = orderedRange(next.start, next.end)
    set({ period: 'custom', from: start, to: end })
  }

  /** Selects the period in the switcher, under its preset when it is one. */
  const selectPeriod = (next: DateRange) => {
    const nextPreset = dashboardPresetOf(next, today)
    if (nextPreset === 'custom') setCustom(next)
    else setPreset(nextPreset)
  }

  /** Opens the transaction list on the entries behind a figure. */
  const drillDown = (target: DrillDown) =>
    void navigate({
      to: '/transactions',
      search: transactionSearchFor(target.range, target.type, target.categoryIds),
    })

  return {
    today,
    currency,
    masked,
    togglePrivacy,
    preset,
    custom,
    range,
    periodLabel,
    loading,
    error,
    empty,
    cards,
    accounts,
    budgets,
    lookups,
    summary,
    change,
    spent,
    spentCount,
    spending: spendingRows,
    segments,
    budgetRows,
    moreBudgets,
    trend,
    trendEmpty,
    trendGroups,
    flowSeries: FLOW_SERIES,
    recent,
    upcoming,
    money,
    signedMoney,
    compactMoney,
    compactTick,
    setPreset,
    setCustom,
    selectPeriod,
    drillDown,
  }
}

/** Everything the cards read, from one `useDashboard` call on the page. */
export type Dashboard = ReturnType<typeof useDashboard>
