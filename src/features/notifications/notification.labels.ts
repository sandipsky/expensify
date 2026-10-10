import type { LUIIconName } from '@lumen-ui/react'
import { formatDate } from '@/utils'
import type { BillReminder } from './notification.domain'
import type { AlertKind } from './notification.types'

/** The icon each kind of alert shows in the list. */
export const ALERT_ICONS: Readonly<Record<AlertKind, LUIIconName>> = {
  budget: 'donut_large',
  bill: 'event_repeat',
  reminder: 'clock',
}

/** The bell's name for screen readers: "Alerts" or "Alerts, 3 new". */
export function alertsLabel(unread: number): string {
  return unread ? `Alerts, ${unread} new` : 'Alerts'
}

/** "Rent is due tomorrow" · "−Rs 20,000.00 · Bank. You'll be asked to confirm it." */
export function reminderText(
  name: string,
  amount: string,
  account: string,
  reminder: BillReminder,
  today: string,
): { title: string; message: string } {
  if (reminder.kind === 'upcoming') {
    return {
      title: `${name} is due tomorrow`,
      message: `${amount} · ${account}. You'll be asked to confirm it.`,
    }
  }
  if (reminder.count > 1) {
    return {
      title: `${name}: ${reminder.count} entries waiting`,
      message: `${amount} each · ${account}. Confirm or skip them.`,
    }
  }
  if (reminder.date === today) {
    return {
      title: `${name} is due today`,
      message: `${amount} · ${account}. Confirm or skip it.`,
    }
  }
  return {
    title: `${name} is waiting`,
    message: `Due ${formatDate(reminder.date)} · ${amount}. Confirm or skip it.`,
  }
}
