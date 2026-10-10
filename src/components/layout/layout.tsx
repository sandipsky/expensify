import { useRef, type ReactNode } from 'react'
import { LUIAvatar } from '@lumen-ui/react'
import { useAuthStore, useProfile } from '@/features/auth'
import { Header } from './header/header'
import { Sidebar, type SidebarHandle } from './sidebar/sidebar'
import { SIDEBAR_ITEMS } from './sidebar/sidebar.data'
import './layout.scss'

interface AppLayoutProps {
  children: ReactNode
  /** Counts beside sidebar links, by the link's `to`, such as entries waiting on /recurring. */
  badges?: Readonly<Record<string, number>>
}

export function AppLayout({ children, badges }: AppLayoutProps) {
  const sidebarRef = useRef<SidebarHandle>(null)
  // The profile once it loads, so a new name or photo shows at once; the login's user until then.
  const profile = useProfile().data
  const loginUser = useAuthStore((s) => s.user)
  const user = profile ?? loginUser
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="app-layout">
      <Sidebar ref={sidebarRef} items={SIDEBAR_ITEMS} badges={badges} />

      <div className="app-layout__main">
        <Header onMenuToggle={() => sidebarRef.current?.toggle()}>
          <span className="app-header__spacer" />
          {user && (
            <span className="app-header__user">
              <LUIAvatar imageUrl={profile?.photoUrl} name={user.name} size="24px" />
              {user.name}
            </span>
          )}
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => logout()}>
            Logout
          </button>
        </Header>

        {/* The pane scrolls, not the window, so the router restores its position by this id. */}
        <main className="app-layout__content" data-scroll-restoration-id="app-content">
          {/* Every page sits in one centered column, so switching pages never moves its edges. */}
          <div className="app-layout__page">{children}</div>
        </main>
      </div>
    </div>
  )
}
