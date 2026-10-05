import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth'

export const Home = () => {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="card">
      <h1>Welcome{user ? `, ${user.name}` : ''}</h1>
      <p>
        This is the home page of <strong>expensify</strong>. It lives under the{' '}
        <code>_authenticated</code> layout route, so you only see it when logged in.
      </p>
      <p>
        <Link className="btn" to="/products">
          Manage products
        </Link>
      </p>
    </div>
  )
}
