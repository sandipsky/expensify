import { THEMES, type Theme } from '@/features/auth/auth.types'
import { formatTimeOfDay } from '@/utils'

export const THEME_LABELS: Readonly<Record<Theme, string>> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

/** Items for the theme segmented control. */
export const THEME_OPTIONS = THEMES.map((value) => ({ value, label: THEME_LABELS[value] }))

const pad = (n: number) => String(n).padStart(2, '0')

/** Every half hour of the day, as `HH:mm`. */
const HALF_HOURS = Array.from({ length: 48 }, (_, i) => `${pad(Math.floor(i / 2))}:${pad((i % 2) * 30)}`)

/**
 * Items for the reminder time select: every half hour, "12:00 AM" to
 * "11:30 PM", plus `current` in its place when it's between them.
 */
export function reminderTimeOptions(current: string) {
  const times = HALF_HOURS.includes(current) ? HALF_HOURS : [...HALF_HOURS, current].sort()
  return times.map((value) => ({ value, label: formatTimeOfDay(value) }))
}

/** What the user types to confirm deleting their account. */
export const DELETE_PHRASE = 'DELETE'

/** Profile photos are stored as a JPEG this many pixels a side: sharp at 64px on a 2x screen. */
export const PHOTO_EDGE = 128
