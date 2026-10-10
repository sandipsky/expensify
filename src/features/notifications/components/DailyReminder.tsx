import { useEffect, useState } from 'react'
import { usePreferences } from '@/features/auth/auth.query'
import { useTransactions } from '@/features/transactions/transaction.query'
import { useToday } from '@/lib'
import { NOTIFICATION_KEYS, readState, writeState } from '../device-state'
import { dailyReminderDue, isTimeOfDay, msUntilTime } from '../notification.domain'
import { useNotifier } from '../useNotifier'

/** Timers may fire a little early; waking just after the minute keeps the check true. */
const TIMER_SLACK_MS = 1000

/**
 * The daily reminder to log spending, for users who switched it on in
 * Settings: at their reminder time, if nothing is logged for today, once a
 * day. It can only come while the app is open, so an app opened later that
 * day shows it then. Entries a recurring rule added don't count as logging.
 * Renders nothing; mounted once in the signed-in layout.
 */
export function DailyReminder() {
  const today = useToday()
  const deliver = useNotifier()
  const prefs = usePreferences()?.notifications
  const enabled = prefs?.dailyReminder ?? false
  const time = prefs?.reminderTime ?? ''

  // Today's entries only, and only while the reminder is on.
  const todays = useTransactions({ from: today, to: today }, enabled)

  /** Bumped at the reminder time and when the tab comes back into view, to check again. */
  const [wake, setWake] = useState(0)

  // Wake at today's reminder time; re-armed when the time, the switch or the day changes.
  useEffect(() => {
    if (!enabled || !isTimeOfDay(time)) return
    const ms = msUntilTime(time, new Date())
    if (ms <= 0) return
    const timer = window.setTimeout(() => setWake((n) => n + 1), ms + TIMER_SLACK_MS)
    return () => window.clearTimeout(timer)
  }, [enabled, time, today])

  // A timer can run late while the device sleeps, so coming back also checks.
  useEffect(() => {
    const check = () => setWake((n) => n + 1)
    document.addEventListener('visibilitychange', check)
    return () => document.removeEventListener('visibilitychange', check)
  }, [])

  useEffect(() => {
    if (!todays.data) return
    const due = dailyReminderDue({
      enabled,
      time,
      now: new Date(),
      today,
      loggedToday: todays.data.some((tx) => !tx.recurringRuleId),
      lastShown: readState<string | null>(NOTIFICATION_KEYS.dailyReminder, null),
    })
    if (!due) return
    writeState(NOTIFICATION_KEYS.dailyReminder, today)
    deliver({
      id: `reminder|${today}`,
      tone: 'info',
      title: "Time to log today's spending",
      message: 'Nothing is logged for today yet. Adding it takes a few seconds.',
      link: '/transactions',
    })
  }, [wake, enabled, time, today, todays.data, deliver])

  return null
}
