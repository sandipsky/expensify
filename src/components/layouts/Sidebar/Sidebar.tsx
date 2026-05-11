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
import classes from './Sidebar.module.css';

interface INavItem {
  label: string;
  icon: Icon;
  href: string;
}

const NAV_ITEMS: INavItem[] = [
  { label: 'Dashboard', icon: IconLayoutDashboard, href: '/' },
  { label: 'Transactions', icon: IconReceipt2, href: '/transactions' },
  { label: 'Categories', icon: IconCategory, href: '/categories' },
  { label: 'Accounts', icon: IconWallet, href: '/accounts' },
  { label: 'Budgets', icon: IconChartPie, href: '/budgets' },
  { label: 'Calendar', icon: IconCalendar, href: '/calendar' },
];

interface SidebarProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ collapsed, onNavigate }: SidebarProps) {
  return (
    <aside className={classes.sidebar} data-collapsed={collapsed}>
      <div className={classes.logo}>
        <span className={classes.logoText}>{collapsed ? 'E' : 'Expensify'}</span>
      </div>

      <Stack gap={4} className={classes.nav}>
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
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
    <UnstyledButton className={classes.navItem} onClick={onClick}>
      <Icon size={20} className={classes.navIcon} />
      {!collapsed && <span className={classes.navLabel}>{item.label}</span>}
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
