import { useEffect, useState } from 'react'
import { localDate } from '@/utils'

/**
 * The user's local date, `YYYY-MM-DD`. It moves on at midnight and when the
 * tab comes back into view, so periods and due dates follow the calendar
 * while the app stays open.
 */
export function useToday(): string {
  const [today, setToday] = useState(localDate)

  useEffect(() => {
    // Setting the same date again doesn't re-render.
    const check = () => setToday(localDate())
    const timer = window.setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  return today
}
