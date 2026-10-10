import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'

// The Firebase Auth session. It persists in IndexedDB until the user logs
// out, and every tab shares it.

/** Resolves once Firebase has restored the saved session, or found there is none. */
export const sessionReady = () => auth.authStateReady()

/** Whether someone is logged in. Ask once `sessionReady` has resolved. */
export const isLoggedIn = () => auth.currentUser !== null

/** The logged-in user's uid, or null. */
export const sessionUid = () => auth.currentUser?.uid ?? null

/** Who is logged in, for the header until the profile loads. */
export function sessionUser(): { name: string } | null {
  const user = auth.currentUser
  return user && { name: user.displayName || user.email || '' }
}

/** Set once the app leaves on purpose, so `watchSession` doesn't send the user elsewhere too. */
let leaving = false

/** The session is about to end on purpose, as deleting the login ends it. */
export function expectSessionEnd() {
  leaving = true
}

/**
 * Loads `to` with a full page load. On purpose: it also drops the in-memory
 * React Query cache, so nothing of this user's is left for the next one.
 */
export function leave(to: string) {
  leaving = true
  window.location.href = to
}

/** Logs out and loads `to`, the login page unless given. */
export async function logout(to = '/login') {
  leaving = true
  await signOut(auth).catch(() => undefined)
  leave(to)
}

/**
 * Sends the user to the login page when the session ends while a page that
 * needs it is open: they logged out in another tab, or the login was deleted
 * or its email or password changed elsewhere. Returns the unsubscribe.
 */
export function watchSession(): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (!user && !leaving) leave('/login')
  })
}
