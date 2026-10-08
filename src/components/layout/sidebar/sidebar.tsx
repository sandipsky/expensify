import { useEffect, useImperativeHandle, useState, type ReactNode, type Ref } from 'react'
import { useMatchRoute, useRouterState } from '@tanstack/react-router'
import { SidebarItem } from './sidebar-item'
import { isSidebarNavGroup, type SidebarNavItem, type SidebarNavLeaf } from './sidebar.data'
import './sidebar.scss'

const MOBILE_BREAKPOINT = '(max-width: 768px)'

export interface SidebarHandle {
  toggle: () => void
}

export interface SidebarProps {
  items: SidebarNavItem[]
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  mobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
  className?: string
  children?: ReactNode
  ref?: Ref<SidebarHandle>
}

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
      {isMobile && isOpen && (
        <div className="l-sidebar__backdrop" onClick={() => setMobileOpen(false)} />
      )}

      <aside className="l-sidebar__panel">
        {children}
        <SidebarNav
          items={items}
          collapsed={isCollapsed && !isMobile}
          onNavigate={() => {
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

interface OpenGroups {
  pathname: string
  open: Record<string, boolean>
}

function SidebarNav({ items, collapsed, onNavigate }: SidebarNavProps) {
  const matchRoute = useMatchRoute()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [openGroups, setOpenGroups] = useState<OpenGroups | null>(null)

  const open = openGroups?.pathname === pathname ? openGroups.open : {}

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
