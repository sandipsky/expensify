import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout'
import { useAuthStore } from '@/features/auth'

// Layout route: everything inside src/routes/_authenticated/ requires a login.
// `beforeLoad` runs before any child route renders - think of it as a bouncer.
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    const isAuthenticated = !!useAuthStore.getState().token
    if (!isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}
