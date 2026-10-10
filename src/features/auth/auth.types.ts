export interface ILoginBody {
  username: string
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

/** Fewest characters a new password may have. Keep in sync with mock-server/server.js. */
export const MIN_PASSWORD_LENGTH = 8

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
