import { useEffect, useState } from 'react'
import { LUIButton, LUIIcon } from '@lumen-ui/react'
import { EmptyState } from '@/components/empty-state'
import type { SheetHandle } from '@/components/sheet'
import { formatTimeAgo } from '@/utils'
import { ALERT_ICONS } from '../notification.labels'
import { useAlertInbox } from '../notification.store'
import type { AppAlert } from '../notification.types'
import './AlertsPanel.scss'

/** Settings' notifications section, where each kind is switched on or off. */
export const NOTIFICATION_SETTINGS_LINK = '/settings#notifications'

interface AlertsPanelProps {
  /** Closes with the app URL to open, when the user picks an alert or the settings. */
  sheet: SheetHandle<string>
}

/**
 * The list of recent alerts, opened from the bell in the header. Opening it
 * marks every alert read; the ones that were new stay marked until it
 * closes. Router hooks don't reach drawer content, so it closes with the link
 * and the bell navigates.
 */
export function AlertsPanel({ sheet }: AlertsPanelProps) {
  const alerts = useAlertInbox((s) => s.alerts)
  const markAllRead = useAlertInbox((s) => s.markAllRead)
  const remove = useAlertInbox((s) => s.remove)
  const clear = useAlertInbox((s) => s.clear)

  // Both read once, as the panel opens: what was new then, and the time the ages count from.
  const [fresh] = useState(
    () => new Set(useAlertInbox.getState().alerts.filter((a) => !a.read).map((a) => a.id)),
  )
  const [now] = useState(Date.now)

  useEffect(() => {
    markAllRead()
  }, [markAllRead])

  const open = (alert: AppAlert) => sheet.close(alert.link ?? undefined)
  const settings = () => sheet.close(NOTIFICATION_SETTINGS_LINK)

  return (
    <div className="alerts-panel">
      <div className="alerts-panel__header">
        <h2 className="alerts-panel__title" id="alerts-title">
          Alerts
        </h2>
        {alerts.length > 0 && (
          <LUIButton variant="ghost" size="sm" onClick={clear}>
            Clear all
          </LUIButton>
        )}
        <button
          type="button"
          className="alerts-panel__close"
          aria-label="Close"
          onClick={() => sheet.close()}
        >
          <LUIIcon name="cross" color="inherit" size={20} />
        </button>
      </div>

      {alerts.length > 0 ? (
        <>
          <ul className="alerts-panel__list" aria-labelledby="alerts-title">
            {alerts.map((alert) => {
              const isFresh = fresh.has(alert.id)
              return (
                <li key={alert.id} className={`alert-row${isFresh ? ' is-fresh' : ''}`}>
                  <button type="button" className="alert-row__main" onClick={() => open(alert)}>
                    <span className={`alert-row__icon is-${alert.tone}`}>
                      <LUIIcon name={ALERT_ICONS[alert.kind]} color="inherit" size={20} />
                    </span>
                    <span className="alert-row__text">
                      <span className="alert-row__title">
                        {isFresh && (
                          <>
                            <span className="alert-row__dot" aria-hidden="true" />
                            <span className="visually-hidden">New: </span>
                          </>
                        )}
                        {alert.title}
                      </span>
                      <span className="alert-row__message">{alert.message}</span>
                      <span className="alert-row__time">{formatTimeAgo(alert.at, now)}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="alert-row__remove"
                    aria-label={`Remove ${alert.title}`}
                    onClick={() => remove(alert.id)}
                  >
                    <LUIIcon name="cross" color="inherit" size={16} />
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="alerts-panel__footer">
            <LUIButton variant="ghost" onClick={settings}>
              <LUIIcon name="settings" color="inherit" size={18} />
              Notification settings
            </LUIButton>
          </div>
        </>
      ) : (
        <div className="alerts-panel__empty">
          <EmptyState
            icon="notification"
            title="No alerts yet"
            message="Budget alerts and reminders show up here, so you can catch up on anything you missed."
          >
            <LUIButton variant="outlined-primary" size="lg" onClick={settings}>
              Notification settings
            </LUIButton>
          </EmptyState>
        </div>
      )}
    </div>
  )
}
