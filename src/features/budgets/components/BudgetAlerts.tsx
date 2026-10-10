import { useEffect, useRef } from 'react'
import { useAccounts } from '@/features/accounts/account.query'
import { usePreferences } from '@/features/auth/auth.query'
import { useNotifier } from '@/features/notifications/useNotifier'
import { useToday } from '@/lib'
import { DEFAULT_CURRENCY, formatMoney, fractionDigits, spanOf } from '@/utils'
import { alertDue, budgetProgress, neededRange } from '../budget.domain'
import { daysLeftLabel } from '../budget.labels'
import { useBudgets, useRecordBudgetAlert, useSpending } from '../budget.query'

/**
 * Budget alerts, from whichever page is open: a toast when a budget reaches
 * 80% or 100% of its limit, once per threshold per period, unless turned off
 * in Settings. The budget's `lastAlert` records what was shown, so another
 * tab or a reload doesn't show it again. Renders nothing; mounted once in the
 * signed-in layout.
 */
export function BudgetAlerts() {
  const today = useToday()
  const deliver = useNotifier()
  const enabled = usePreferences()?.notifications.budgetAlerts ?? false
  const { mutate: recordAlert } = useRecordBudgetAlert()
  const budgets = useBudgets()
  const accounts = useAccounts()

  // The same range the Budgets page reads, so both share one cached list.
  const active = (budgets.data ?? []).filter((b) => b.active)
  const spending = useSpending(spanOf(active.map((b) => neededRange(b, today))))

  /** Alerts shown this session, in case a refetch lands before `lastAlert` is written back. */
  const shown = useRef(new Set<string>())

  useEffect(() => {
    if (!enabled || !budgets.data || !accounts.data || !spending.data) return
    // Accounts share one currency until multi-currency exists, and budgets use it.
    const currency = accounts.data[0]?.currency ?? DEFAULT_CURRENCY
    const money = (amount: number) => formatMoney(amount, currency)

    for (const budget of budgets.data) {
      if (!budget.active || !budget.alertThresholds.length) continue
      const progress = budgetProgress(budget, spending.data, today, fractionDigits(currency))
      const threshold = alertDue(budget, progress)
      if (threshold === null) continue
      const key = `${budget.id}|${progress.range.start}|${threshold}`
      if (shown.current.has(key)) continue
      shown.current.add(key)

      recordAlert({ id: budget.id, alert: { periodStart: progress.range.start, threshold } })
      const left = daysLeftLabel(progress.daysLeft)
      const alert = { id: `budget|${key}`, link: `/budgets/${budget.id}` }
      if (progress.state === 'over') {
        deliver({
          ...alert,
          tone: 'error',
          title: `${budget.name}: over budget`,
          message:
            progress.remaining < 0
              ? `${money(-progress.remaining)} over · ${left}`
              : `Nothing left to spend · ${left}`,
        })
      } else {
        deliver({
          ...alert,
          tone: 'warn',
          title: `${budget.name}: ${progress.percent ?? threshold}% used`,
          message: `${money(progress.remaining)} left · ${left}`,
        })
      }
    }
  }, [enabled, budgets.data, accounts.data, spending.data, today, deliver, recordAlert])

  return null
}
