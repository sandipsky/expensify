import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { LUIIcon, LUITooltip, type LUIIconName } from '@lumen-ui/react'
import type { AppPath } from './sidebar.data'
import './sidebar-item.scss'

export interface SidebarItemProps {
  label: string
  icon?: LUIIconName
  /** Where the item links to. Without it the item is a plain button. */
  to?: AppPath
  /** Match the route exactly instead of by prefix; needed for "/" so it is not active everywhere. */
  exact?: boolean
  /** Force the active look. Links get it from the router on their own. */
  active?: boolean
  /** Group only: whether its children are shown. */
  expanded?: boolean
  /** Rail mode: icon only, with the label in a tooltip. */
  collapsed?: boolean
  /** A count beside the label, such as entries waiting; none when 0. A dot on the icon in the rail. */
  badge?: number
  onClick?: () => void
  /** Child items. Giving any turns the item into a group trigger. */
  children?: ReactNode
}

/** Also what TanStack Router adds to the link while its route is active. */
const ACTIVE_CLASS = 'l-sidebar-item--active'

/**
 * One entry in the sidebar nav. With `to` it renders a router link; with
 * `children` it renders a button that expands a nested list of items.
 */
export function SidebarItem({
  label,
  icon,
  to,
  exact = false,
  active = false,
  expanded = false,
  collapsed = false,
  badge = 0,
  onClick,
  children,
}: SidebarItemProps) {
  const isGroup = children != null

  const classes = [
    'l-sidebar-item',
    active ? ACTIVE_CLASS : '',
    collapsed ? 'l-sidebar-item--collapsed' : '',
    isGroup && expanded ? 'l-sidebar-item--expanded' : '',
  ]
    .filter(Boolean)
    .join(' ')

  // Shared by the link and the button so both look identical.
  const content = (
    <>
      {icon != null && (
        <span className="l-sidebar-item__icon" aria-hidden="true">
          <LUIIcon name={icon} color="inherit" />
        </span>
      )}
      <span className="l-sidebar-item__label">{label}</span>
      {badge > 0 && (
        <span className="l-sidebar-item__badge">
          {badge > 99 ? '99+' : badge}
          <span className="visually-hidden"> waiting</span>
        </span>
      )}
      {/* Points right; the stylesheet rotates it down while the group is expanded. */}
      {isGroup && (
        <LUIIcon
          name="caret"
          size={14}
          color="inherit"
          className="l-sidebar-item__chevron"
          aria-hidden="true"
        />
      )}
    </>
  )

  // The collapsed rail shows icons only, so the label moves into a tooltip beside it.
  // The tooltip always wraps the trigger (in a display:contents span, so layout is
  // untouched) and is merely disabled when expanded, which keeps the DOM stable
  // across toggles instead of remounting every link.
  const trigger = (
    <LUITooltip content={label} placement="right" disabled={!collapsed}>
      {!isGroup && to != null ? (
        <Link
          to={to}
          className={classes}
          activeOptions={{ exact }}
          activeProps={{ className: ACTIVE_CLASS }}
          onClick={onClick}
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          className={classes}
          onClick={onClick}
          aria-expanded={isGroup ? expanded : undefined}
        >
          {content}
        </button>
      )}
    </LUITooltip>
  )

  if (!isGroup) return trigger

  // The open/close animation is a grid-rows transition in the stylesheet; the
  // inner wrapper is what clips the children while they are collapsed.
  const childrenClasses = [
    'l-sidebar-item__children',
    expanded ? 'l-sidebar-item__children--open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="l-sidebar-item-group">
      {trigger}
      <div className={childrenClasses}>
        <div className="l-sidebar-item__children-inner">{children}</div>
      </div>
    </div>
  )
}
