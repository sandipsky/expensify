import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { AppLayout } from '../components/layouts';
import { isAuthenticated, selectUser, useAuthStore } from '../features/auth';

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
  const user = useAuthStore(selectUser);
  const logout = useAuthStore((state) => state.logout);

  return (
    <AppLayout
      user={user ? { name: user.name } : undefined}
      onLogout={logout}
    >
      <Outlet />
    </AppLayout>
  );
}
