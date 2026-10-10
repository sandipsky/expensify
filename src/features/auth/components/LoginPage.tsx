import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { LUIButton, LUIPasswordInput, LUIUsernameInput } from '@lumen-ui/react'
import { getApiErrorMessage } from '@/lib'
import { safeRedirect } from '../auth.domain'
import { useLogin } from '../auth.query'
import { useAuthStore } from '../auth.store'
import { AuthCard } from './AuthCard'

const loginSchema = z.object({
  usernameOrEmail: z.string().trim().min(1, 'Enter your username or email'),
  password: z.string().min(1, 'Enter your password'),
})

type LoginFormValues = z.infer<typeof loginSchema>

type LoginPageProps = {
  /** Where to go after a successful login (comes from `?redirect=...`). */
  redirectTo?: string
  /** The account was just deleted from Settings. */
  deleted?: boolean
}

/**
 * `/login`: username or email, and password, with a link to sign up.
 * Afterwards the user goes on to the page they were heading for, or the
 * dashboard.
 */
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
    defaultValues: { usernameOrEmail: '', password: '' },
  })

  const onSubmit = (values: LoginFormValues) => {
    login.mutate(values, {
      onSuccess: (data) => {
        setAuth(data.token, data.user)
        navigate({ href: safeRedirect(redirectTo) })
      },
    })
  }

  return (
    <AuthCard title="Log in" subtitle="Welcome back. Your money is where you left it.">
      {deleted && (
        <div className="alert success auth-alert" role="status">
          Your account and everything in it were deleted.
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <LUIUsernameInput
          label="Username or email"
          placeholder="Your username or email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          error={errors.usernameOrEmail?.message}
          {...register('usernameOrEmail')}
        />

        <LUIPasswordInput
          label="Password"
          placeholder="Your password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        {login.isError && (
          <div className="alert error auth-alert" role="alert">
            {getApiErrorMessage(login.error)}
          </div>
        )}

        <div className="auth-form__actions">
          <LUIButton type="submit" size="lg" width="full" disabled={login.isPending}>
            {login.isPending ? 'Logging in...' : 'Log in'}
          </LUIButton>
        </div>
      </form>

      <p className="auth-links">
        New here?{' '}
        <Link className="auth-link" to="/signup" search={{ redirect: redirectTo }}>
          Create an account
        </Link>
      </p>

      <p className="auth-note">
        Just trying it out? Log in as <code>admin</code> / <code>admin</code>.
      </p>
    </AuthCard>
  )
}
