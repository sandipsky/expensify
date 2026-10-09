import type { ReactNode } from 'react'
import { LUIIcon, type LUIIconName } from '@lumen-ui/react'
import './empty-state.scss'

export interface EmptyStateProps {
  icon: LUIIconName
  title: string
  message?: string
  /** The next action, usually a button. */
  children?: ReactNode
}

/**
 * What a list or card shows when it has nothing yet. Every empty state offers
 * the next action, so pass a button as children.
 */
export function EmptyState({ icon, title, message, children }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <LUIIcon name={icon} size={28} color="var(--accent)" />
      </span>
      <p className="empty-state__title">{title}</p>
      {message && <p className="empty-state__message">{message}</p>}
      <div className="empty-state__actions">{children}</div>
    </div>
  )
}
