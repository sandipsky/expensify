import { Stack, Tooltip, UnstyledButton } from '@mantine/core';
import {
  IconCalendar,
  IconCategory,
  IconChartPie,
  IconLayoutDashboard,
  IconReceipt2,
  IconWallet,
  type Icon,
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import './Sidebar.css';

interface INavItem {
  label: string;
  icon: Icon;
  to: string;
  exact?: boolean;
}

const NAV_ITEMS: INavItem[] = [
  { label: 'Dashboard', icon: IconLayoutDashboard, to: '/', exact: true },
  { label: 'Transactions', icon: IconReceipt2, to: '/transactions' },
  { label: 'Categories', icon: IconCategory, to: '/categories' },
  { label: 'Accounts', icon: IconWallet, to: '/accounts' },
  { label: 'Budgets', icon: IconChartPie, to: '/budgets' },
  { label: 'Calendar', icon: IconCalendar, to: '/calendar' },
];

interface SidebarProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ collapsed, onNavigate }: SidebarProps) {
  return (
    <aside className="app-sidebar" data-collapsed={collapsed}>
      <div className="app-sidebar-logo">
        <span className="app-sidebar-logo-text">{collapsed ? 'E' : 'Expensify'}</span>
      </div>

      <Stack gap={4} className="app-sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.to}
            item={item}
            collapsed={collapsed}
            onClick={onNavigate}
          />
        ))}
      </Stack>
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
      <Icon size={20} className="app-sidebar-nav-icon" />
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
