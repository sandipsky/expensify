import type { CategoryType } from '@/features/categories/category.types'

/** The periods a report's period select offers. */
export const REPORT_PRESETS = [
  'this_month',
  'last_month',
  'last_3_months',
  'last_6_months',
  'last_12_months',
  'this_year',
  'last_year',
  'custom',
] as const

export type ReportPreset = (typeof REPORT_PRESETS)[number]

/** How a report over time splits its range: Monday-to-Sunday weeks, calendar months or years. */
export const GRANULARITIES = ['week', 'month', 'year'] as const

export type Granularity = (typeof GRANULARITIES)[number]

/** The period part of every period report's URL. */
export interface PeriodSearch {
  period?: ReportPreset
  /** The custom range, `YYYY-MM-DD`; only read with `period=custom`. */
  from?: string
  to?: string
}

/**
 * Account and category filters travel as id lists: one id as a number, several
 * as "4,7" (see `idsParamOf`).
 */
export type IdsParam = number | string

/** `/reports/cash-flow`. */
export interface CashFlowSearch extends PeriodSearch {
  by?: Granularity
  accounts?: IdsParam
}

/** `/reports/categories`. */
export interface CategorySearch extends PeriodSearch {
  type?: CategoryType
  accounts?: IdsParam
}

/** `/reports/category-trends`. */
export interface CategoryTrendSearch extends PeriodSearch {
  type?: CategoryType
  accounts?: IdsParam
  categories?: IdsParam
}

/** `/reports/accounts`. */
export interface AccountsSearch extends PeriodSearch {
  by?: Granularity
  accounts?: IdsParam
}

/** How many finished periods the budget report looks back over. */
export const BUDGET_LOOKBACKS = [6, 12, 24] as const

export type BudgetLookback = (typeof BUDGET_LOOKBACKS)[number]

/** `/reports/budgets`. */
export interface BudgetReportSearch {
  /** One budget's periods; every budget's summary without it. */
  budget?: number
  periods?: BudgetLookback
  /** Also show periods that ended before the budget was created. */
  early?: boolean
  /** Also list paused budgets in the summary. */
  paused?: boolean
}
