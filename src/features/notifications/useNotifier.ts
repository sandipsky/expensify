import { useNavigate } from '@tanstack/react-router'
import { useLUINotification } from '@lumen-ui/react'
import { showSystemNotification } from './browser-notifications'
import { useAlertInbox } from './notification.store'
import type { AlertKind, AlertTone } from './notification.types'

/** Alerts stay up longer than a save toast: they're news, not confirmation. */
export const ALERT_MS = 8000

export interface AlertInput {
  /**
   * Names what it's about: the system notification's tag, and the same id
   * raised again replaces the older alert in the list.
   */
  id: string
  kind: AlertKind
  tone: AlertTone
  title: string
  message: string
  /** Where the alert leads: a click on the system notification or its row in the list. */
  link: string
}

/**
 * Delivers an alert: into the list behind the header's bell, and as a toast,
 * or as a system notification while the app is in a background tab and the
 * user allowed them in Settings. The callers decide whether an alert is due
 * and switched on.
 */
export function useNotifier() {
  const notify = useLUINotification()
  const navigate = useNavigate()
  const addToInbox = useAlertInbox((s) => s.add)

  return (alert: AlertInput) => {
    const { id, kind, tone, title, message, link } = alert
    addToInbox({ id, kind, tone, title, message, link })
    if (
      document.visibilityState === 'hidden' &&
      showSystemNotification(title, message, id, () => navigate({ href: link }))
    ) {
      return
    }
    notify[tone](title, message, { duration: ALERT_MS })
  }
}
