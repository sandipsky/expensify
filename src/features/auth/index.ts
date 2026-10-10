export { LoginPage } from './components/LoginPage'
export { SignupPage } from './components/SignupPage'
export {
  isLoggedIn,
  leave,
  logout,
  sessionReady,
  sessionUid,
  sessionUser,
  watchSession,
} from './auth.session'
export {
  profileKeys,
  isWrongPassword,
  useLogin,
  useRegister,
  useProfile,
  usePreferences,
  useUpdateProfile,
  useChangeEmail,
  useUpdatePreferences,
  useChangePassword,
  useDeleteAccount,
} from './auth.query'
export {
  MIN_PASSWORD_LENGTH,
  THEMES,
  type Theme,
  type ILoginBody,
  type IRegisterBody,
  type INotificationPrefs,
  type IPreferences,
  type IProfile,
  type IProfileBody,
  type IChangeEmailBody,
  type IPreferencesBody,
  type IChangePasswordBody,
} from './auth.types'
