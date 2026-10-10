import { useNavigate } from '@tanstack/react-router'
import { useLUINotification } from '@lumen-ui/react'
import { showSystemNotification } from './browser-notifications'

/** Alerts stay up longer than a save toast: they're news, not confirmation. */
export const ALERT_MS = 8000

export interface AlertInput {
  /** Names what it's about, as the system notification's tag. */
  id: string
  tone: 'info' | 'warn' | 'error'
  title: string
  message: string
  /** Where a click on the system notification leads. */
  link: string
}

/**
 * Delivers an alert: a system notification while the app is in a background
 * tab and the user allowed them in Settings, otherwise a toast. The callers
 * decide whether an alert is due and switched on.
 */
export function useNotifier() {
  const notify = useLUINotification()
  const navigate = useNavigate()

  return (alert: AlertInput) => {
    const { id, tone, title, message, link } = alert
    if (
      document.visibilityState === 'hidden' &&
      showSystemNotification(title, message, id, () => navigate({ href: link }))
    ) {
      return
    }
    notify[tone](title, message, { duration: ALERT_MS })
  }
}
