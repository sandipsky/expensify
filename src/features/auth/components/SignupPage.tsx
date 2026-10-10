import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  LUIButton,
  LUIEmailInput,
  LUIPasswordInput,
  LUITextInput,
  LUIUsernameInput,
} from '@lumen-ui/react'
import { getApiErrorMessage } from '@/lib'
import { safeRedirect } from '../auth.domain'
import { registerConflictField, useRegister } from '../auth.query'
import { useAuthStore } from '../auth.store'
import {
  MAX_NAME_LENGTH,
  MAX_USERNAME_LENGTH,
  MIN_PASSWORD_LENGTH,
  MIN_USERNAME_LENGTH,
  USERNAME_PATTERN,
} from '../auth.types'
import { AuthCard } from './AuthCard'

const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter your name')
    .max(MAX_NAME_LENGTH, `Use at most ${MAX_NAME_LENGTH} characters`),
  // Kept lowercase, so "Sandip" and "sandip" are the same login.
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Choose a username')
    .min(MIN_USERNAME_LENGTH, `Use at least ${MIN_USERNAME_LENGTH} characters`)
    .max(MAX_USERNAME_LENGTH, `Use at most ${MAX_USERNAME_LENGTH} characters`)
    .regex(USERNAME_PATTERN, 'Use only letters, numbers, dots, dashes and underscores'),
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email')
    .pipe(z.email('Enter an email address, like name@example.com')),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`),
})

type SignupFormValues = z.infer<typeof signupSchema>

type SignupPageProps = {
  /** Where to go once the account exists (comes from `?redirect=...`). */
  redirectTo?: string
}

/**
 * `/signup`: name, username, email and a password of at least 8 characters
 * with the strength checklist. The new account logs straight in, with no
 * verification step, and goes on to the page the user was heading for.
 */
export const SignupPage = ({ redirectTo }: SignupPageProps) => {
  const navigate = useNavigate()
  const signup = useRegister()
  const setAuth = useAuthStore((s) => s.setAuth)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', username: '', email: '', password: '' },
  })

  const onSubmit = (values: SignupFormValues) => {
    signup.mutate(values, {
      onSuccess: (data) => {
        setAuth(data.token, data.user)
        navigate({ href: safeRedirect(redirectTo) })
      },
      onError: (error) => {
        const field = registerConflictField(error)
        if (field) setError(field, { message: getApiErrorMessage(error) }, { shouldFocus: true })
      },
    })
  }

  // A taken username or email shows on its field instead.
  const signupError =
    signup.error && !registerConflictField(signup.error) ? signup.error : null

  return (
    <AuthCard
      title="Create an account"
      subtitle="Track income, expenses and transfers in one place."
    >
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <LUITextInput
          label="Name"
          placeholder="What should we call you?"
          autoComplete="name"
          autoFocus
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="auth-field">
          <LUIUsernameInput
            label="Username"
            placeholder="Like ram.thapa"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            error={errors.username?.message}
            {...register('username')}
          />
          <p className="auth-hint">
            You can log in with it or your email. It can't be changed later.
          </p>
        </div>

        <LUIEmailInput
          label="Email"
          placeholder="name@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <LUIPasswordInput
          label="Password"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          autoComplete="new-password"
          showRules
          error={errors.password?.message}
          {...register('password')}
        />

        {signupError && (
          <div className="alert error auth-alert" role="alert">
            {getApiErrorMessage(signupError)}
          </div>
        )}

        <div className="auth-form__actions">
          <LUIButton type="submit" size="lg" width="full" disabled={signup.isPending}>
            {signup.isPending ? 'Creating your account...' : 'Create account'}
          </LUIButton>
        </div>

        <p className="auth-note">You can start right away. No verification email is sent.</p>
      </form>

      <p className="auth-links">
        Already have an account?{' '}
        <Link className="auth-link" to="/login" search={{ redirect: redirectTo }}>
          Log in
        </Link>
      </p>
    </AuthCard>
  )
}
