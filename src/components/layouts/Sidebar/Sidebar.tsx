import { useMemo } from 'react';
import { Stack, Tooltip, UnstyledButton } from '@mantine/core';
import {
  IconCalendar,
  IconCategory,
  IconChartPie,
  IconDatabaseExport,
  IconLayoutDashboard,
  IconReceipt2,
  IconUsers,
  IconWallet,
  type Icon,
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { selectIsAdmin, useAuthStore } from '../../../features/auth';
import './Sidebar.css';

interface INavItem {
  label: string;
  icon: Icon;
  to: string;
  exact?: boolean;
}

interface INavSection {
  label?: string;
  items: INavItem[];
}

function buildSections(isAdmin: boolean): INavSection[] {
  const sections: INavSection[] = [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', icon: IconLayoutDashboard, to: '/', exact: true },
        { label: 'Calendar', icon: IconCalendar, to: '/calendar' },
      ],
    },
    {
      label: 'Money',
      items: [
        { label: 'Transactions', icon: IconReceipt2, to: '/transactions' },
        { label: 'Accounts', icon: IconWallet, to: '/accounts' },
        { label: 'Budgets', icon: IconChartPie, to: '/budgets' },
        { label: 'Categories', icon: IconCategory, to: '/categories' },
      ],
    },
    {
      label: 'Data',
      items: [{ label: 'Import / Export', icon: IconDatabaseExport, to: '/data' }],
    },
  ];
  if (isAdmin) {
    sections.push({
      label: 'Admin',
      items: [{ label: 'Users', icon: IconUsers, to: '/users' }],
    });
  }
  return sections;
}

interface SidebarProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ collapsed, onNavigate }: SidebarProps) {
  const isAdmin = useAuthStore(selectIsAdmin);
  const sections = useMemo(() => buildSections(isAdmin), [isAdmin]);

  return (
    <aside className="app-sidebar" data-collapsed={collapsed}>
      <div className="app-sidebar-nav">
        {sections.map((section, index) => (
          <div key={section.label ?? index}>
            {section.label && (
              <div className="app-sidebar-section-label">{section.label}</div>
            )}
            <Stack gap={2}>
              {section.items.map((item) => (
                <NavItem
                  key={item.to}
                  item={item}
                  collapsed={collapsed}
                  onClick={onNavigate}
                />
              ))}
            </Stack>
          </div>
        ))}
      </div>
    </aside>
  );
}

interface NavItemProps {
  item: INavItem;
  collapsed: boolean;
  onClick?: () => void;
}

function NavItem({ item, collapsed, onClick }: NavItemProps) {
  const Icon = item.icon;

  const button = (
    <UnstyledButton
      component={Link}
      to={item.to}
      activeOptions={{ exact: item.exact }}
      activeProps={{ 'data-active': 'true' }}
      className="app-sidebar-nav-item"
      onClick={onClick}
    >
      <Icon size={18} className="app-sidebar-nav-icon" />
      {!collapsed && <span className="app-sidebar-nav-label">{item.label}</span>}
    </UnstyledButton>
  );

  if (collapsed) {
    return (
      <Tooltip label={item.label} position="right" withArrow>
        {button}
      </Tooltip>
    );
  }

  return button;
}
