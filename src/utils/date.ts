// Calendar dates as local `YYYY-MM-DD` strings: what transactions are dated
// with, so a date never shifts with the time zone. Periods are built on them.

/** An inclusive range of local calendar dates, `YYYY-MM-DD`. */
export interface DateRange {
  start: string
  end: string
}

/** The periods the transaction list offers. */
export const PERIOD_PRESETS = ['this_month', 'last_month', 'this_year', 'custom'] as const

export type PeriodPreset = (typeof PERIOD_PRESETS)[number]

const YMD = /^\d{4}-\d{2}-\d{2}$/

/** The browser's language, which dates are formatted for. */
const locale = () => navigator.language || 'en-US'

const pad = (n: number) => String(n).padStart(2, '0')

/** A local `Date` as `YYYY-MM-DD`. */
export function toYmd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** A `YYYY-MM-DD` string as a `Date` at local midnight. */
export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Whether the text is a real calendar date written as `YYYY-MM-DD`. */
export function isYmd(value: unknown): value is string {
  return typeof value === 'string' && YMD.test(value) && toYmd(parseYmd(value)) === value
}

/** The user's local calendar date today, as `YYYY-MM-DD`. */
export function localDate(now: Date = new Date()): string {
  return toYmd(now)
}

/** The date `days` after the given one; negative counts back. */
export function addDays(ymd: string, days: number): string {
  const date = parseYmd(ymd)
  date.setDate(date.getDate() + days)
  return toYmd(date)
}

/** The calendar month that contains `today`, or the one `offset` months away. */
export function monthPeriod(today: string, offset = 0): DateRange {
  const date = parseYmd(today)
  const month = date.getMonth() + offset
  // Date() rolls months past 11 or below 0 into the next or previous year.
  const start = new Date(date.getFullYear(), month, 1)
  const end = new Date(date.getFullYear(), month + 1, 0)
  return { start: toYmd(start), end: toYmd(end) }
}

/** The calendar year that contains `today`. */
export function yearPeriod(today: string): DateRange {
  const year = today.slice(0, 4)
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

/** The two dates as a range, earlier one first. */
export function orderedRange(a: string, b: string): DateRange {
  return a <= b ? { start: a, end: b } : { start: b, end: a }
}

/** The range a preset stands for on `today`; `custom` returns the given range, in order. */
export function presetRange(preset: PeriodPreset, today: string, custom: DateRange): DateRange {
  switch (preset) {
    case 'this_month':
      return monthPeriod(today)
    case 'last_month':
      return monthPeriod(today, -1)
    case 'this_year':
      return yearPeriod(today)
    case 'custom':
      return orderedRange(custom.start, custom.end)
  }
}

/** Whether the date falls in the range, both ends included. */
export function inRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end
}

/** Whether the range is exactly one calendar month. */
export function isCalendarMonth(range: DateRange): boolean {
  return range.start.endsWith('-01') && monthPeriod(range.start).end === range.end
}

/** Whether the range is exactly one calendar year. */
export function isCalendarYear(range: DateRange): boolean {
  const year = range.start.slice(0, 4)
  return range.start === `${year}-01-01` && range.end === `${year}-12-31`
}

/**
 * How a period reads: "September 2026" for a calendar month, "2026" for a
 * calendar year, otherwise the date range ("25 Sep – 24 Oct 2026").
 */
export function formatPeriod(range: DateRange): string {
  const start = parseYmd(range.start)
  if (isCalendarYear(range)) {
    return new Intl.DateTimeFormat(locale(), { year: 'numeric' }).format(start)
  }
  if (isCalendarMonth(range)) {
    return new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(start)
  }
  return new Intl.DateTimeFormat(locale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatRange(start, parseYmd(range.end))
}

/** "Sat, 26 Sep 2026". */
export function formatDate(ymd: string): string {
  return new Intl.DateTimeFormat(locale(), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parseYmd(ymd))
}

/** "26 Sep 2026, 14:05" for an ISO timestamp, as audit fields read. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(locale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

/** A day header: "Today", "Yesterday" or "Tomorrow" before the date when it's one of those. */
export function dayLabel(ymd: string, today: string): string {
  const near =
    ymd === today
      ? 'Today'
      : ymd === addDays(today, -1)
        ? 'Yesterday'
        : ymd === addDays(today, 1)
          ? 'Tomorrow'
          : null
  return near ? `${near} · ${formatDate(ymd)}` : formatDate(ymd)
}
