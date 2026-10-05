import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { LoginPage, useAuthStore } from '@/features/auth'

// /login?redirect=/products -> after logging in, go back to where the user was heading.
const loginSearchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  // Already logged in? Skip the login page.
  beforeLoad: () => {
    if (useAuthStore.getState().token) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginRoute,
})

function LoginRoute() {
  const { redirect: redirectTo } = Route.useSearch()
  return <LoginPage redirectTo={redirectTo} />
}
