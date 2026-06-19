import { useState, type ReactNode } from 'react';
import { Drawer } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconArrowsExchange } from '@tabler/icons-react';
import {
  selectCurrencyCode,
  usePreferencesStore,
} from '../../stores/preferencesStore';
import { Header, type IHeaderUser } from './Header';
import { Sidebar } from './Sidebar';
import './AppLayout.css';

interface AppLayoutProps {
  children: ReactNode;
  user?: IHeaderUser;
  onLogout?: () => void;
}

export function AppLayout({ children, user, onLogout }: AppLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 768px)', false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpened, setMobileOpened] = useState(false);
  // Re-render formatted currency across the page tree when the preference changes.
  const currencyCode = usePreferencesStore(selectCurrencyCode);

  const handleToggle = () => {
    if (isMobile) {
      setMobileOpened((value) => !value);
    } else {
      setCollapsed((value) => !value);
    }
  };

  return (
    <div className="app-layout">
      <Header onToggleSidebar={handleToggle} user={user} onLogout={onLogout} />

      <div className="app-layout-body">
        {!isMobile && <Sidebar collapsed={collapsed} />}

        {isMobile && (
          <Drawer
            opened={mobileOpened}
            onClose={() => setMobileOpened(false)}
            size="80%"
            padding={0}
            position="left"
            withCloseButton
            classNames={{
              header: 'app-sidebar-drawer-header',
              body: 'app-sidebar-drawer-body',
              content: 'app-sidebar-drawer-content',
            }}
            title={
              <span className="app-sidebar-drawer-title">
                <span className="app-sidebar-drawer-mark">
                  <IconArrowsExchange size={16} stroke={2.5} />
                </span>
                Expensify
              </span>
            }
          >
            <Sidebar collapsed={false} onNavigate={() => setMobileOpened(false)} />
          </Drawer>
        )}

        <main className="app-layout-content" key={currencyCode}>
          {children}
        </main>
      </div>
    </div>
  );
}
