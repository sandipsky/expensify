import { Stack, Tooltip, UnstyledButton } from '@mantine/core';
import {
  IconArrowsExchange,
  IconCalendar,
  IconCategory,
  IconChartPie,
  IconDatabaseExport,
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

interface INavSection {
  label?: string;
  items: INavItem[];
}

const NAV_SECTIONS: INavSection[] = [
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

interface SidebarProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ collapsed, onNavigate }: SidebarProps) {
  return (
    <aside className="app-sidebar" data-collapsed={collapsed}>
      <div className="app-sidebar-logo">
        <span className="app-sidebar-logo-mark">
          <IconArrowsExchange size={18} stroke={2.5} />
        </span>
        {!collapsed && <span className="app-sidebar-logo-text">Expensify</span>}
      </div>

      <div className="app-sidebar-nav">
        {NAV_SECTIONS.map((section, index) => (
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
