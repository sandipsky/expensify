import type { ChipVariant, LUIIconName } from '@lumen-ui/react'
import type { ProgressVariant } from '@/components/progress'
import type { ICategory } from '@/features/categories/category.types'
import { MAX_BUDGET_NAME, type BudgetState } from './budget.domain'
import { BUDGET_PERIODS, type BudgetPeriod, type IBudget } from './budget.types'

export const BUDGET_PERIOD_LABELS: Readonly<Record<BudgetPeriod, string>> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

/** Items for the period segmented control. */
export const BUDGET_PERIOD_OPTIONS = BUDGET_PERIODS.map((value) => ({
  value,
  label: BUDGET_PERIOD_LABELS[value],
}))

/** "a week", for "Rs 500.00 a week". */
export const PER_PERIOD: Readonly<Record<BudgetPeriod, string>> = {
  weekly: 'a week',
  monthly: 'a month',
  yearly: 'a year',
}

/** How the previous period is named where rollover mentions it. */
export const PREVIOUS_PERIOD: Readonly<Record<BudgetPeriod, string>> = {
  weekly: 'last week',
  monthly: 'last month',
  yearly: 'last year',
}

/** How a state reads: a label and an icon alongside the color, never color alone. */
export interface StateView {
  label: string
  icon: LUIIconName
  chip: ChipVariant
  progress: ProgressVariant
}

export const BUDGET_STATES: Readonly<Record<BudgetState, StateView>> = {
  on_track: { label: 'On track', icon: 'like', chip: 'success', progress: 'success' },
  warning: { label: 'Warning', icon: 'warning', chip: 'warn', progress: 'warn' },
  over: { label: 'Over', icon: 'error', chip: 'error', progress: 'error' },
}

/** "5 days left", "Last day", "Ended". */
export function daysLeftLabel(days: number): string {
  if (days <= 0) return 'Ended'
  return days === 1 ? 'Last day' : `${days} days left`
}

/** "86%", or "—" for a zero limit. */
export function percentLabel(percent: number | null): string {
  return percent === null ? '—' : `${percent}%`
}

/**
 * A name for a new budget from its categories, until the user types one:
 * "All expenses", "Food and dining", "Food and dining & Transport",
 * "Food and dining & 2 more".
 */
export function suggestBudgetName(names: readonly string[]): string {
  const [first, second] = names
  const name = !first
    ? 'All expenses'
    : names.length === 1
      ? first
      : names.length === 2
        ? `${first} & ${second}`
        : `${first} & ${names.length - 1} more`
  return name.slice(0, MAX_BUDGET_NAME)
}

/** What a budget over every expense, or over several categories, draws. */
const BUDGET_ICON = { icon: 'donut_large' as LUIIconName, color: 'var(--accent)' }

/** A single-category budget wears its category's icon; others a generic one. */
export function iconOf(
  budget: Pick<IBudget, 'categoryIds'>,
  categoriesById: ReadonlyMap<string, ICategory>,
): { icon: LUIIconName; color: string } {
  const only = budget.categoryIds.length === 1 ? categoriesById.get(budget.categoryIds[0]) : null
  return only ? { icon: only.icon, color: only.color } : BUDGET_ICON
}

/** What the budget counts: "All expenses", or its categories as "Food and dining, Transport". */
export function scopeOf(
  budget: Pick<IBudget, 'categoryIds'>,
  categoriesById: ReadonlyMap<string, ICategory>,
): string {
  if (!budget.categoryIds.length) return 'All expenses'
  const names = budget.categoryIds
    .map((id) => categoriesById.get(id)?.name)
    .filter((name): name is string => !!name)
  return names.length ? names.join(', ') : 'Deleted categories'
}
