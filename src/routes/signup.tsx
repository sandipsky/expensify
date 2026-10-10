import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { SignupPage, isLoggedIn, sessionReady } from '@/features/auth'

// /signup?redirect=/transactions -> once the account exists, go on to where the user was heading.
const signupSearchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/signup')({
  validateSearch: signupSearchSchema,
  // Already logged in? There's nothing to sign up for.
  beforeLoad: async () => {
    await sessionReady()
    if (isLoggedIn()) {
      throw redirect({ to: '/' })
    }
  },
  component: SignupRoute,
})

function SignupRoute() {
  const { redirect: redirectTo } = Route.useSearch()
  return <SignupPage redirectTo={redirectTo} />
}
