// The URL search params of each report page. Every parser returns every key,
// as `undefined` when malformed: the router merges the layout route's raw
// search underneath, so a key left out would let the raw value through.
import { CATEGORY_TYPES, type CategoryType } from '@/features/categories/category.types'
import { idsOf, parseIdsParam } from '@/features/transactions/transaction.search'
import { isYmd } from '@/utils'
import {
  BUDGET_LOOKBACKS,
  GRANULARITIES,
  REPORT_PRESETS,
  type AccountsSearch,
  type BudgetLookback,
  type BudgetReportSearch,
  type CashFlowSearch,
  type CategorySearch,
  type CategoryTrendSearch,
  type Granularity,
  type PeriodSearch,
  type ReportPreset,
} from './report.types'

type Raw = Record<string, unknown>

function oneOf<T>(values: readonly T[], value: unknown): T | undefined {
  return values.includes(value as T) ? (value as T) : undefined
}

export function parsePeriodSearch(search: Raw): PeriodSearch {
  const [from, to] =
    isYmd(search.from) && isYmd(search.to) ? [search.from, search.to] : [undefined, undefined]
  return { period: oneOf<ReportPreset>(REPORT_PRESETS, search.period), from, to }
}

const parseType = (value: unknown) => oneOf<CategoryType>(CATEGORY_TYPES, value)
const parseBy = (value: unknown) => oneOf<Granularity>(GRANULARITIES, value)

/** A flag written as `true`; anything else reads as unset. */
const parseFlag = (value: unknown) => (value === true || value === 'true' ? true : undefined)

export function parseCashFlowSearch(search: Raw): CashFlowSearch {
  return {
    ...parsePeriodSearch(search),
    by: parseBy(search.by),
    accounts: parseIdsParam(search.accounts),
  }
}

export function parseCategorySearch(search: Raw): CategorySearch {
  return {
    ...parsePeriodSearch(search),
    type: parseType(search.type),
    accounts: parseIdsParam(search.accounts),
  }
}

export function parseCategoryTrendSearch(search: Raw): CategoryTrendSearch {
  return {
    ...parsePeriodSearch(search),
    type: parseType(search.type),
    accounts: parseIdsParam(search.accounts),
    categories: parseIdsParam(search.categories),
  }
}

export function parseAccountsSearch(search: Raw): AccountsSearch {
  return {
    ...parsePeriodSearch(search),
    by: parseBy(search.by),
    accounts: parseIdsParam(search.accounts),
  }
}

export function parseBudgetReportSearch(search: Raw): BudgetReportSearch {
  const [budget, ...others] = idsOf(parseIdsParam(search.budget))
  return {
    budget: others.length ? undefined : budget,
    periods: oneOf<BudgetLookback>(BUDGET_LOOKBACKS, search.periods),
    early: parseFlag(search.early),
    paused: parseFlag(search.paused),
  }
}
