export interface ILoginBody {
  /** Either one logs in; neither is case-sensitive. */
  usernameOrEmail: string
  password: string
}

/** A new account; signing up logs straight in. */
export interface IRegisterBody {
  name: string
  username: string
  email: string
  password: string
}

/** Signup fields that can be refused as taken; the error names which. */
export type RegisterConflictField = 'username' | 'email'

// Account rules. Keep in sync with firestore.rules.

/** Fewest characters a new password may have. Firebase itself asks for 6. */
export const MIN_PASSWORD_LENGTH = 8

/** Most characters a name may have. */
export const MAX_NAME_LENGTH = 60

/** Usernames are 3 to 30 of these, kept lowercase. */
export const USERNAME_PATTERN = /^[a-z0-9._-]+$/
export const MIN_USERNAME_LENGTH = 3
export const MAX_USERNAME_LENGTH = 30

/** Light, dark, or following the device's setting. */
export const THEMES = ['light', 'dark', 'system'] as const

export type Theme = (typeof THEMES)[number]

/** Which notifications the user gets, and when the daily reminder comes. */
export interface INotificationPrefs {
  /** A reminder to log the day's spending; opt-in. */
  dailyReminder: boolean
  /** Local time of the daily reminder, 24-hour `HH:mm`. */
  reminderTime: string
  /** When a budget reaches one of its alert thresholds. */
  budgetAlerts: boolean
  /** For ask-first recurring entries: the day before and once they're due. */
  billReminders: boolean
}

export interface IPreferences {
  theme: Theme
  notifications: INotificationPrefs
}

/** The logged-in user, from `users/{uid}`. The username can't change; everything else can. */
export interface IProfile {
  /** The Firebase Auth uid. */
  id: string
  name: string
  /**
   * Logs in like the email does. Null only for a login whose signup stopped
   * before its profile was written; that one logs in with its email.
   */
  username: string | null
  /** The email the login uses. */
  email: string
  /** A new email waiting for its verification link to be opened, or null. */
  pendingEmail: string | null
  /** A small JPEG as a data URL, or null to show initials. */
  photoUrl: string | null
  preferences: IPreferences
}

/** Profile fields to change; the ones left out stay as they are. The email changes apart. */
export interface IProfileBody {
  name?: string
  photoUrl?: string | null
}

/** A new login email, and the password that proves it's the user asking. */
export interface IChangeEmailBody {
  email: string
  password: string
}

/** Preferences to change; they're merged into the rest. */
export interface IPreferencesBody {
  theme?: Theme
  notifications?: Partial<INotificationPrefs>
}

export interface IChangePasswordBody {
  currentPassword: string
  newPassword: string
}
