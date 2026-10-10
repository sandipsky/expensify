// Recurring rules: pure functions on `YYYY-MM-DD` strings. The rule form's
// preview, the Recurring pages and the runner that adds due entries all read
// their dates from here.
import type { ITransaction, ITransactionBody } from '@/features/transactions/transaction.types'
import { addDays, daysBetween, isoWeekday, parseYmd, toYmd } from '@/utils'
import type { Frequency, IRecurringRule, RecurringTemplate, Schedule } from './recurring.types'

/** Largest "every N" the form accepts. */
export const MAX_INTERVAL = 99
/** Most entries a `count` rule can end after. */
export const MAX_OCCURRENCES = 999
/** Most entries one catch-up write adds; the runner goes again for the rest. */
export const CATCH_UP_LIMIT = 100

function intervalOf(schedule: Pick<Schedule, 'interval'>): number {
  return Math.max(1, Math.trunc(schedule.interval) || 1)
}

/** The rule's weekdays in order; a weekly rule without any repeats on its start date's weekday. */
export function weekdaysOf(schedule: Pick<Schedule, 'weekdays' | 'startDate'>): number[] {
  const days = [...new Set(schedule.weekdays)]
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    .sort((a, b) => a - b)
  return days.length ? days : [isoWeekday(schedule.startDate)]
}

/** The rule's day of the month, 1–31; a monthly rule without one repeats on its start date's day. */
export function dayOfMonthOf(schedule: Pick<Schedule, 'dayOfMonth' | 'startDate'>): number {
  const day = schedule.dayOfMonth
  return day && day >= 1 && day <= 31 ? Math.trunc(day) : parseYmd(schedule.startDate).getDate()
}

/** Day `day` of the month, or its last day when the month is shorter. Months past 11 roll over. */
function dayInMonth(year: number, month: number, day: number): string {
  const last = new Date(year, month + 1, 0).getDate()
  return toYmd(new Date(year, month, Math.min(day, last)))
}

/**
 * The first schedule date on or after `date` (and never before the start
 * date), ignoring how the rule ends:
 * - daily: every `interval` days from the start date;
 * - weekly: the chosen weekdays, every `interval` weeks counted in
 *   Monday-to-Sunday weeks from the week that contains the start date;
 * - monthly: day `dayOfMonth` (29–31 fall on the last day of shorter
 *   months), every `interval` months counted from the start date's month;
 * - yearly: the start date's day and month every `interval` years (29
 *   February falls on the 28th in other years).
 */
export function firstOnOrAfter(schedule: Schedule, date: string): string {
  const from = date > schedule.startDate ? date : schedule.startDate
  const start = parseYmd(schedule.startDate)
  const n = intervalOf(schedule)
  switch (schedule.frequency) {
    case 'daily': {
      const steps = Math.ceil(daysBetween(schedule.startDate, from) / n)
      return addDays(schedule.startDate, steps * n)
    }
    case 'weekly':
      return firstWeekly(schedule.startDate, from, n, weekdaysOf(schedule))
    case 'yearly': {
      const at = (k: number) =>
        dayInMonth(start.getFullYear() + k * n, start.getMonth(), start.getDate())
      const k = Math.ceil((Number(from.slice(0, 4)) - start.getFullYear()) / n)
      return at(k) < from ? at(k + 1) : at(k)
    }
    case 'monthly': {
      const day = dayOfMonthOf(schedule)
      const at = (k: number) => dayInMonth(start.getFullYear(), start.getMonth() + k * n, day)
      const fromDate = parseYmd(from)
      const months =
        (fromDate.getFullYear() - start.getFullYear()) * 12 + fromDate.getMonth() - start.getMonth()
      const k = Math.ceil(months / n)
      return at(k) < from ? at(k + 1) : at(k)
    }
  }
}

function firstWeekly(startDate: string, from: string, n: number, days: readonly number[]): string {
  // Weeks are numbered from the Monday of the week the rule starts in.
  const monday = addDays(startDate, 1 - isoWeekday(startDate))
  let week = Math.floor(daysBetween(monday, from) / 7)
  let weekday = isoWeekday(from)
  for (;;) {
    const aligned = Math.ceil(week / n) * n
    if (aligned !== week) {
      week = aligned
      weekday = 1
    }
    const day = days.find((d) => d >= weekday)
    if (day !== undefined) return addDays(monday, week * 7 + day - 1)
    week += 1
    weekday = 1
  }
}

/** The first schedule date after `date`. */
export function nextAfter(schedule: Schedule, date: string): string {
  return firstOnOrAfter(schedule, addDays(date, 1))
}

/** A new rule's first entry: the first schedule date on or after its start date. */
export function firstDueDate(schedule: Schedule): string {
  return firstOnOrAfter(schedule, schedule.startDate)
}

/**
 * The next due date after the schedule was edited. Edits reach future entries
 * only, so it counts from today, or from an earlier date still waiting to be
 * confirmed so that one isn't lost.
 */
export function rescheduledDueDate(schedule: Schedule, nextDueDate: string, today: string): string {
  return firstOnOrAfter(schedule, nextDueDate < today ? nextDueDate : today)
}

/**
 * The next due date when a paused rule resumes: dates that passed while it
 * was paused are left out, and nothing already handled comes back.
 */
export function resumedDueDate(schedule: Schedule, nextDueDate: string, today: string): string {
  return firstOnOrAfter(schedule, nextDueDate > today ? nextDueDate : today)
}

/** Whether the two schedules give the same dates, so an edit leaves the next due date alone. */
export function sameSchedule(a: Schedule, b: Schedule): boolean {
  const weekdays = (s: Schedule) => (s.frequency === 'weekly' ? weekdaysOf(s).join() : '')
  const day = (s: Schedule) => (s.frequency === 'monthly' ? dayOfMonthOf(s) : null)
  return (
    a.frequency === b.frequency &&
    intervalOf(a) === intervalOf(b) &&
    a.startDate === b.startDate &&
    weekdays(a) === weekdays(b) &&
    day(a) === day(b)
  )
}

type RuleState = Schedule &
  Pick<IRecurringRule, 'endType' | 'endDate' | 'maxCount' | 'occurrences' | 'nextDueDate'>

/** Whether the rule has run its course: its count is reached or its next date is past the end date. */
export function isEnded(rule: RuleState): boolean {
  if (rule.endType === 'count') return rule.maxCount !== null && rule.occurrences >= rule.maxCount
  if (rule.endType === 'until') return !!rule.endDate && rule.nextDueDate > rule.endDate
  return false
}

/**
 * The rule's next `limit` entry dates from `nextDueDate`, stopping where it
 * ends and, when given, after `through`. A `count` rule assumes each of them
 * is added.
 */
export function pendingDates(rule: RuleState, limit: number, through?: string): string[] {
  const dates: string[] = []
  let date = rule.nextDueDate
  let count = rule.occurrences
  while (dates.length < limit) {
    if (through !== undefined && date > through) break
    if (rule.endType === 'until' && rule.endDate && date > rule.endDate) break
    if (rule.endType === 'count' && rule.maxCount !== null && count >= rule.maxCount) break
    dates.push(date)
    count += 1
    date = nextAfter(rule, date)
  }
  return dates
}

/**
 * The entries due by `today`, oldest first, including any missed while the
 * app was closed. None while the rule is paused.
 */
export function dueDates(
  rule: RuleState & Pick<IRecurringRule, 'active'>,
  today: string,
  limit = CATCH_UP_LIMIT,
): string[] {
  return rule.active ? pendingDates(rule, limit, today) : []
}

/** The entry a rule adds on `date`, as the transaction form takes it. */
export function occurrenceOf(template: RecurringTemplate, date: string): ITransactionBody {
  const transfer = template.type === 'transfer'
  return {
    type: template.type,
    amount: template.amount,
    accountId: template.accountId,
    toAccountId: transfer ? template.toAccountId : null,
    categoryId: transfer ? null : template.categoryId,
    date,
    note: template.note,
  }
}

/** A rule template from a transaction, for "Make recurring". */
export function templateOf(
  tx: Pick<ITransaction, 'type' | 'amount' | 'accountId' | 'toAccountId' | 'categoryId' | 'note'>,
): RecurringTemplate {
  const transfer = tx.type === 'transfer'
  return {
    type: tx.type,
    amount: tx.amount,
    accountId: tx.accountId,
    toAccountId: transfer ? tx.toAccountId : null,
    categoryId: transfer ? null : tx.categoryId,
    note: tx.note,
  }
}

/**
 * A schedule that repeats a transaction dated `date`: same weekday or day of
 * the month, starting one period later, so the transaction itself isn't
 * added again.
 */
export function scheduleAfter(date: string, frequency: Frequency): Schedule {
  const day = parseYmd(date)
  let next: string
  switch (frequency) {
    case 'daily':
      next = addDays(date, 1)
      break
    case 'weekly':
      next = addDays(date, 7)
      break
    case 'monthly':
      next = dayInMonth(day.getFullYear(), day.getMonth() + 1, day.getDate())
      break
    case 'yearly':
      next = dayInMonth(day.getFullYear() + 1, day.getMonth(), day.getDate())
      break
  }
  return {
    frequency,
    interval: 1,
    weekdays: frequency === 'weekly' ? [isoWeekday(date)] : [],
    dayOfMonth: frequency === 'monthly' ? day.getDate() : null,
    startDate: next,
  }
}
