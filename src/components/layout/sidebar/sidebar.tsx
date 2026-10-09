import { useEffect, useImperativeHandle, useState, type ReactNode, type Ref } from 'react'
import { useMatchRoute, useRouterState } from '@tanstack/react-router'
import { SidebarItem } from './sidebar-item'
import { isSidebarNavGroup, type SidebarNavItem, type SidebarNavLeaf } from './sidebar.data'
import './sidebar.scss'

/** Keep in sync with the media query in sidebar.scss. */
const MOBILE_BREAKPOINT = '(max-width: 768px)'

/** What the header's menu button calls through its ref. */
export interface SidebarHandle {
  /** Collapses/expands the rail on desktop, opens/closes the drawer on mobile. */
  toggle: () => void
}

export interface SidebarProps {
  /** Nav entries, leaves or groups, from sidebar.data.ts. */
  items: SidebarNavItem[]
  /** Desktop state: `true` shrinks the rail to icons only. Omit to let the sidebar manage it. */
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /** Mobile state: `true` slides the drawer in over the content. Omit to let the sidebar manage it. */
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
  className?: string
  /** Rendered above the nav, e.g. a brand or search box. */
  children?: ReactNode
  ref?: Ref<SidebarHandle>
}

/**
 * The app's left navigation. On desktop it is a 200px rail that collapses
 * to 70px; at the mobile breakpoint it becomes a drawer that slides over
 * the page with a backdrop. Both states work controlled (pass the prop)
 * or uncontrolled (leave it out), and the header toggles them through
 * the `SidebarHandle` ref.
 */
export function Sidebar({
  items,
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileOpenChange,
  className,
  children,
  ref,
}: SidebarProps) {
  const [collapsedState, setCollapsedState] = useState(false)
  const [mobileOpenState, setMobileOpenState] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_BREAKPOINT).matches)

  // A prop, when given, wins over the internal state (controlled vs. uncontrolled).
  const isCollapsed = collapsed ?? collapsedState
  const isOpen = mobileOpen ?? mobileOpenState

  const setCollapsed = (value: boolean) => {
    setCollapsedState(value)
    onCollapsedChange?.(value)
  }

  const setMobileOpen = (value: boolean) => {
    setMobileOpenState(value)
    onMobileOpenChange?.(value)
  }

  // Follow the viewport across the breakpoint. Leaving mobile view closes the
  // drawer, so a stale open drawer never sits behind the static rail.
  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT)
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches)
      if (!event.matches) {
        setMobileOpenState(false)
        onMobileOpenChange?.(false)
      }
    }
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [onMobileOpenChange])

  // Escape closes the drawer. Only listened for while it is open, so the
  // document handler is not attached on desktop at all.
  useEffect(() => {
    if (!isMobile || !isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpenState(false)
        onMobileOpenChange?.(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isMobile, isOpen, onMobileOpenChange])

  // One toggle for the header button; which state it flips depends on the viewport.
  useImperativeHandle(ref, () => ({
    toggle: () => {
      if (isMobile) setMobileOpen(!isOpen)
      else setCollapsed(!isCollapsed)
    },
  }))

  const hostClasses = [
    'l-sidebar',
    isCollapsed ? 'l-sidebar--collapsed' : '',
    isOpen ? 'l-sidebar--open' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={hostClasses}>
      {/* Clicking outside the drawer closes it. */}
      {isMobile && isOpen && (
        <div className="l-sidebar__backdrop" onClick={() => setMobileOpen(false)} />
      )}

      <aside className="l-sidebar__panel">
        {children}
        <SidebarNav
          items={items}
          // The drawer is always full width, so items never render in rail mode on mobile.
          collapsed={isCollapsed && !isMobile}
          onNavigate={() => {
            // Picking a link in the drawer should reveal the page, not leave the drawer over it.
            if (isMobile) setMobileOpen(false)
          }}
        />
      </aside>
    </div>
  )
}

interface SidebarNavProps {
  items: SidebarNavItem[]
  collapsed: boolean
  onNavigate: () => void
}

/**
 * Which groups the user opened or closed by hand, remembered only for the
 * page they did it on. After a navigation the groups fall back to their
 * default: open when one of their links is the active page.
 */
interface OpenGroups {
  pathname: string
  open: Record<string, boolean>
}

function SidebarNav({ items, collapsed, onNavigate }: SidebarNavProps) {
  const matchRoute = useMatchRoute()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [openGroups, setOpenGroups] = useState<OpenGroups | null>(null)

  const open = openGroups?.pathname === pathname ? openGroups.open : {}

  // Fuzzy by default so /accounts stays active on /accounts/42; `exact` is for
  // routes like "/" that would otherwise match every page.
  const isLeafActive = (leaf: SidebarNavLeaf) =>
    matchRoute({ to: leaf.to, fuzzy: !leaf.exact }) !== false

  const renderLeaf = (leaf: SidebarNavLeaf) => (
    <SidebarItem
      key={leaf.to}
      to={leaf.to}
      icon={leaf.icon}
      exact={leaf.exact}
      label={leaf.label}
      collapsed={collapsed}
      onClick={onNavigate}
    />
  )

  return (
    <nav className="l-sidebar__nav" aria-label="Main navigation">
      {items.map((item) => {
        if (!isSidebarNavGroup(item)) return renderLeaf(item)

        // The user's own toggle wins; otherwise a group opens when it holds the active link.
        const expanded = open[item.label] ?? item.children.some(isLeafActive)

        return (
          <SidebarItem
            key={item.label}
            label={item.label}
            icon={item.icon}
            expanded={expanded}
            collapsed={collapsed}
            onClick={() =>
              setOpenGroups({ pathname, open: { ...open, [item.label]: !expanded } })
            }
          >
            {item.children.map(renderLeaf)}
          </SidebarItem>
        )
      })}
    </nav>
  )
}
