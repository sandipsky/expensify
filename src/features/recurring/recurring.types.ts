import type { ITransactionBody, TxType } from '@/features/transactions/transaction.types'

export const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'] as const
export type Frequency = (typeof FREQUENCIES)[number]

/** How a rule ends. */
export const END_TYPES = ['never', 'count', 'until'] as const
export type EndType = (typeof END_TYPES)[number]

/** What happens on the due date: add the entry, or ask first. */
export const RULE_MODES = ['auto', 'confirm'] as const
export type RuleMode = (typeof RULE_MODES)[number]

/** What each entry the rule adds is written with. */
export interface RecurringTemplate {
  type: TxType
  /** Positive; `type` gives the direction. */
  amount: number
  /** Source account. */
  accountId: string
  /** Transfers only. */
  toAccountId: string | null
  /** Null for transfers. */
  categoryId: string | null
  note: string | null
}

/** The schedule part of a rule, which the date functions read. */
export interface Schedule {
  frequency: Frequency
  /** 1 or more: "every 2 weeks" is 2. */
  interval: number
  /** Weekly rules: ISO weekdays, 1 = Monday … 7 = Sunday. Empty for other frequencies. */
  weekdays: number[]
  /** Monthly rules: 1–31; 29–31 fall on the last day of shorter months. Null otherwise. */
  dayOfMonth: number | null
  /** `YYYY-MM-DD`; the first entry falls on the first schedule date on or after it. */
  startDate: string
}

/** How a rule ends. */
export interface RuleEnd {
  endType: EndType
  /** `until` rules: the last date an entry may fall on. */
  endDate: string | null
  /** `count` rules: how many entries it adds in all. */
  maxCount: number | null
}

export interface IRecurringRule extends Schedule, RuleEnd {
  id: string
  template: RecurringTemplate
  /** Entries added so far; skipped ones don't count. */
  occurrences: number
  /** The next schedule date not yet added or skipped, `YYYY-MM-DD`. */
  nextDueDate: string
  mode: RuleMode
  /** False while paused. */
  active: boolean
  createdAt: string
  updatedAt: string
}

// What a form saves when creating/updating - recurring.api.ts sets the id, the
// count of entries added, the paused flag and the timestamps. The device works
// out `nextDueDate` from the schedule.
export type IRecurringRuleBody = Omit<
  IRecurringRule,
  'id' | 'occurrences' | 'active' | 'createdAt' | 'updatedAt'
>

/** Entries to add for due dates, oldest first, starting at the rule's next due date. */
export interface OccurrencesBody {
  dates: string[]
  /** Where the rule moves on to: the first schedule date after the last one added. */
  nextDueDate: string
  /** One date only: the entry as edited before confirming, instead of the template. */
  entry?: ITransactionBody
}
