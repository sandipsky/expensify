import { z } from 'zod'

// Validate environment variables once at startup, so a typo in .env fails
// loudly here instead of surfacing later as a confusing Firebase error.
// The Firebase values come from the console (docs/firebase.md). They're public
// by design: the security rules in firestore.rules guard the data, not them.

// A flag is on only when written as `true`; empty or left out, it's off.
const flag = z
  .string()
  .optional()
  .transform((value) => value === 'true')

// Left empty in .env, an optional value counts as not set.
const optional = z
  .string()
  .optional()
  .transform((value) => value || undefined)

const envSchema = z.object({
  VITE_APP_ENV: z.enum(['dev', 'qa', 'prod']).default('dev'),
  VITE_FIREBASE_API_KEY: z.string().min(1, 'VITE_FIREBASE_API_KEY is required'),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1, 'VITE_FIREBASE_AUTH_DOMAIN is required'),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1, 'VITE_FIREBASE_PROJECT_ID is required'),
  VITE_FIREBASE_APP_ID: z.string().min(1, 'VITE_FIREBASE_APP_ID is required'),
  VITE_FIREBASE_MESSAGING_SENDER_ID: optional,
  /** Talk to the local Emulator Suite (`npm run emulators`) instead of the cloud project. */
  VITE_FIREBASE_USE_EMULATORS: flag,
  /** reCAPTCHA Enterprise site key for App Check; leave it out to run without App Check. */
  VITE_APP_CHECK_SITE_KEY: optional,
  /** Registers an App Check debug token instead of solving reCAPTCHA; local development only. */
  VITE_APP_CHECK_DEBUG: flag,
})

function validateEnv() {
  const result = envSchema.safeParse(import.meta.env)

  if (!result.success) {
    console.error('Invalid environment variables:')
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`)
    }
    throw new Error('Invalid environment configuration - check your .env file (docs/firebase.md)')
  }

  return result.data
}

const env = validateEnv()

// The rest of the app imports `config`, never `import.meta.env` directly.
export const config = {
  firebase: {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  },
  useEmulators: env.VITE_FIREBASE_USE_EMULATORS,
  appCheck: {
    siteKey: env.VITE_APP_CHECK_SITE_KEY ?? null,
    debug: env.VITE_APP_CHECK_DEBUG,
  },
  app: {
    env: env.VITE_APP_ENV,
  },
} as const
