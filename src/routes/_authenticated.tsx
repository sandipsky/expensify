import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { AppLayout } from '../components/layouts';
import { isAuthenticated, useAuth } from '../features/auth';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    if (!isAuthenticated()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
        replace: true,
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, logout } = useAuth();

  return (
    <AppLayout
      user={user ? { name: user.name } : undefined}
      onLogout={logout}
    >
      <Outlet />
    </AppLayout>
  );
}
