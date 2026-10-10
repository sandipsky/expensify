// Report figures: pure functions on plain amounts and `YYYY-MM-DD` strings.
// Income and expense totals share the dashboard's rules (transfers never
// count); budget periods come from the budget rules; balances are worked back
// from each account's current balance, as the server keeps it.
import type { IAccount } from '@/features/accounts/account.types'
import {
  budgetPeriodRange,
  budgetResult,
  createdDate,
  type BudgetResult,
} from '@/features/budgets/budget.domain'
import type { IBudget } from '@/features/budgets/budget.types'
import type { CategoryType } from '@/features/categories/category.types'
import {
  type Change,
  type PeriodSummary,
  categoryTotals,
  changeOf,
  shareOf,
} from '@/features/dashboard/dashboard.domain'
import type { ITransaction } from '@/features/transactions/transaction.types'
import {
  type DateRange,
  addDays,
  inRange,
  isCalendarMonth,
  isCalendarYear,
  monthPeriod,
  orderedRange,
  previousRanges,
  weekPeriod,
  yearPeriod,
} from '@/utils'
import type { Granularity, ReportPreset } from './report.types'

/** The most months the category trends table spans; a longer range keeps its last 24. */
export const MAX_TREND_MONTHS = 24

type ReportTx = Pick<ITransaction, 'type' | 'amount' | 'categoryId' | 'date'>
type BalanceTx = Pick<ITransaction, 'type' | 'amount' | 'accountId' | 'toAccountId' | 'date'>

/**
 * Amounts in thousandths, as whole numbers, so long sums never pick up float
 * noise (0.1 + 0.2 stays 0.3). Every currency fits; KWD has three decimals.
 */
const milli = (amount: number) => Math.round(amount * 1000)
const fromMilli = (value: number) => value / 1000

/** The sum of the amounts, without float noise. */
export function sumOf(amounts: readonly number[]): number {
  return fromMilli(amounts.reduce((sum, amount) => sum + milli(amount), 0))
}

// Periods

/** `count` calendar months ending with the one that contains `today`. */
function lastMonths(today: string, count: number): DateRange {
  return { start: monthPeriod(today, -(count - 1)).start, end: monthPeriod(today).end }
}

/** The range a preset stands for on `today`; `custom` returns the given range, in order. */
export function reportRange(preset: ReportPreset, today: string, custom: DateRange): DateRange {
  switch (preset) {
    case 'this_month':
      return monthPeriod(today)
    case 'last_month':
      return monthPeriod(today, -1)
    case 'last_3_months':
      return lastMonths(today, 3)
    case 'last_6_months':
      return lastMonths(today, 6)
    case 'last_12_months':
      return lastMonths(today, 12)
    case 'this_year':
      return yearPeriod(today)
    case 'last_year':
      return yearPeriod(today, -1)
    case 'custom':
      return orderedRange(custom.start, custom.end)
  }
}

/** The selected preset and range of a report, from its URL. */
export interface PeriodState {
  preset: ReportPreset
  /** What "Custom" shows: the URL's range, or the default preset's until one is picked. */
  custom: DateRange
  range: DateRange
}

export function periodState(
  search: { period?: ReportPreset; from?: string; to?: string },
  fallback: ReportPreset,
  today: string,
): PeriodState {
  const preset = search.period ?? fallback
  const custom =
    search.from && search.to
      ? orderedRange(search.from, search.to)
      : reportRange(fallback, today, monthPeriod(today))
  return { preset, custom, range: reportRange(preset, today, custom) }
}

/** How many whole calendar months the range covers, or null when it starts or ends mid-month. */
export function wholeMonths(range: DateRange): number | null {
  if (!range.start.endsWith('-01') || monthPeriod(range.end).end !== range.end) return null
  const [y0, m0] = range.start.split('-').map(Number)
  const [y1, m1] = range.end.split('-').map(Number)
  return (y1 - y0) * 12 + (m1 - m0) + 1
}

/**
 * The period a range is compared with: the month, year or run of whole months
 * before it, or the same number of days before any other range.
 */
export function previousRange(range: DateRange): DateRange {
  if (isCalendarYear(range)) return yearPeriod(range.start, -1)
  if (isCalendarMonth(range)) return monthPeriod(range.start, -1)
  const months = wholeMonths(range)
  if (months !== null) {
    return { start: monthPeriod(range.start, -months).start, end: addDays(range.start, -1) }
  }
  return previousRanges(range, 1)[0]
}

/**
 * The range split into weeks (Monday to Sunday), calendar months or calendar
 * years, oldest first. The first and last pieces are cut to the range, so a
 * range starting mid-month starts with part of that month.
 */
export function bucketsOf(range: DateRange, by: Granularity): DateRange[] {
  const buckets: DateRange[] = []
  for (let start = range.start; start <= range.end; ) {
    const whole =
      by === 'week' ? weekPeriod(start) : by === 'month' ? monthPeriod(start) : yearPeriod(start)
    const end = whole.end < range.end ? whole.end : range.end
    buckets.push({ start, end })
    start = addDays(end, 1)
  }
  return buckets
}

/** The range cut to its last `MAX_TREND_MONTHS` months, and whether it was cut. */
export function trendRange(range: DateRange): { range: DateRange; clipped: boolean } {
  const months = bucketsOf(range, 'month')
  if (months.length <= MAX_TREND_MONTHS) return { range, clipped: false }
  return {
    range: { start: months[months.length - MAX_TREND_MONTHS].start, end: range.end },
    clipped: true,
  }
}

/** Index of the bucket a date falls in, or -1. Buckets are in order and don't overlap. */
function bucketIndex(buckets: readonly DateRange[], date: string): number {
  let lo = 0
  let hi = buckets.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (date < buckets[mid].start) hi = mid - 1
    else if (date > buckets[mid].end) lo = mid + 1
    else return mid
  }
  return -1
}

/** Entries on any of the accounts, on either side of a transfer; all of them with none given. */
export function onAccounts<T extends Pick<ITransaction, 'accountId' | 'toAccountId'>>(
  txs: readonly T[],
  accountIds: readonly number[],
): T[] {
  if (!accountIds.length) return [...txs]
  const ids = new Set(accountIds)
  return txs.filter(
    (tx) => ids.has(tx.accountId) || (tx.toAccountId !== null && ids.has(tx.toAccountId)),
  )
}

// Cash flow

/** One period of the cash flow: the dashboard's summary plus how many entries it has. */
export interface FlowRow extends PeriodSummary {
  count: number
  /** Net of this period and every one before it in the report. */
  cumulative: number
}

/** Income, expense, net and savings rate per bucket, oldest first. */
export function cashFlow(txs: readonly ReportTx[], buckets: readonly DateRange[]): FlowRow[] {
  const income = buckets.map(() => 0)
  const expense = buckets.map(() => 0)
  const count = buckets.map(() => 0)
  for (const tx of txs) {
    if (tx.type === 'transfer') continue
    const i = bucketIndex(buckets, tx.date)
    if (i < 0) continue
    if (tx.type === 'income') income[i] += milli(tx.amount)
    else expense[i] += milli(tx.amount)
    count[i] += 1
  }
  let cumulative = 0
  return buckets.map((range, i) => {
    const net = income[i] - expense[i]
    cumulative += net
    return {
      range,
      income: fromMilli(income[i]),
      expense: fromMilli(expense[i]),
      net: fromMilli(net),
      savingsRate: income[i] > 0 ? Math.round((net * 100) / income[i]) : null,
      count: count[i],
      cumulative: fromMilli(cumulative),
    }
  })
}

// Categories

/** One category's figures in a period and the one before it. */
export interface CategoryRow {
  /** Null for entries without a category. */
  categoryId: number | null
  amount: number
  count: number
  /** Whole percent of the period's total; null when the total is zero. */
  share: number | null
  /** Amount per entry; 0 without entries. */
  average: number
  previous: number
  previousCount: number
  /** From the previous period to this one. */
  change: Change
}

/**
 * Every category of the type with an amount in either period, largest first;
 * a category the previous period had and this one doesn't comes last with 0.
 */
export function categoryComparison(
  current: readonly ReportTx[],
  previous: readonly ReportTx[],
  type: CategoryType,
): CategoryRow[] {
  const now = categoryTotals(current, type)
  const before = new Map(categoryTotals(previous, type).map((t) => [t.categoryId, t]))
  const total = sumOf(now.map((t) => t.amount))
  const rows: CategoryRow[] = now.map((t) => {
    const prev = before.get(t.categoryId)
    before.delete(t.categoryId)
    return {
      categoryId: t.categoryId,
      amount: t.amount,
      count: t.count,
      share: shareOf(t.amount, total),
      average: t.count ? t.amount / t.count : 0,
      previous: prev?.amount ?? 0,
      previousCount: prev?.count ?? 0,
      change: changeOf(prev?.amount ?? 0, t.amount),
    }
  })
  for (const prev of before.values()) {
    rows.push({
      categoryId: prev.categoryId,
      amount: 0,
      count: 0,
      share: shareOf(0, total),
      average: 0,
      previous: prev.amount,
      previousCount: prev.count,
      change: changeOf(prev.amount, 0),
    })
  }
  return rows
}

/** One category across the months of the trends table. */
export interface MatrixRow {
  categoryId: number | null
  /** One amount per month, oldest first. */
  cells: number[]
  total: number
  /** Total ÷ months. */
  average: number
}

export interface CategoryMatrix {
  rows: MatrixRow[]
  /** Every category's amount per month. */
  columnTotals: number[]
  total: number
}

/**
 * The type's amounts per category and month, largest total first; ties by id,
 * so rows never reorder between renders. Only categories with an amount show.
 */
export function categoryMatrix(
  txs: readonly ReportTx[],
  type: CategoryType,
  months: readonly DateRange[],
): CategoryMatrix {
  const byCategory = new Map<number | null, number[]>()
  const columns = months.map(() => 0)
  for (const tx of txs) {
    if (tx.type !== type) continue
    const i = bucketIndex(months, tx.date)
    if (i < 0) continue
    let cells = byCategory.get(tx.categoryId)
    if (!cells) {
      cells = months.map(() => 0)
      byCategory.set(tx.categoryId, cells)
    }
    cells[i] += milli(tx.amount)
    columns[i] += milli(tx.amount)
  }
  const rows = [...byCategory.entries()]
    .map(([categoryId, cells]) => {
      const total = cells.reduce((sum, cell) => sum + cell, 0)
      return {
        categoryId,
        cells: cells.map(fromMilli),
        total: fromMilli(total),
        average: months.length ? fromMilli(total) / months.length : 0,
      }
    })
    .sort((a, b) => b.total - a.total || (a.categoryId ?? -1) - (b.categoryId ?? -1))
  return {
    rows,
    columnTotals: columns.map(fromMilli),
    total: fromMilli(columns.reduce((sum, cell) => sum + cell, 0)),
  }
}

// Accounts

/** How an entry moves an account's balance: in for income and transfers in, out otherwise. */
export function balanceDelta(tx: Omit<BalanceTx, 'date'>, accountId: number): number {
  if (tx.type === 'income') return tx.accountId === accountId ? tx.amount : 0
  if (tx.type === 'expense') return tx.accountId === accountId ? -tx.amount : 0
  let delta = 0
  if (tx.accountId === accountId) delta -= tx.amount
  if (tx.toAccountId === accountId) delta += tx.amount
  return delta
}

/**
 * The account's balance at the end of `date`: its current balance less every
 * entry dated after it. `txs` must hold every entry after `date`, future-dated
 * ones too, since they already count in the current balance.
 */
export function balanceAt(
  account: Pick<IAccount, 'id' | 'currentBalance'>,
  txs: readonly BalanceTx[],
  date: string,
): number {
  let later = 0
  for (const tx of txs) {
    if (tx.date > date) later += milli(balanceDelta(tx, account.id))
  }
  return fromMilli(milli(account.currentBalance) - later)
}

/** One account's movement over the period. */
export interface AccountStatement {
  accountId: number
  /** The balance at the end of the day before the period. */
  opening: number
  income: number
  expense: number
  transfersIn: number
  transfersOut: number
  /** The balance at the end of the period's last day. */
  closing: number
  /** Closing − opening. */
  change: number
}

/**
 * Opening balance, money in and out, and closing balance per account.
 * `txs` must hold every entry from the period's start on, future ones too.
 */
export function accountStatements(
  accounts: readonly Pick<IAccount, 'id' | 'currentBalance'>[],
  txs: readonly BalanceTx[],
  range: DateRange,
): AccountStatement[] {
  return accounts.map((account) => {
    let income = 0
    let expense = 0
    let transfersIn = 0
    let transfersOut = 0
    for (const tx of txs) {
      if (!inRange(tx.date, range)) continue
      const amount = milli(tx.amount)
      if (tx.type === 'income' && tx.accountId === account.id) income += amount
      else if (tx.type === 'expense' && tx.accountId === account.id) expense += amount
      else if (tx.type === 'transfer') {
        // A transfer from an account to itself moves nothing, so it counts both ways.
        if (tx.accountId === account.id) transfersOut += amount
        if (tx.toAccountId === account.id) transfersIn += amount
      }
    }
    const closing = balanceAt(account, txs, range.end)
    const change = income - expense + transfersIn - transfersOut
    return {
      accountId: account.id,
      opening: fromMilli(milli(closing) - change),
      income: fromMilli(income),
      expense: fromMilli(expense),
      transfersIn: fromMilli(transfersIn),
      transfersOut: fromMilli(transfersOut),
      closing,
      change: fromMilli(change),
    }
  })
}

/** What the accounts held at the end of a period. */
export interface NetWorthPoint {
  range: DateRange
  /** Balances above zero, whatever the account type. */
  assets: number
  /** Balances below zero (cards and loans owed, overdrafts), as a positive amount. */
  liabilities: number
  /** Assets − liabilities: every balance added up. */
  netWorth: number
  /** From the end of the period before. */
  change: number
}

/** Assets, liabilities and net worth of balances. */
function worth(balances: readonly number[]): Pick<NetWorthPoint, 'assets' | 'liabilities' | 'netWorth'> {
  let assets = 0
  let liabilities = 0
  for (const balance of balances) {
    if (balance > 0) assets += milli(balance)
    else liabilities -= milli(balance)
  }
  return {
    assets: fromMilli(assets),
    liabilities: fromMilli(liabilities),
    netWorth: fromMilli(assets - liabilities),
  }
}

/**
 * Net worth at the end of each bucket, oldest first, and at the end of the
 * day before the first one. `txs` must hold every entry from the first
 * bucket's start on, future ones too.
 */
export function netWorthSeries(
  accounts: readonly Pick<IAccount, 'id' | 'currentBalance'>[],
  txs: readonly BalanceTx[],
  buckets: readonly DateRange[],
): { opening: number; points: NetWorthPoint[] } {
  const at = (date: string) => worth(accounts.map((a) => balanceAt(a, txs, date)))
  const opening = buckets.length ? at(addDays(buckets[0].start, -1)).netWorth : 0
  let before = opening
  const points = buckets.map((range) => {
    const point = at(range.end)
    const change = fromMilli(milli(point.netWorth) - milli(before))
    before = point.netWorth
    return { range, ...point, change }
  })
  return { opening, points }
}

// Budgets

/** One period of a budget in the report. */
export interface BudgetPeriodRow extends BudgetResult {
  /** 0 for the current period, −1 for the one before, … */
  offset: number
  /** The period ended before the budget was created. */
  beforeBudget: boolean
  /** Still running, so it doesn't count toward the hit rate yet. */
  current: boolean
}

/**
 * The current period and the `count` before it, newest first. Periods that
 * ended before the budget was created are left out unless `early` is set.
 * `txs` must cover `neededRange(budget, today, count)`.
 */
export function budgetPeriods(
  budget: Pick<IBudget, 'amount' | 'period' | 'categoryIds' | 'rollover' | 'createdAt'>,
  txs: readonly ReportTx[],
  today: string,
  count: number,
  early: boolean,
): BudgetPeriodRow[] {
  const created = createdDate(budget)
  const rows: BudgetPeriodRow[] = []
  for (let offset = 0; offset >= -count; offset--) {
    const range = budgetPeriodRange(budget.period, today, offset)
    const beforeBudget = range.end < created
    if (beforeBudget && !early) continue
    rows.push({ ...budgetResult(budget, txs, today, offset), offset, beforeBudget, current: offset === 0 })
  }
  return rows
}

/** How a budget did over its finished periods since it was created. */
export interface BudgetStats {
  /** Finished periods since the budget was created. */
  tracked: number
  /** Of those, the ones that stayed within the limit. */
  under: number
  over: number
  /** Whole percent of tracked periods under the limit; null with none tracked. */
  hitRate: number | null
  averageSpent: number | null
  /**
   * What they spent as a share of their limits added up, whole percent rounded
   * down; null when there's no limit to take a share of. Unlike a mean of each
   * period's percent, one period whose limit rollover shrank can't skew it.
   */
  usedPercent: number | null
  /** What the over periods spent past their limits. */
  overspent: number
}

export function budgetStats(rows: readonly BudgetPeriodRow[]): BudgetStats {
  const finished = rows.filter((row) => !row.current && !row.beforeBudget)
  const over = finished.filter((row) => row.state === 'over')
  const spent = sumOf(finished.map((row) => row.spent))
  const limits = sumOf(finished.map((row) => row.limit))
  return {
    tracked: finished.length,
    under: finished.length - over.length,
    over: over.length,
    hitRate: finished.length
      ? Math.round(((finished.length - over.length) * 100) / finished.length)
      : null,
    averageSpent: finished.length ? spent / finished.length : null,
    usedPercent: limits > 0 ? Math.floor((spent * 100) / limits) : null,
    overspent: sumOf(over.map((row) => -row.remaining)),
  }
}
