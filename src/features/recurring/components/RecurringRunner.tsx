import { useEffect, useRef } from 'react'
import { useLUINotification } from '@lumen-ui/react'
import { useAccounts } from '@/features/accounts/account.query'
import { useCategories } from '@/features/categories/category.query'
import type { TxLookups } from '@/features/transactions/transaction.labels'
import { getErrorMessage, useToday } from '@/lib'
import { formatMoney } from '@/utils'
import { nextAfter } from '../recurring.domain'
import { entryCount, toRuleView } from '../recurring.labels'
import { isAlreadyHandled, useAddOccurrences, useRecurringRules } from '../recurring.query'

/**
 * Adds automatic rules' entries on their due date, and any missed while the
 * app was closed, from whichever page is open. Each write starts at the
 * rule's next due date and its Firestore transaction refuses one that doesn't,
 * so a date is added once however many tabs are open. Ask-first rules only wait here: the
 * Recurring page lists them for Confirm or Skip. Renders nothing; mounted
 * once in the signed-in layout.
 */
export function RecurringRunner() {
  const today = useToday()
  const notify = useLUINotification()
  const { mutateAsync: addOccurrences } = useAddOccurrences()
  const rules = useRecurringRules()
  const accounts = useAccounts()
  const categories = useCategories()

  /** Rules with a write in flight, so a re-render doesn't start a second one. */
  const running = useRef(new Set<string>())

  useEffect(() => {
    if (!rules.data || !accounts.data || !categories.data) return
    const lookups: TxLookups = {
      accountsById: new Map(accounts.data.map((a) => [a.id, a])),
      categoriesById: new Map(categories.data.map((c) => [c.id, c])),
      today,
    }

    for (const rule of rules.data) {
      if (rule.mode !== 'auto' || running.current.has(rule.id)) continue
      const view = toRuleView(rule, lookups)
      // At most a batch at a time; the refreshed rule brings the next batch.
      const dates = view.due
      if (!dates.length) continue

      running.current.add(rule.id)
      addOccurrences({
        id: rule.id,
        body: { dates, nextDueDate: nextAfter(rule, dates[dates.length - 1]) },
      })
        .then(() => {
          // "Recurring entry added: Salary · +Rs 3,000.00", or how many a catch-up added.
          const amount = formatMoney(
            view.amount,
            view.currency,
            view.kind === 'transfer' ? 'auto' : 'exceptZero',
          )
          if (dates.length === 1) {
            notify.success('Recurring entry added', `${view.name} · ${amount}`)
          } else {
            notify.success(
              `${entryCount(dates.length)} added`,
              `${view.name} · ${amount} each, including ones missed while the app was closed.`,
            )
          }
        })
        .catch((error: unknown) => {
          // Another tab got there first: nothing to tell.
          if (isAlreadyHandled(error)) return
          notify.error("Couldn't add recurring entries", `${view.name}: ${getErrorMessage(error)}`)
        })
        .finally(() => running.current.delete(rule.id))
    }
  }, [rules.data, accounts.data, categories.data, today, addOccurrences, notify])

  return null
}
