export interface ILoginBody {
  /** Either one logs in; neither is case-sensitive. */
  usernameOrEmail: string
  password: string
}

export interface IUser {
  id: number
  name: string
  username: string
}

export interface ILoginResponse {
  token: string
  user: IUser
}

/** A new account; signing up logs straight in, answering an {@link ILoginResponse}. */
export interface IRegisterBody {
  name: string
  username: string
  email: string
  password: string
}

/** Signup fields the server can refuse as taken, naming which in a 409 answer. */
export type RegisterConflictField = 'username' | 'email'

// Account rules. Keep in sync with the Auth section of mock-server/server.js.

/** Fewest characters a new password may have. */
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

/** The signed-in user. The username can't change; everything else can. */
export interface IProfile extends IUser {
  email: string
  /** A small JPEG as a data URL, or null to show initials. */
  photoUrl: string | null
  preferences: IPreferences
}

/** Profile fields to change; the ones left out stay as they are. */
export interface IProfileBody {
  name?: string
  email?: string
  photoUrl?: string | null
}

/** Preferences to change; the server merges them into the rest. */
export interface IPreferencesBody {
  theme?: Theme
  notifications?: Partial<INotificationPrefs>
}

export interface IChangePasswordBody {
  currentPassword: string
  newPassword: string
}
