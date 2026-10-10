import { FirebaseError } from 'firebase/app'

/**
 * Why a write was refused, where the screen does something other than show
 * the message: a wrong password goes on the password field, a taken
 * username or email on its own field, and an occurrence another tab already
 * handled isn't reported at all.
 */
export type AppErrorCode = 'wrong-password' | 'taken' | 'stale' | 'not-found' | 'signed-out'

/** A refusal with a message written for the screen. */
export class AppError extends Error {
  readonly code: AppErrorCode
  /** The form field it's about, as a taken username or email names. */
  readonly field?: string

  constructor(message: string, code: AppErrorCode, field?: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.field = field
  }
}

export const isAppError = (error: unknown, code: AppErrorCode): error is AppError =>
  error instanceof AppError && error.code === code

/** Whether Firebase threw one of these codes, like `auth/too-many-requests` or `permission-denied`. */
export const hasFirebaseCode = (error: unknown, ...codes: string[]) =>
  error instanceof FirebaseError && codes.includes(error.code)

// Sentences for the Firebase error codes people can run into. Firebase's own
// messages read like "Firebase: Error (auth/…)", so they never reach the screen.
const MESSAGES: Readonly<Record<string, string>> = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/invalid-login-credentials': 'Wrong email or password.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'Wrong email or password.',
  'auth/invalid-email': "That email address doesn't look right.",
  'auth/missing-password': 'Enter your password.',
  'auth/email-already-in-use': "There's already an account with this email.",
  'auth/weak-password': 'That password is too weak. Use at least 8 characters.',
  'auth/password-does-not-meet-requirements': "That password doesn't meet the requirements.",
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes, then try again.',
  'auth/network-request-failed': "Can't reach the server. Check your connection and try again.",
  'auth/user-disabled': 'This login has been switched off.',
  'auth/operation-not-allowed': "Email and password login isn't turned on in Firebase yet.",
  'auth/requires-recent-login': 'For safety, log in again before doing this.',
  'auth/user-token-expired': 'Your session ended. Log in again.',
  'auth/user-mismatch': "That's a different account. Log in again with this one.",
  'permission-denied': "The server refused this change. Reload the page and try again.",
  unauthenticated: "You're logged out. Log in again.",
  unavailable: "Can't reach the server. Check your connection and try again.",
  'deadline-exceeded': 'The server took too long to answer. Try again.',
  'resource-exhausted': 'The database is over its limit for now. Try again later.',
  aborted: 'Something else changed this at the same moment. Try again.',
  'not-found': 'That no longer exists. It may have been deleted in another tab.',
}

/** A human-readable message for whatever a write or a read threw. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof AppError) return error.message
  if (error instanceof FirebaseError) return MESSAGES[error.code] ?? fallback
  if (error instanceof Error) return error.message
  return fallback
}
