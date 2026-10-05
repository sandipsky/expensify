import type { ComponentPropsWithRef } from 'react';
import './header.css';

export interface LUIHeaderProps extends ComponentPropsWithRef<'header'> {
  /** Fired by the hamburger button; wire it to the sidebar's `toggle()`. */
  onMenuToggle?: () => void;
}

/**
 * A 40px app bar with a built-in hamburger button. Header content is passed
 * as children.
 */
export function LUIHeader({ onMenuToggle, className, children, ...rest }: LUIHeaderProps) {
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
  );
}
