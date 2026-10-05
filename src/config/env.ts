import { z } from 'zod'

// Validate environment variables once at startup, so a typo in .env fails
// loudly here instead of surfacing later as a confusing network error.
const envSchema = z.object({
  VITE_APP_ENV: z.enum(['dev', 'qa', 'prod']).default('dev'),
  VITE_API_BASE_URL: z.url('VITE_API_BASE_URL must be a valid URL'),
  VITE_API_TIMEOUT: z.coerce.number().int().positive().default(30000),
})

function validateEnv() {
  const result = envSchema.safeParse(import.meta.env)

  if (!result.success) {
    console.error('Invalid environment variables:')
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`)
    }
    throw new Error('Invalid environment configuration - check your .env file')
  }

  return result.data
}

const env = validateEnv()

// The rest of the app imports `config`, never `import.meta.env` directly.
export const config = {
  api: {
    baseUrl: env.VITE_API_BASE_URL,
    timeout: env.VITE_API_TIMEOUT,
  },
  app: {
    env: env.VITE_APP_ENV,
  },
} as const
