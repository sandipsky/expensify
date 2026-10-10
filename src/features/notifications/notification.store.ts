import { create } from 'zustand'
import { NOTIFICATION_KEYS, clearNotificationState, readState, writeState } from './device-state'
import { ALERT_KINDS, ALERT_TONES, type AppAlert } from './notification.types'

/** The list keeps this many alerts, for this long. */
export const MAX_ALERTS = 50
export const ALERT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

interface AlertInboxState {
  /** Newest first. */
  alerts: AppAlert[]
  /** Adds an unread alert at the top, replacing one with the same id. */
  add: (alert: Omit<AppAlert, 'at' | 'read'>, at?: number) => void
  markAllRead: () => void
  remove: (id: string) => void
  clear: () => void
}

/**
 * Recent alerts in the app, newest first, behind the bell in the header.
 * Kept in this browser (see `device-state.ts`); open tabs share it.
 */
export const useAlertInbox = create<AlertInboxState>()((set, get) => {
  const save = (alerts: AppAlert[]) => {
    const kept = prune(alerts, Date.now())
    set({ alerts: kept })
    writeState(NOTIFICATION_KEYS.alerts, kept)
  }

  return {
    alerts: load(),
    add: (alert, at = Date.now()) =>
      save([{ ...alert, at, read: false }, ...get().alerts.filter((a) => a.id !== alert.id)]),
    markAllRead: () => {
      const { alerts } = get()
      if (alerts.some((a) => !a.read)) save(alerts.map((a) => (a.read ? a : { ...a, read: true })))
    },
    remove: (id) => save(get().alerts.filter((a) => a.id !== id)),
    clear: () => save([]),
  }
})

/**
 * Starts this browser's alerts and reminders over when someone other than
 * the user they were kept for logs in, so nobody sees another's alerts.
 */
export function claimNotifications(uid: string): void {
  if (readState<string | null>(NOTIFICATION_KEYS.owner, null) === uid) return
  clearNotificationState()
  useAlertInbox.setState({ alerts: [] })
  writeState(NOTIFICATION_KEYS.owner, uid)
}

/** How many alerts nobody has seen yet, for the bell's badge. */
export const useUnreadAlerts = () => useAlertInbox((s) => s.alerts.filter((a) => !a.read).length)

// Another tab added or read alerts, or cleared storage (a null key).
window.addEventListener('storage', (event) => {
  if (event.key === NOTIFICATION_KEYS.alerts || event.key === null) {
    useAlertInbox.setState({ alerts: load() })
  }
})

function load(): AppAlert[] {
  const stored = readState<unknown>(NOTIFICATION_KEYS.alerts, [])
  return Array.isArray(stored) ? prune(stored.filter(isAlert), Date.now()) : []
}

/** Newest first, at most `MAX_ALERTS`, none older than `ALERT_MAX_AGE_MS`. */
function prune(alerts: readonly AppAlert[], now: number): AppAlert[] {
  return alerts
    .filter((a) => now - a.at < ALERT_MAX_AGE_MS)
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_ALERTS)
}

function isAlert(value: unknown): value is AppAlert {
  const a = value as Partial<AppAlert> | null
  return (
    !!a &&
    typeof a.id === 'string' &&
    ALERT_KINDS.includes(a.kind as AppAlert['kind']) &&
    ALERT_TONES.includes(a.tone as AppAlert['tone']) &&
    typeof a.title === 'string' &&
    typeof a.message === 'string' &&
    (a.link === null || typeof a.link === 'string') &&
    typeof a.at === 'number' &&
    typeof a.read === 'boolean'
  )
}
