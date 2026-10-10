import { useRef, type ReactNode } from 'react'
import { AccountMenu } from './account-menu/account-menu'
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

  return (
    <div className="app-layout">
      <Sidebar ref={sidebarRef} items={SIDEBAR_ITEMS} badges={badges} />

      <div className="app-layout__main">
        <Header onMenuToggle={() => sidebarRef.current?.toggle()}>
          <span className="app-header__spacer" />
          <AccountMenu />
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
