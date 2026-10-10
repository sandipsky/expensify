import { LUIButton, LUICard, LUIIcon, LUISelect, LUIToggle, useLUINotification } from '@lumen-ui/react'
import { useUpdatePreferences } from '@/features/auth/auth.query'
import type { INotificationPrefs } from '@/features/auth/auth.types'
import { useNotificationPermission } from '@/features/notifications/browser-notifications'
import { isTimeOfDay } from '@/features/notifications/notification.domain'
import { getErrorMessage } from '@/lib'
import { reminderTimeOptions } from '../settings.labels'
import './NotificationSettings.scss'

interface NotificationSettingsProps {
  prefs: INotificationPrefs
}

/**
 * Settings › Notifications: each kind on or off, the daily reminder's time,
 * and the browser's permission to show them while the app is in another
 * tab. Each change saves at once.
 */
export const NotificationSettings = ({ prefs }: NotificationSettingsProps) => {
  const notify = useLUINotification()
  const save = useUpdatePreferences()
  const { permission, request } = useNotificationPermission()

  /** Whether any kind is on, so the browser's permission is worth asking for. */
  const anyOn = prefs.dailyReminder || prefs.budgetAlerts || prefs.billReminders

  const change = (changes: Partial<INotificationPrefs>) =>
    save.mutate(
      { notifications: changes },
      { onError: (error) => notify.error("Couldn't save that", getErrorMessage(error)) },
    )

  const setTime = (value: unknown) => {
    if (isTimeOfDay(value) && value !== prefs.reminderTime) change({ reminderTime: value })
  }

  const allow = async () => {
    const answer = await request()
    if (answer === 'granted') {
      notify.success('Notifications allowed', 'Alerts show even while the app is in another tab.')
    } else if (answer === 'denied') {
      notify.info('Notifications stay off', 'Alerts still show inside the app.')
    }
  }

  return (
    <section
      id="notifications"
      className="settings-section"
      aria-labelledby="notifications-heading"
    >
      <h2 className="settings-section__title" id="notifications-heading">
        Notifications
      </h2>

      <LUICard padding="lg">
        <div className="settings-card">
          <div className="notification-option">
            <LUIToggle
              label="Daily reminder to log spending"
              checked={prefs.dailyReminder}
              onChange={(event) => change({ dailyReminder: event.target.checked })}
            />
            <p className="notification-option__hint">
              Once a day at the time you choose, if nothing is logged for that day yet.
            </p>
            {prefs.dailyReminder && (
              <div className="notification-option__time">
                <LUISelect
                  label="Reminder time"
                  items={reminderTimeOptions(prefs.reminderTime)}
                  bindValue="value"
                  bindLabel="label"
                  value={prefs.reminderTime}
                  onChange={setTime}
                />
              </div>
            )}
          </div>

          <div className="notification-option">
            <LUIToggle
              label="Budget alerts"
              checked={prefs.budgetAlerts}
              onChange={(event) => change({ budgetAlerts: event.target.checked })}
            />
            <p className="notification-option__hint">
              When a budget reaches 80% and 100% of its limit. Each budget can also turn its own
              alerts off.
            </p>
          </div>

          <div className="notification-option">
            <LUIToggle
              label="Recurring reminders"
              checked={prefs.billReminders}
              onChange={(event) => change({ billReminders: event.target.checked })}
            />
            <p className="notification-option__hint">
              The day before and on the day an ask-first recurring entry is due, so you can confirm
              or skip it.
            </p>
          </div>

          <div className="settings-card__divider" />

          <h3 className="settings-card__subtitle">In other tabs</h3>
          {permission === 'granted' ? (
            <p className="settings-card__text notification-permission">
              <LUIIcon name="verified_user" color="var(--success)" size={18} />
              Allowed. Alerts show as notifications while the app is open in another tab.
            </p>
          ) : permission === 'denied' ? (
            <p className="settings-card__text">
              Blocked in your browser's settings for this site. Alerts still show inside the app.
            </p>
          ) : permission === 'unsupported' ? (
            <p className="settings-card__text">
              This browser can't show notifications, so alerts show inside the app.
            </p>
          ) : (
            <>
              <p className="settings-card__text">
                Allow notifications to see alerts while the app is open in another tab. Without
                them, alerts show inside the app.
              </p>
              <div className="settings-card__actions">
                <LUIButton variant="outlined-primary" size="lg" disabled={!anyOn} onClick={allow}>
                  <LUIIcon name="notification" color="inherit" />
                  Allow notifications
                </LUIButton>
              </div>
            </>
          )}
          <p className="settings-card__hint">
            Alerts and reminders reach you while the app is open in your browser.
          </p>
        </div>
      </LUICard>
    </section>
  )
}
