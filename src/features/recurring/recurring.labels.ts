import type { LUIIconName } from '@lumen-ui/react'
import { type TxLookups, accountName, categoryOf } from '@/features/transactions/transaction.labels'
import type { TxType } from '@/features/transactions/transaction.types'
import { DEFAULT_CURRENCY, formatDate, parseYmd } from '@/utils'
import { dayOfMonthOf, dueDates, isEnded, weekdaysOf } from './recurring.domain'
import {
  FREQUENCIES,
  type EndType,
  type Frequency,
  type IRecurringRule,
  type RuleMode,
  type Schedule,
} from './recurring.types'

/** The browser's language, which weekday names are written in. */
const locale = () => navigator.language || 'en-US'

export const FREQUENCY_LABELS: Readonly<Record<Frequency, string>> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

/** Items for the frequency segmented control. */
export const FREQUENCY_OPTIONS = FREQUENCIES.map((value) => ({
  value,
  label: FREQUENCY_LABELS[value],
}))

/** Items for how a rule ends. */
export const END_OPTIONS: readonly { value: EndType; label: string }[] = [
  { value: 'never', label: 'Never' },
  { value: 'count', label: 'After' },
  { value: 'until', label: 'On date' },
]

/** Items for what happens on the due date. */
export const MODE_OPTIONS: { value: RuleMode; label: string }[] = [
  { value: 'auto', label: 'Add it automatically' },
  { value: 'confirm', label: 'Ask me first' },
]

const UNITS: Readonly<Record<Frequency, readonly [string, string]>> = {
  daily: ['day', 'days'],
  weekly: ['week', 'weeks'],
  monthly: ['month', 'months'],
  yearly: ['year', 'years'],
}

/** "day" or "days", for the "Every N …" field's suffix. */
export function intervalUnit(frequency: Frequency, interval: number | null): string {
  return UNITS[frequency][interval === 1 ? 0 : 1]
}

/** "1st", "22nd", "30th". */
export function ordinal(day: number): string {
  const teen = day % 100 >= 11 && day % 100 <= 13
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10]
  return `${day}${suffix ?? 'th'}`
}

/** Items for the monthly day picker: the 1st to the 30th, then "Last day" (31). */
export const DAY_OF_MONTH_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: i + 1,
  label: i === 30 ? 'Last day' : ordinal(i + 1),
}))

/** Weekday names in the locale, ISO order: index 0 is Monday. */
export function weekdayNames(style: 'short' | 'long' = 'short'): string[] {
  const formatter = new Intl.DateTimeFormat(locale(), { weekday: style })
  // 1 January 2024 was a Monday.
  return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2024, 0, 1 + i)))
}

/** Items for the weekly picker, Monday first. */
export function weekdayOptions() {
  return weekdayNames('long').map((label, i) => ({ value: i + 1, label }))
}

/** "Mon", "Mon and Thu", "Mon, Wed and Fri". */
function list(items: readonly string[]): string {
  return items.length < 2
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/**
 * The schedule in words: "Every day", "Every 2 weeks on Mon and Thu",
 * "Every month on the 1st", "Every month on the last day", "Every year on 25 Dec".
 */
export function scheduleLabel(schedule: Schedule): string {
  const n = Math.max(1, schedule.interval || 1)
  const [one, many] = UNITS[schedule.frequency]
  const every = n === 1 ? `Every ${one}` : `Every ${n} ${many}`
  switch (schedule.frequency) {
    case 'daily':
      return every
    case 'weekly': {
      const names = weekdayNames()
      return `${every} on ${list(weekdaysOf(schedule).map((day) => names[day - 1]))}`
    }
    case 'yearly': {
      const day = new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short' })
      return `${every} on ${day.format(parseYmd(schedule.startDate))}`
    }
    case 'monthly': {
      const day = dayOfMonthOf(schedule)
      return `${every} on the ${day === 31 ? 'last day' : ordinal(day)}`
    }
  }
}

/** "1 entry", "12 entries". */
export function entryCount(count: number): string {
  return `${count} ${count === 1 ? 'entry' : 'entries'}`
}

/** How the rule ends, or '' for one that never does. */
export function endLabel(
  rule: Pick<IRecurringRule, 'endType' | 'endDate' | 'maxCount' | 'occurrences'>,
): string {
  if (rule.endType === 'count' && rule.maxCount !== null) {
    const left = Math.max(0, rule.maxCount - rule.occurrences)
    return `Ends after ${entryCount(rule.maxCount)} (${left} left)`
  }
  if (rule.endType === 'until' && rule.endDate) return `Ends on ${formatDate(rule.endDate)}`
  return ''
}

/**
 * Where a rule stands: running, paused, run its course, or unable to run
 * because an account it needs was deleted.
 */
export type RuleStatus = 'active' | 'paused' | 'ended' | 'missing_account'

/** A rule as the recurring screens show it. */
export interface RuleView {
  id: string
  rule: IRecurringRule
  /** The note, else the category, else "Transfer": what entries it adds are called. */
  name: string
  /** The category's icon and color, or neutral ones for transfers and missing categories. */
  icon: LUIIconName
  color: string | null
  /** "Every month on the 1st". */
  schedule: string
  /** "Bank", or "Bank → Cash" for a transfer. */
  accountLabel: string
  kind: TxType
  /** + for income, − for expense, unsigned for a transfer. */
  amount: number
  /** The source account's. */
  currency: string
  status: RuleStatus
  /** The next date an entry is due, or null once the rule has ended. */
  next: string | null
  /** Entries due by today and not yet added or skipped, oldest first. */
  due: string[]
}

export function toRuleView(rule: IRecurringRule, lookups: TxLookups): RuleView {
  const { template } = rule
  const transfer = template.type === 'transfer'
  const accountIds = transfer ? [template.accountId, template.toAccountId] : [template.accountId]
  const missing = accountIds.some((id) => id === null || !lookups.accountsById.has(id))
  const category = categoryOf(lookups, template)
  const from = accountName(lookups, template.accountId)
  const ended = isEnded(rule)
  const status: RuleStatus = !rule.active
    ? 'paused'
    : ended
      ? 'ended'
      : missing
        ? 'missing_account'
        : 'active'
  return {
    id: rule.id,
    rule,
    name: template.note?.trim() || category.name,
    icon: category.icon,
    color: category.color,
    schedule: scheduleLabel(rule),
    accountLabel: transfer ? `${from} → ${accountName(lookups, template.toAccountId)}` : from,
    kind: template.type,
    amount: template.type === 'expense' ? -template.amount : template.amount,
    currency: lookups.accountsById.get(template.accountId)?.currency ?? DEFAULT_CURRENCY,
    status,
    next: ended ? null : rule.nextDueDate,
    due: status === 'active' ? dueDates(rule, lookups.today) : [],
  }
}

/** Soonest next date first, ended rules last, then by name. */
export function compareRuleViews(a: RuleView, b: RuleView): number {
  return (a.next ?? '9999').localeCompare(b.next ?? '9999') || a.name.localeCompare(b.name)
}

/** The screens' groups of rules. */
export interface RuleGroups {
  all: RuleView[]
  /** Running rules, and those waiting for an account to be fixed. */
  active: RuleView[]
  paused: RuleView[]
  ended: RuleView[]
  /** Ask-first rules with entries waiting for Confirm or Skip, oldest due first. */
  waiting: RuleView[]
}

export function groupRules(rules: readonly IRecurringRule[], lookups: TxLookups): RuleGroups {
  const all = rules.map((rule) => toRuleView(rule, lookups)).sort(compareRuleViews)
  return {
    all,
    active: all.filter((v) => v.status === 'active' || v.status === 'missing_account'),
    paused: all.filter((v) => v.status === 'paused'),
    ended: all.filter((v) => v.status === 'ended'),
    waiting: all
      .filter((v) => v.rule.mode === 'confirm' && v.due.length)
      .sort((a, b) => a.due[0].localeCompare(b.due[0])),
  }
}

/** "Next 1 Oct", "Due", "Paused", "Ended". */
export function nextLabel(view: RuleView, today: string): string {
  if (view.status === 'paused') return 'Paused'
  if (!view.next) return 'Ended'
  if (view.due.length) return 'Due'
  const sameYear = view.next.slice(0, 4) === today.slice(0, 4)
  const date = new Intl.DateTimeFormat(locale(), {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  }).format(parseYmd(view.next))
  return `Next ${date}`
}

/** "Due Thu, 1 Oct 2026 · Bank", with how many more wait after it. */
export function dueCaption(view: RuleView): string {
  const more = view.due.length - 1
  const due = `Due ${formatDate(view.due[0])} · ${view.accountLabel}`
  return more ? `${due} · then ${entryCount(more)} more` : due
}
