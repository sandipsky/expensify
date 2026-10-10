import { useEffect } from 'react'
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout'
import { sessionReady, sessionUid, watchSession } from '@/features/auth'
import { BudgetAlerts } from '@/features/budgets'
import { DailyReminder, RecurringReminders, claimNotifications } from '@/features/notifications'
import { RecurringRunner, useWaitingCount } from '@/features/recurring'
import { ThemeSync } from '@/features/settings'

// Layout route: everything inside src/routes/_authenticated/ requires a login.
// `beforeLoad` runs before any child route renders - think of it as a bouncer.
// It waits for Firebase to restore the saved session first.
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    await sessionReady()
    const uid = sessionUid()
    if (!uid) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
    // This browser's alerts and reminders start over for a different user.
    claimNotifications(uid)
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const waiting = useWaitingCount()
  // A session that ends in another tab, or elsewhere, ends here too.
  useEffect(() => watchSession(), [])
  return (
    <AppLayout badges={{ '/recurring': waiting }}>
      {/* Work that runs whichever page is open: the theme, due recurring entries, alerts and reminders. */}
      <ThemeSync />
      <RecurringRunner />
      <BudgetAlerts />
      <RecurringReminders />
      <DailyReminder />
      <Outlet />
    </AppLayout>
  )
}
