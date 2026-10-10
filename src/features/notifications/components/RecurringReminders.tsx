import { useEffect } from 'react'
import { useAccounts } from '@/features/accounts/account.query'
import { usePreferences } from '@/features/auth/auth.query'
import { useCategories } from '@/features/categories/category.query'
import { toRuleView } from '@/features/recurring/recurring.labels'
import { useRecurringRules } from '@/features/recurring/recurring.query'
import type { TxLookups } from '@/features/transactions/transaction.labels'
import { useToday } from '@/lib'
import { addDays, formatMoney } from '@/utils'
import { NOTIFICATION_KEYS, readState, writeState } from '../device-state'
import { billReminder, billReminderKey } from '../notification.domain'
import { reminderText } from '../notification.labels'
import { useNotifier } from '../useNotifier'

/** Reminders already shown are remembered this long after their date, then forgotten. */
const KEEP_DAYS = 60

/**
 * Reminders for ask-first recurring entries: the day before one is due, and
 * once it's due and waiting for Confirm or Skip, each once, unless turned off
 * in Settings. Automatic rules need none; the runner adds their entries.
 * Renders nothing; mounted once in the signed-in layout.
 */
export function RecurringReminders() {
  const today = useToday()
  const deliver = useNotifier()
  const enabled = usePreferences()?.notifications.billReminders ?? false
  const rules = useRecurringRules()
  const accounts = useAccounts()
  const categories = useCategories()

  useEffect(() => {
    if (!enabled || !rules.data || !accounts.data || !categories.data) return
    const lookups: TxLookups = {
      accountsById: new Map(accounts.data.map((a) => [a.id, a])),
      categoriesById: new Map(categories.data.map((c) => [c.id, c])),
      today,
    }

    const stored = readState<unknown>(NOTIFICATION_KEYS.billReminders, [])
    const shown = new Set(Array.isArray(stored) ? (stored as string[]) : [])
    let changed = false

    for (const rule of rules.data) {
      const view = toRuleView(rule, lookups)
      if (view.status !== 'active') continue
      const reminder = billReminder(rule, today)
      if (!reminder) continue
      const key = billReminderKey(reminder)
      if (shown.has(key)) continue
      shown.add(key)
      changed = true

      const amount = formatMoney(
        view.amount,
        view.currency,
        view.kind === 'transfer' ? 'auto' : 'exceptZero',
      )
      const { title, message } = reminderText(view.name, amount, view.accountLabel, reminder, today)
      deliver({ id: `bill|${key}`, tone: 'info', title, message, link: '/recurring' })
    }

    if (!changed) return
    // Keys end in their date, so old ones can be dropped.
    const oldest = addDays(today, -KEEP_DAYS)
    writeState(
      NOTIFICATION_KEYS.billReminders,
      [...shown].filter((key) => key.slice(-10) >= oldest),
    )
  }, [enabled, rules.data, accounts.data, categories.data, today, deliver])

  return null
}
