import { useRef, type ReactNode } from 'react'
import { useAuthStore } from '@/features/auth'
import { Header } from './header/header'
import { Sidebar, type SidebarHandle } from './sidebar/sidebar'
import { SIDEBAR_ITEMS } from './sidebar/sidebar.data'
import './layout.scss'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const sidebarRef = useRef<SidebarHandle>(null)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="app-layout">
      <Sidebar ref={sidebarRef} items={SIDEBAR_ITEMS} />

      <div className="app-layout__main">
        <Header onMenuToggle={() => sidebarRef.current?.toggle()}>
          <span className="app-header__spacer" />
          {user && <span className="app-header__user">{user.name}</span>}
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => logout()}>
            Logout
          </button>
        </Header>

        {/* The pane scrolls, not the window, so the router restores its position by this id. */}
        <main className="app-layout__content" data-scroll-restoration-id="app-content">
          {children}
        </main>
      </div>
    </div>
  )
}
