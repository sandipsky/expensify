import {
  ActionIcon,
  Anchor,
  Avatar,
  Breadcrumbs,
  Menu,
  UnstyledButton,
} from '@mantine/core';
import { IconChevronDown, IconLogout, IconMenu2 } from '@tabler/icons-react';
import './Header.css';

export interface IHeaderUser {
  name: string;
  avatarUrl?: string;
}

interface HeaderProps {
  onToggleSidebar: () => void;
  breadcrumbs?: string[];
  user?: IHeaderUser;
  onLogout?: () => void;
}

const DEFAULT_USER: IHeaderUser = { name: 'Guest' };

export function Header({
  onToggleSidebar,
  breadcrumbs = ['Dashboard'],
  user = DEFAULT_USER,
  onLogout,
}: HeaderProps) {
  return (
    <header className="app-header">
      <ActionIcon
        variant="subtle"
        color="gray"
        size="lg"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <IconMenu2 size={20} />
      </ActionIcon>

      <Breadcrumbs separator="/" className="app-header-breadcrumbs">
        {breadcrumbs.map((label, index) => {
          const isLast = index === breadcrumbs.length - 1;
          if (isLast) {
            return (
              <span key={label} className="app-header-breadcrumb-current">
                {label}
              </span>
            );
          }
          return (
            <Anchor key={label} c="dimmed" underline="never" size="sm">
              {label}
            </Anchor>
          );
        })}
      </Breadcrumbs>

      <div className="app-header-spacer" />

      <Menu position="bottom-end" withArrow shadow="md" width={180}>
        <Menu.Target>
          <UnstyledButton className="app-header-user-button" aria-label="Open user menu">
            <Avatar src={user.avatarUrl} radius="xl" size={32} color="blue">
              {user.name.slice(0, 1).toUpperCase()}
            </Avatar>
            <span className="app-header-user-name">{user.name}</span>
            <IconChevronDown size={16} />
          </UnstyledButton>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconLogout size={16} />}
            onClick={onLogout}
            color="red"
          >
            Logout
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </header>
  );
}
