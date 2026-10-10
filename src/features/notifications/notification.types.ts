/** What raised an alert: a budget, an ask-first recurring entry, the daily reminder. */
export const ALERT_KINDS = ['budget', 'bill', 'reminder'] as const
export type AlertKind = (typeof ALERT_KINDS)[number]

/** How the alert reads: `warn` and `error` for budget thresholds, `info` for reminders. */
export const ALERT_TONES = ['info', 'success', 'warn', 'error'] as const
export type AlertTone = (typeof ALERT_TONES)[number]

/** One alert in the list behind the header's bell. */
export interface AppAlert {
  /** Names what it's about, so the same alert raised again replaces the old one. */
  id: string
  kind: AlertKind
  tone: AlertTone
  title: string
  message: string
  /** The app URL it leads to, e.g. `/budgets/4`. */
  link: string | null
  /** When it was raised, in ms since the epoch. */
  at: number
  read: boolean
}
