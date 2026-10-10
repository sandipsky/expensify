import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  updatePassword,
  updateProfile as updateLogin,
  verifyBeforeUpdateEmail,
  type User,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { addDefaultsTo } from '@/features/categories/categories.api'
import { AppError, hasFirebaseCode } from '@/lib/errors'
import { auth } from '@/lib/firebase'
import { USER_COLLECTIONS, commitInBatches, db, userCollection } from '@/lib/firestore'
import { expectSessionEnd } from './auth.session'
import {
  MAX_USERNAME_LENGTH,
  MIN_USERNAME_LENGTH,
  USERNAME_PATTERN,
  type IChangeEmailBody,
  type IChangePasswordBody,
  type ILoginBody,
  type IPreferences,
  type IPreferencesBody,
  type IProfile,
  type IProfileBody,
  type IRegisterBody,
} from './auth.types'

// Logins are Firebase Auth's email and password. The profile lives in
// users/{uid}, and usernames/{username} maps each username to its login's
// email, which is how a username logs in. That document is public, so
// anyone who knows a username can read its email (docs/requirements.md §9).

const profileDoc = (uid: string) => doc(db, 'users', uid)
const usernameDoc = (username: string) => doc(db, 'usernames', username)

/** What a new profile's preferences start as: the device's theme, and alerts for what the user sets up. */
const DEFAULT_PREFERENCES: IPreferences = {
  theme: 'system',
  notifications: {
    dailyReminder: false,
    reminderTime: '20:00',
    budgetAlerts: true,
    billReminders: true,
  },
}

/** The codes Firebase answers a wrong email or password with. */
const BAD_CREDENTIALS = [
  'auth/invalid-credential',
  'auth/invalid-login-credentials',
  'auth/wrong-password',
  'auth/user-not-found',
  'auth/invalid-email',
]

const taken = (field: 'username' | 'email', message: string) => new AppError(message, 'taken', field)

function currentUser(): User {
  const user = auth.currentUser
  if (!user) throw new AppError("You're logged out. Log in again.", 'signed-out')
  return user
}

/**
 * Whether a username can be a Firestore document id too: the signup rules,
 * and not `__…__`, which Firestore keeps for itself.
 */
function isUsableUsername(username: string) {
  return (
    username.length >= MIN_USERNAME_LENGTH &&
    username.length <= MAX_USERNAME_LENGTH &&
    USERNAME_PATTERN.test(username) &&
    !/^__.*__$/.test(username)
  )
}

/** The emails a username logs in with: its login's, then a new one still waiting on its link. */
async function emailsFor(username: string): Promise<string[]> {
  if (!isUsableUsername(username)) return []
  const data = (await getDoc(usernameDoc(username))).data()
  return [data?.email, data?.pendingEmail].filter(
    (email): email is string => typeof email === 'string' && email !== '',
  )
}

/** Logs in with the username or the email. Usernames can't hold "@", so the value says which. */
export const login = async ({ usernameOrEmail, password }: ILoginBody) => {
  const value = usernameOrEmail.trim().toLowerCase()
  const emails = value.includes('@') ? [value] : await emailsFor(value)
  for (const email of emails) {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return
    } catch (error) {
      if (!hasFirebaseCode(error, ...BAD_CREDENTIALS)) throw error
    }
  }
  throw new AppError('Wrong username, email or password.', 'wrong-password')
}

/**
 * Creates the login, then its profile, its username and the default
 * categories in one batch, and stays logged in. When the batch fails, the
 * login is deleted again, so the same email can sign up once more.
 */
export const register = async ({ name, username, email, password }: IRegisterBody) => {
  const handle = username.trim().toLowerCase()
  if (!isUsableUsername(handle)) {
    throw taken('username', "That username can't be used. Try another one.")
  }
  if ((await getDoc(usernameDoc(handle))).exists()) {
    throw taken('username', 'That username is taken. Try another one.')
  }

  let user: User
  try {
    user = (await createUserWithEmailAndPassword(auth, email.trim(), password)).user
  } catch (error) {
    if (hasFirebaseCode(error, 'auth/email-already-in-use')) {
      throw taken('email', "There's already an account with this email. Log in instead.")
    }
    throw error
  }

  try {
    await updateLogin(user, { displayName: name.trim() })
    const batch = writeBatch(db)
    batch.set(profileDoc(user.uid), {
      name: name.trim(),
      username: handle,
      email: user.email,
      pendingEmail: null,
      photoUrl: null,
      preferences: DEFAULT_PREFERENCES,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    batch.set(usernameDoc(handle), { uid: user.uid, email: user.email, pendingEmail: null })
    addDefaultsTo(batch, [])
    await batch.commit()
  } catch (error) {
    await deleteUser(user).catch(() => undefined)
    // Someone took the username a moment ago, and the rules refused to overwrite it.
    if (hasFirebaseCode(error, 'permission-denied') && (await getDoc(usernameDoc(handle))).exists()) {
      throw taken('username', 'That username is taken. Try another one.')
    }
    throw error
  }
}

/** The stored profile, with defaults for any preference it doesn't have. */
function toProfile(snapshot: DocumentSnapshot): IProfile {
  const data = snapshot.data() ?? {}
  return {
    id: snapshot.id,
    name: data.name ?? '',
    username: data.username ?? null,
    email: data.email ?? '',
    pendingEmail: data.pendingEmail ?? null,
    photoUrl: data.photoUrl ?? null,
    preferences: {
      theme: data.preferences?.theme ?? DEFAULT_PREFERENCES.theme,
      notifications: { ...DEFAULT_PREFERENCES.notifications, ...data.preferences?.notifications },
    },
  }
}

/**
 * A login whose signup stopped before its batch was written, and whose
 * login couldn't be deleted either, gets its profile and categories now.
 * It has no username, so it logs in with its email.
 */
async function createMissingProfile(user: User): Promise<IProfile> {
  const batch = writeBatch(db)
  batch.set(profileDoc(user.uid), {
    name: user.displayName || user.email?.split('@')[0] || 'You',
    username: null,
    email: user.email,
    pendingEmail: null,
    photoUrl: null,
    preferences: DEFAULT_PREFERENCES,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  const categories = await getDocs(userCollection('categories'))
  if (categories.empty) addDefaultsTo(batch, [])
  await batch.commit()
  return toProfile(await getDoc(profileDoc(user.uid)))
}

/**
 * Follows the login's email once its verification link was opened: the
 * profile and the username's lookup take the new one, and nothing is pending.
 */
async function followLoginEmail(user: User, profile: IProfile): Promise<IProfile> {
  // The rules check the username's email against the session's, so it must be fresh.
  await user.getIdToken(true)
  const email = user.email ?? profile.email
  const batch = writeBatch(db)
  batch.update(profileDoc(user.uid), { email, pendingEmail: null, updatedAt: serverTimestamp() })
  if (profile.username) batch.update(usernameDoc(profile.username), { email, pendingEmail: null })
  await batch.commit()
  return { ...profile, email, pendingEmail: null }
}

/** The logged-in user's profile and preferences. */
export const getProfile = async (): Promise<IProfile> => {
  const user = currentUser()
  // Picks up an email changed through its link. Offline, the cached login will do.
  await user.reload().catch(() => undefined)
  const snapshot = await getDoc(profileDoc(user.uid))
  if (!snapshot.exists()) return createMissingProfile(user)
  const profile = toProfile(snapshot)
  return user.email && user.email !== profile.email ? followLoginEmail(user, profile) : profile
}

/** Saves the name or photo; the login's display name follows the name. */
export const updateProfile = async ({ name, photoUrl }: IProfileBody) => {
  const user = currentUser()
  await updateDoc(profileDoc(user.uid), {
    ...(name !== undefined && { name: name.trim() }),
    ...(photoUrl !== undefined && { photoUrl }),
    updatedAt: serverTimestamp(),
  })
  if (name !== undefined) await updateLogin(user, { displayName: name.trim() }).catch(() => undefined)
  return getProfile()
}

/** Proves it's really the user before a sensitive change; Firebase then counts the login as recent. */
async function reauthenticate(user: User, password: string) {
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? '', password))
  } catch (error) {
    if (hasFirebaseCode(error, ...BAD_CREDENTIALS)) {
      throw new AppError("That password isn't right", 'wrong-password')
    }
    throw error
  }
}

/** Marks `pendingEmail` on the profile and the username's lookup, or clears it with null. */
async function savePendingEmail(user: User, pendingEmail: string | null) {
  const profile = toProfile(await getDoc(profileDoc(user.uid)))
  const batch = writeBatch(db)
  batch.update(profileDoc(user.uid), { pendingEmail, updatedAt: serverTimestamp() })
  if (profile.username) batch.update(usernameDoc(profile.username), { pendingEmail })
  await batch.commit()
}

/**
 * Sends a verification link to the new email, after the password proves
 * it's the user. The login switches once the link is opened; until then the
 * new email is pending, and logging in with the username tries both.
 * Asking for the current email again cancels a pending change.
 */
export const changeEmail = async ({ email, password }: IChangeEmailBody) => {
  const user = currentUser()
  const next = email.trim().toLowerCase()
  await reauthenticate(user, password)
  if (next === user.email?.toLowerCase()) {
    await savePendingEmail(user, null)
    return getProfile()
  }
  try {
    await verifyBeforeUpdateEmail(user, next)
  } catch (error) {
    if (hasFirebaseCode(error, 'auth/email-already-in-use')) {
      throw taken('email', 'That email belongs to another account.')
    }
    throw error
  }
  await savePendingEmail(user, next)
  return getProfile()
}

/** Saves the preferences sent; the others stay as they are. */
export const updatePreferences = async ({ theme, notifications }: IPreferencesBody) => {
  const changes: Record<string, unknown> = { updatedAt: serverTimestamp() }
  if (theme !== undefined) changes['preferences.theme'] = theme
  for (const [key, value] of Object.entries(notifications ?? {})) {
    if (value !== undefined) changes[`preferences.notifications.${key}`] = value
  }
  await updateDoc(profileDoc(currentUser().uid), changes)
}

/** Refuses as `wrong-password` when the current password is wrong. */
export const changePassword = async ({ currentPassword, newPassword }: IChangePasswordBody) => {
  const user = currentUser()
  await reauthenticate(user, currentPassword)
  await updatePassword(user, newPassword)
}

/**
 * Deletes everything the user entered, then their username, their profile
 * and their login, once their password proves it's them. Refuses as
 * `wrong-password` when it's wrong. The caller leaves the app afterwards.
 */
export const deleteAccount = async (password: string) => {
  const user = currentUser()
  await reauthenticate(user, password)

  const collections = await Promise.all(USER_COLLECTIONS.map((name) => getDocs(userCollection(name))))
  await commitInBatches(
    collections.flatMap((snapshot) => snapshot.docs.map((d) => (batch) => batch.delete(d.ref))),
  )

  const profile = toProfile(await getDoc(profileDoc(user.uid)))
  const batch = writeBatch(db)
  if (profile.username && (await getDoc(usernameDoc(profile.username))).exists()) {
    batch.delete(usernameDoc(profile.username))
  }
  batch.delete(profileDoc(user.uid))
  await batch.commit()

  expectSessionEnd()
  await deleteUser(user)
}
