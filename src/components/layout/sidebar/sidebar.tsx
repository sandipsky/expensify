import { useEffect, useImperativeHandle, useState, type ReactNode, type Ref } from 'react';
import './sidebar.css';

/** Keep in sync with the media query in sidebar.css. */
const MOBILE_BREAKPOINT = '(max-width: 768px)';

/** Imperative handle exposed via the sidebar's `ref`. */
export interface LUISidebarHandle {
  /** Collapses/expands on desktop, opens/closes the drawer on mobile. */
  toggle: () => void;
}

export interface LUISidebarProps {
  /**
   * Desktop state: `true` shrinks the rail from 200px to 70px.
   * Controlled when provided (pair with `onCollapsedChange`); uncontrolled otherwise.
   */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;

  /**
   * Mobile state: `true` slides the drawer in over the content.
   * Controlled when provided (pair with `onMobileOpenChange`); uncontrolled otherwise.
   */
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;

  className?: string;
  children?: ReactNode;

  /** Exposes {@link LUISidebarHandle} — e.g. to wire a header's `onMenuToggle` to `toggle()`. */
  ref?: Ref<LUISidebarHandle>;
}

/**
 * Layout shell: a 200px navigation rail that collapses to 70px on desktop and
 * becomes a slide-in drawer with a backdrop below 768px. Escape closes the
 * mobile drawer. Nav content is passed as children.
 */
export function LUISidebar({
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileOpenChange,
  className,
  children,
  ref,
}: LUISidebarProps) {
  const [collapsedState, setCollapsedState] = useState(false);
  const [mobileOpenState, setMobileOpenState] = useState(false);

  const isCollapsed = collapsed ?? collapsedState;
  const isOpen = mobileOpen ?? mobileOpenState;

  const setCollapsed = (value: boolean) => {
    setCollapsedState(value);
    onCollapsedChange?.(value);
  };

  const setMobileOpen = (value: boolean) => {
    setMobileOpenState(value);
    onMobileOpenChange?.(value);
  };

  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_BREAKPOINT).matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT);
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
      // Leaving mobile view: never keep a stale open drawer behind the static rail.
      if (!event.matches) {
        setMobileOpenState(false);
        onMobileOpenChange?.(false);
      }
    };
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, [onMobileOpenChange]);

  useEffect(() => {
    if (!isMobile || !isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpenState(false);
        onMobileOpenChange?.(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMobile, isOpen, onMobileOpenChange]);

  useImperativeHandle(ref, () => ({
    /** Collapses/expands on desktop, opens/closes the drawer on mobile. */
    toggle: () => {
      if (isMobile) setMobileOpen(!isOpen);
      else setCollapsed(!isCollapsed);
    },
  }));

  const hostClasses = [
    'l-sidebar',
    isCollapsed ? 'l-sidebar--collapsed' : '',
    isOpen ? 'l-sidebar--open' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={hostClasses}>
      {isMobile && isOpen && (
        <div className="l-sidebar__backdrop" onClick={() => setMobileOpen(false)} />
      )}

      <aside className="l-sidebar__panel">{children}</aside>
    </div>
  );
}
