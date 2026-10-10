import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { LoginPage, isLoggedIn, sessionReady } from '@/features/auth'

// /login?redirect=/transactions -> after logging in, go back to where the user was heading.
// /login?deleted=1 -> the account was just deleted, so say so.
const loginSearchSchema = z.object({
  redirect: z.string().optional(),
  deleted: z.coerce.boolean().optional(),
})

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  // Already logged in? Skip the login page.
  beforeLoad: async () => {
    await sessionReady()
    if (isLoggedIn()) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginRoute,
})

function LoginRoute() {
  const { redirect: redirectTo, deleted } = Route.useSearch()
  return <LoginPage redirectTo={redirectTo} deleted={deleted} />
}
