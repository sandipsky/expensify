/** Shortest first, as the period switcher lists them. */
export const BUDGET_PERIODS = ['weekly', 'monthly', 'yearly'] as const

export type BudgetPeriod = (typeof BUDGET_PERIODS)[number]

/** The highest threshold already alerted in the period that starts on `periodStart`. */
export interface BudgetAlert {
  /** `YYYY-MM-DD`, the first day of the period. */
  periodStart: string
  /** Percent used, e.g. 80. */
  threshold: number
}

export interface IBudget {
  id: number
  /** 1–40 characters; shown on the card. */
  name: string
  /** Limit per period, in the accounts' currency. */
  amount: number
  /** Weeks run Monday to Sunday; months and years follow the calendar. */
  period: BudgetPeriod
  /** Expense categories it counts; empty means every expense. */
  categoryIds: number[]
  /** Carry the previous period's unspent or overspent amount into this one. */
  rollover: boolean
  /** Percent-used levels that alert once per period: [80, 100], or empty for none. */
  alertThresholds: number[]
  lastAlert: BudgetAlert | null
  /** False while paused: settings kept, no progress shown, no alerts. */
  active: boolean
  createdAt: string
  updatedAt: string
}

// What the client sends when creating/updating - the server owns the id,
// the alert record, the paused flag and the timestamps.
export type IBudgetBody = Omit<IBudget, 'id' | 'lastAlert' | 'active' | 'createdAt' | 'updatedAt'>
