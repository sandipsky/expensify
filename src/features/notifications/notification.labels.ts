import { formatDate } from '@/utils'
import type { BillReminder } from './notification.domain'

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
