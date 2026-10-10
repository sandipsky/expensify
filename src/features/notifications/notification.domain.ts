// When reminders fall due, as pure functions on local `YYYY-MM-DD` dates and
// `HH:mm` times. The app shows them while it's open, in this tab or another.
import { dueDates, isEnded, pendingDates } from '@/features/recurring/recurring.domain'
import type { IRecurringRule } from '@/features/recurring/recurring.types'
import { addDays } from '@/utils'

/** A 24-hour local time of day, `HH:mm`. */
const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/

export function isTimeOfDay(value: unknown): value is string {
  return typeof value === 'string' && TIME_OF_DAY.test(value)
}

/**
 * Milliseconds from `now` until `time` on now's local date: positive while it's
 * still ahead, 0 or less once it has passed.
 */
export function msUntilTime(time: string, now: Date): number {
  const [hours, minutes] = time.split(':').map(Number)
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)
  return at.getTime() - now.getTime()
}

export interface DailyReminderState {
  enabled: boolean
  /** The reminder time, `HH:mm`. */
  time: string
  now: Date
  /** Local date of `now`. */
  today: string
  /** Whether anything is logged for today already. */
  loggedToday: boolean
  /** The last date the reminder was shown, if ever. */
  lastShown: string | null
}

/**
 * Whether the daily reminder to log spending is due: it's on, today's
 * reminder time has come, nothing is logged for today yet, and it hasn't
 * been shown today. Once a day at most.
 */
export function dailyReminderDue(state: DailyReminderState): boolean {
  return (
    state.enabled &&
    isTimeOfDay(state.time) &&
    msUntilTime(state.time, state.now) <= 0 &&
    !state.loggedToday &&
    state.lastShown !== state.today
  )
}

/**
 * `upcoming`: an entry is due tomorrow. `due`: entries are due and wait for
 * Confirm or Skip.
 */
export type BillReminderKind = 'upcoming' | 'due'

export interface BillReminder {
  ruleId: string
  kind: BillReminderKind
  /** The entry's date: tomorrow's for `upcoming`, the latest waiting one for `due`. */
  date: string
  /** How many entries wait; 1 for `upcoming`. */
  count: number
}

/**
 * The reminder an ask-first rule has now: `due` once entries wait for Confirm
 * or Skip, else `upcoming` when the next one is due tomorrow. Automatic,
 * paused and ended rules get none. A catch-up of several missed dates is one
 * reminder, named after the latest of them.
 */
export function billReminder(rule: IRecurringRule, today: string): BillReminder | null {
  if (rule.mode !== 'confirm' || !rule.active || isEnded(rule)) return null
  const due = dueDates(rule, today)
  if (due.length) {
    return { ruleId: rule.id, kind: 'due', date: due[due.length - 1], count: due.length }
  }
  const tomorrow = addDays(today, 1)
  const [next] = pendingDates(rule, 1, tomorrow)
  return next === tomorrow ? { ruleId: rule.id, kind: 'upcoming', date: next, count: 1 } : null
}

/** Names a reminder so each is shown once: per rule, kind and date. Ends in the date. */
export function billReminderKey(reminder: BillReminder): string {
  return `${reminder.ruleId}|${reminder.kind}|${reminder.date}`
}
