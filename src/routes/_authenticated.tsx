import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'
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
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <>
      <header className="app-header">
        <strong>expensify</strong>
        <nav>
          <Link to="/" activeOptions={{ exact: true }}>
            Home
          </Link>
          <Link to="/products">Products</Link>
        </nav>
        <span className="spacer" />
        <span className="user">{user?.name}</span>
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => logout()}>
          Logout
        </button>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}
