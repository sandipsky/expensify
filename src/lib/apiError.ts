import { isAxiosError } from 'axios'

// Pull a human-readable message out of whatever a request threw.
// The mock server always answers failures with `{ message: string }`.
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback
  }
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}
