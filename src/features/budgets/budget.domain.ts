// Budget rules: pure functions on plain amounts and `YYYY-MM-DD` strings. The
// budgets screens and the alerts get their figures from here, and later the
// dashboard.
import type { ITransaction } from '@/features/transactions/transaction.types'
import {
  type DateRange,
  daysIn,
  inRange,
  localDate,
  monthPeriod,
  weekPeriod,
  yearPeriod,
} from '@/utils'
import type { BudgetPeriod, IBudget } from './budget.types'

/** Longest budget name. */
export const MAX_BUDGET_NAME = 40

/** Percent used from which a budget is in the warning state. */
export const WARNING_PERCENT = 80
/** Percent used from which a budget is over. */
export const OVER_PERCENT = 100

/** `alertThresholds` for a budget with alerts on. */
export const DEFAULT_ALERT_THRESHOLDS: readonly number[] = [WARNING_PERCENT, OVER_PERCENT]

/** How many past periods a budget's page shows: two months of weeks, half a year of months. */
export const HISTORY_PERIODS: Readonly<Record<BudgetPeriod, number>> = {
  weekly: 8,
  monthly: 6,
  yearly: 2,
}

/** Budget state from % used. */
export type BudgetState = 'on_track' | 'warning' | 'over'

/**
 * An amount in thousandths, as a whole number. Every currency fits (KWD has
 * three decimals), and sums and thresholds compared this way never meet float
 * rounding: 0.1 + 0.2 stays 0.3.
 */
const milli = (amount: number) => Math.round(amount * 1000)

/**
 * The budget's period that contains `today`, or the one `offset` periods away:
 * a Monday-to-Sunday week, a calendar month or a calendar year.
 */
export function budgetPeriodRange(period: BudgetPeriod, today: string, offset = 0): DateRange {
  switch (period) {
    case 'weekly':
      return weekPeriod(today, offset)
    case 'yearly':
      return yearPeriod(today, offset)
    case 'monthly':
      return monthPeriod(today, offset)
  }
}

/**
 * Whether a transaction counts toward the budget: expenses only, never
 * income or transfers. A budget with categories counts those; one without
 * counts every expense.
 */
export function countsToward(
  budget: Pick<IBudget, 'categoryIds'>,
  tx: Pick<ITransaction, 'type' | 'categoryId'>,
): boolean {
  if (tx.type !== 'expense') return false
  if (!budget.categoryIds.length) return true
  return tx.categoryId !== null && budget.categoryIds.includes(tx.categoryId)
}

/** The budget's spending in the range. `txs` may cover more than the range. */
export function budgetSpent(
  budget: Pick<IBudget, 'categoryIds'>,
  txs: readonly Pick<ITransaction, 'type' | 'amount' | 'categoryId' | 'date'>[],
  range: DateRange,
): number {
  let spent = 0
  for (const tx of txs) {
    if (inRange(tx.date, range) && countsToward(budget, tx)) spent += milli(tx.amount)
  }
  return spent / 1000
}

/**
 * Whether `spent` has reached `percent` of `limit`, compared in whole numbers
 * so rounding can never move a budget across a threshold. A zero limit has
 * reached every threshold: there's nothing left to spend.
 */
export function hasReached(spent: number, limit: number, percent: number): boolean {
  return milli(spent) * 100 >= percent * milli(limit)
}

/** On track under 80% used, warning from 80%, over from 100%. */
export function budgetState(spent: number, limit: number): BudgetState {
  if (hasReached(spent, limit, OVER_PERCENT)) return 'over'
  if (hasReached(spent, limit, WARNING_PERCENT)) return 'warning'
  return 'on_track'
}

/**
 * Whole percent used, for display. Rounded down, so the figure never
 * contradicts the state: 79.6% reads 79%, on track. Null for a zero limit,
 * shown as "—".
 */
export function percentUsed(spent: number, limit: number): number | null {
  return limit > 0 ? Math.floor((milli(spent) * 100) / milli(limit)) : null
}

/** Days left in the range from `today`, both included; all of it before it starts, 0 once it's over. */
export function daysLeft(range: DateRange, today: string): number {
  if (today > range.end) return 0
  if (today < range.start) return daysIn(range)
  return daysIn({ start: today, end: range.end })
}

/**
 * Remaining ÷ days left, rounded down to the currency's smallest unit
 * (`digits` decimals), so spending it every day stays within the limit.
 * 0 when nothing is left.
 */
export function safePerDay(remaining: number, days: number, digits = 2): number {
  if (remaining <= 0 || days <= 0) return 0
  const unit = 10 ** digits
  return Math.floor((milli(remaining) * unit) / (1000 * days)) / unit
}

/** The local date the budget was created. */
export function createdDate(budget: Pick<IBudget, 'createdAt'>): string {
  return localDate(new Date(budget.createdAt))
}

/**
 * What rolls into a period from the one before it: the plain `amount` minus
 * what that period spent, so unspent money adds to the limit and overspending
 * takes from it. It reaches back one period only, and nothing rolls in from a
 * period that ended before the budget was created.
 */
export function carryOver(
  budget: Pick<IBudget, 'amount' | 'rollover' | 'createdAt'>,
  previous: { range: DateRange; spent: number },
): number {
  if (!budget.rollover || createdDate(budget) > previous.range.end) return 0
  return (milli(budget.amount) - milli(previous.spent)) / 1000
}

/** A budget's figures for one period. */
export interface BudgetResult {
  range: DateRange
  spent: number
  /** `amount` plus what rolled in, never below 0. */
  limit: number
  /** What rolled in from the previous period: negative after overspending, 0 without rollover. */
  carry: number
  /** Limit − spent; negative when over. */
  remaining: number
  /** Whole percent used, rounded down; null for a zero limit. */
  percent: number | null
  state: BudgetState
}

/** The current period's figures, with what's safe to spend each day. */
export interface BudgetProgress extends BudgetResult {
  daysLeft: number
  safePerDay: number
}

/** A past period's figures. */
export interface BudgetHistoryEntry extends BudgetResult {
  /** The period ended before the budget was created: shown for comparison only. */
  beforeBudget: boolean
}

type BudgetRules = Pick<IBudget, 'amount' | 'period' | 'categoryIds' | 'rollover' | 'createdAt'>
type SpendingTx = Pick<ITransaction, 'type' | 'amount' | 'categoryId' | 'date'>

/**
 * The budget's figures for the period `offset` periods from the current one.
 * `txs` must cover that period and, with rollover, the one before it
 * (`neededRange`).
 */
export function budgetResult(
  budget: BudgetRules,
  txs: readonly SpendingTx[],
  today: string,
  offset = 0,
): BudgetResult {
  const range = budgetPeriodRange(budget.period, today, offset)
  const spent = budgetSpent(budget, txs, range)
  let carry = 0
  if (budget.rollover) {
    const previous = budgetPeriodRange(budget.period, today, offset - 1)
    carry = carryOver(budget, { range: previous, spent: budgetSpent(budget, txs, previous) })
  }
  const limit = Math.max(0, (milli(budget.amount) + milli(carry)) / 1000)
  return {
    range,
    spent,
    limit,
    carry,
    remaining: (milli(limit) - milli(spent)) / 1000,
    percent: percentUsed(spent, limit),
    state: budgetState(spent, limit),
  }
}

/** The current period's figures and what's safe to spend per day, in a currency with `digits` decimals. */
export function budgetProgress(
  budget: BudgetRules,
  txs: readonly SpendingTx[],
  today: string,
  digits = 2,
): BudgetProgress {
  const result = budgetResult(budget, txs, today)
  const days = daysLeft(result.range, today)
  return { ...result, daysLeft: days, safePerDay: safePerDay(result.remaining, days, digits) }
}

/**
 * The `count` periods before the current one, newest first. `txs` must cover
 * `neededRange(budget, today, count)`. Periods that ended before the budget
 * was created are marked, since it didn't apply then.
 */
export function budgetHistory(
  budget: BudgetRules,
  txs: readonly SpendingTx[],
  today: string,
  count: number,
): BudgetHistoryEntry[] {
  const created = createdDate(budget)
  const entries: BudgetHistoryEntry[] = []
  for (let offset = -1; offset >= -count; offset--) {
    const result = budgetResult(budget, txs, today, offset)
    entries.push({ ...result, beforeBudget: result.range.end < created })
  }
  return entries
}

/**
 * The dates the budget's figures read: the current period back `periodsBack`
 * more periods, plus the one before those when it rolls over.
 */
export function neededRange(
  budget: Pick<IBudget, 'period' | 'rollover'>,
  today: string,
  periodsBack = 0,
): DateRange {
  const back = periodsBack + (budget.rollover ? 1 : 0)
  return {
    start: budgetPeriodRange(budget.period, today, -back).start,
    end: budgetPeriodRange(budget.period, today).end,
  }
}

/**
 * The highest alert threshold the period has newly reached, or null.
 * `lastAlert` holds the highest one already shown for a period, so each
 * threshold alerts once per period and a jump past both shows only the
 * higher. Paused budgets never alert.
 */
export function alertDue(
  budget: Pick<IBudget, 'active' | 'alertThresholds' | 'lastAlert'>,
  result: Pick<BudgetResult, 'range' | 'spent' | 'limit'>,
): number | null {
  if (!budget.active) return null
  const last = budget.lastAlert
  const sent = last && last.periodStart === result.range.start ? last.threshold : 0
  let due: number | null = null
  for (const threshold of budget.alertThresholds) {
    if (threshold > sent && hasReached(result.spent, result.limit, threshold)) {
      due = Math.max(due ?? threshold, threshold)
    }
  }
  return due
}

/** Budgets for every expense first, then by name. */
export function compareBudgets(
  a: Pick<IBudget, 'name' | 'categoryIds'>,
  b: Pick<IBudget, 'name' | 'categoryIds'>,
): number {
  const allA = a.categoryIds.length ? 1 : 0
  const allB = b.categoryIds.length ? 1 : 0
  return allA - allB || a.name.localeCompare(b.name)
}
