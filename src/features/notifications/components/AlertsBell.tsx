import { useNavigate } from '@tanstack/react-router'
import { LUIBadgeWrapper, LUIIcon, useLUIDrawer } from '@lumen-ui/react'
import { useMediaQuery } from '@/components/sheet'
import { alertsLabel } from '../notification.labels'
import { useUnreadAlerts } from '../notification.store'
import { AlertsPanel } from './AlertsPanel'
import './AlertsBell.scss'

const PHONE = '(max-width: 599.98px)'

/**
 * The header's bell: how many alerts are new, opening the list of recent
 * ones. A side panel on tablets and desktops, a bottom sheet on phones.
 */
export function AlertsBell() {
  const unread = useUnreadAlerts()
  const drawers = useLUIDrawer()
  const navigate = useNavigate()
  const phone = useMediaQuery(PHONE)

  const openAlerts = async () => {
    const link = await drawers
      .open<string>((ref) => <AlertsPanel sheet={ref} />, {
        position: phone ? 'bottom' : 'right',
        size: phone ? '75vh' : '400px',
        panelClass: 'alerts-drawer',
      })
      .afterClosed()
    if (link) void navigate({ href: link })
  }

  return (
    <LUIBadgeWrapper
      className="app-header__bell-badge"
      badge={unread}
      badgeColor="var(--accent)"
      badgeSize="sm"
      badgeOverflowCount={9}
    >
      <button
        type="button"
        className="app-header__bell"
        aria-label={alertsLabel(unread)}
        onClick={() => void openAlerts()}
      >
        <LUIIcon name="notification" color="inherit" size={18} />
      </button>
    </LUIBadgeWrapper>
  )
}
