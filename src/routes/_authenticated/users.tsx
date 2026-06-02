import { createFileRoute, redirect } from '@tanstack/react-router';
import { UsersPage } from '../../features/users';
import { getCurrentUser } from '../../features/auth';

export const Route = createFileRoute('/_authenticated/users')({
  beforeLoad: () => {
    const user = getCurrentUser();
    if (user?.role !== 'admin') {
      throw redirect({ to: '/' });
    }
  },
  component: UsersPage,
});
