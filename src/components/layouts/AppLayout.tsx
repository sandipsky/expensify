import { useState, type ReactNode } from 'react';
import { Drawer } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { Header, type IHeaderUser } from './Header';
import { Sidebar } from './Sidebar';
import './AppLayout.css';

interface AppLayoutProps {
  children: ReactNode;
  breadcrumbs?: string[];
  user?: IHeaderUser;
  onLogout?: () => void;
}

export function AppLayout({ children, breadcrumbs, user, onLogout }: AppLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 768px)', false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpened, setMobileOpened] = useState(false);

  const handleToggle = () => {
    if (isMobile) {
      setMobileOpened((value) => !value);
    } else {
      setCollapsed((value) => !value);
    }
  };

  return (
    <div className="app-layout">
      {!isMobile && <Sidebar collapsed={collapsed} />}

      {isMobile && (
        <Drawer
          opened={mobileOpened}
          onClose={() => setMobileOpened(false)}
          size={240}
          padding={0}
          withCloseButton={false}
          position="left"
        >
          <Sidebar collapsed={false} onNavigate={() => setMobileOpened(false)} />
        </Drawer>
      )}

      <div className="app-layout-main">
        <Header
          onToggleSidebar={handleToggle}
          breadcrumbs={breadcrumbs}
          user={user}
          onLogout={onLogout}
        />
        <main className="app-layout-content">{children}</main>
      </div>
    </div>
  );
}
