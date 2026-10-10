import { type DateRange, addDays, formatDate, isCalendarMonth, parseYmd } from '@/utils'
import { DASHBOARD_PRESETS, type DashboardPreset } from './dashboard.types'

/**
 * The cards the dashboard shows, in order: expensify-web's default order,
 * without its largest expenses card.
 */
export const DASHBOARD_CARDS = [
  'summary',
  'balances',
  'spending',
  'budgets',
  'trend',
  'recent',
  'upcoming',
] as const

export type DashboardCard = (typeof DASHBOARD_CARDS)[number]

/** Cards that show the selected period; a period without entries replaces them with one empty state. */
export const PERIOD_CARDS: readonly DashboardCard[] = ['summary', 'spending', 'trend', 'recent']

export const DASHBOARD_PRESET_LABELS: Readonly<Record<DashboardPreset, string>> = {
  this_month: 'This month',
  last_month: 'Last month',
  custom: 'Custom',
}

/** Items for the period switcher. */
export const DASHBOARD_PRESET_OPTIONS = DASHBOARD_PRESETS.map((value) => ({
  value,
  label: DASHBOARD_PRESET_LABELS[value],
}))

/** The browser's language, which signs and month names are written in. */
const locale = () => navigator.language || 'en-US'

/** "34%", or "—" when there's nothing to share or no income. */
export function percentText(percent: number | null): string {
  return percent === null ? '—' : `${percent}%`
}

/**
 * "+12%", "-5%", "0%" in the locale's own signs, so they match the amounts
 * beside them, or "New" when there was nothing before.
 */
export function changeText(percent: number | null): string {
  if (percent === null) return 'New'
  return new Intl.NumberFormat(locale(), {
    style: 'percent',
    signDisplay: 'exceptZero',
    maximumFractionDigits: 0,
  }).format(percent / 100)
}

/** "+5 pts", "-3 pts", "0 pts": how a savings rate moved, in percentage points. */
export function pointsText(points: number): string {
  const text = new Intl.NumberFormat(locale(), { signDisplay: 'exceptZero' }).format(points)
  return `${text} pts`
}

/** "1 category", "3 categories". */
export function categoryCount(count: number): string {
  return `${count} ${count === 1 ? 'category' : 'categories'}`
}

/** "Sep" for a calendar month, "25 Aug" (its first day) for any other period. */
export function shortPeriodLabel(range: DateRange): string {
  const options: Intl.DateTimeFormatOptions = isCalendarMonth(range)
    ? { month: 'short' }
    : { day: 'numeric', month: 'short' }
  return new Intl.DateTimeFormat(locale(), options).format(parseYmd(range.start))
}

/** "Today", "Tomorrow", or "Thu, 1 Oct 2026"; a date already passed reads "Due Sat, 26 Sep 2026". */
export function dueLabel(date: string, today: string): string {
  if (date === today) return 'Today'
  if (date === addDays(today, 1)) return 'Tomorrow'
  const label = formatDate(date)
  return date < today ? `Due ${label}` : label
}
