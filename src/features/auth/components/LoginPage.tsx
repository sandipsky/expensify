import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from '@tanstack/react-router'
import { getApiErrorMessage } from '@/lib'
import { useLogin } from '../auth.query'
import { useAuthStore } from '../auth.store'

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

type LoginPageProps = {
  /** Where to go after a successful login (comes from `?redirect=...`). */
  redirectTo?: string
  /** The account was just deleted from Settings. */
  deleted?: boolean
}

export const LoginPage = ({ redirectTo, deleted }: LoginPageProps) => {
  const navigate = useNavigate()
  const login = useLogin()
  const setAuth = useAuthStore((s) => s.setAuth)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const onSubmit = (values: LoginFormValues) => {
    login.mutate(values, {
      onSuccess: (data) => {
        setAuth(data.token, data.user)
        // Only follow same-site paths, never an external URL smuggled into the query string.
        const target = redirectTo?.startsWith('/') ? redirectTo : '/'
        navigate({ href: target })
      },
    })
  }

  return (
    <div className="login-page">
      <div className="card">
        <h1>Login</h1>
        <p className="muted">
          Mock credentials: <code>admin</code> / <code>admin</code>
        </p>

        {deleted && (
          <div className="alert success">Your account and everything in it were deleted.</div>
        )}

        <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input id="username" type="text" autoComplete="username" {...register('username')} />
            {errors.username && <span className="error">{errors.username.message}</span>}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && <span className="error">{errors.password.message}</span>}
          </div>

          {login.isError && <div className="alert">{getApiErrorMessage(login.error)}</div>}

          <button className="btn" type="submit" disabled={login.isPending}>
            {login.isPending ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
