import type { ComponentPropsWithRef } from 'react'
import './header.scss'

export interface HeaderProps extends ComponentPropsWithRef<'header'> {
  onMenuToggle?: () => void
}

export function Header({ onMenuToggle, className, children, ...rest }: HeaderProps) {
  return (
    <header className={['l-header', className ?? ''].filter(Boolean).join(' ')} {...rest}>
      <button
        type="button"
        className="l-header__menu"
        aria-label="Toggle sidebar"
        onClick={() => onMenuToggle?.()}
      >
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
          <path
            d="M3 5h14M3 10h14M3 15h14"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div className="l-header__content">{children}</div>
    </header>
  )
}
