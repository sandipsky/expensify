import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { LUIIcon, type LUIIconName } from '@lumen-ui/react'
import type { AppPath } from './sidebar.data'
import './sidebar-item.scss'

export interface SidebarItemProps {
  label: string
  icon?: LUIIconName
  to?: AppPath
  exact?: boolean
  active?: boolean
  expanded?: boolean
  collapsed?: boolean
  /** How many items wait behind this entry; hidden when 0. */
  count?: number
  onClick?: () => void
  children?: ReactNode
}

const ACTIVE_CLASS = 'l-sidebar-item--active'

export function SidebarItem({
  label,
  icon,
  to,
  exact = false,
  active = false,
  expanded = false,
  collapsed = false,
  count = 0,
  onClick,
  children,
}: SidebarItemProps) {
  const isGroup = children != null
  const title = collapsed ? label : undefined

  const classes = [
    'l-sidebar-item',
    active ? ACTIVE_CLASS : '',
    collapsed ? 'l-sidebar-item--collapsed' : '',
    isGroup && expanded ? 'l-sidebar-item--expanded' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {icon != null && (
        <span className="l-sidebar-item__icon" aria-hidden="true">
          <LUIIcon name={icon} color="inherit" />
        </span>
      )}
      <span className="l-sidebar-item__label">{label}</span>
      {count > 0 && (
        <span className="l-sidebar-item__count">
          {count}
          <span className="visually-hidden"> waiting for you</span>
        </span>
      )}
      {isGroup && (
        <svg
          className="l-sidebar-item__chevron"
          viewBox="0 0 20 20"
          width="14"
          height="14"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M7.5 5L12.5 10L7.5 15"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </>
  )

  if (!isGroup && to != null) {
    return (
      <Link
        to={to}
        className={classes}
        activeOptions={{ exact }}
        activeProps={{ className: ACTIVE_CLASS }}
        title={title}
        onClick={onClick}
      >
        {content}
      </Link>
    )
  }

  const trigger = (
    <button
      type="button"
      className={classes}
      title={title}
      onClick={onClick}
      aria-expanded={isGroup ? expanded : undefined}
    >
      {content}
    </button>
  )

  if (!isGroup) return trigger

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
