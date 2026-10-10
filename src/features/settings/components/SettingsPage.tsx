import { LUIBreadcrumb, LUISkeleton } from '@lumen-ui/react'
import { useProfile } from '@/features/auth/auth.query'
import { getErrorMessage } from '@/lib'
import { AppearanceSettings } from './AppearanceSettings'
import { DataSettings } from './DataSettings'
import { NotificationSettings } from './NotificationSettings'
import { ProfileSettings } from './ProfileSettings'
import './SettingsPage.scss'

/**
 * `/settings`: the profile and password, the theme, which notifications to
 * get, and deleting data. Amounts always read the Nepali way, so there is no
 * currency or format setting.
 */
export const SettingsPage = () => {
  const { data: profile, isLoading, isError, error } = useProfile()

  if (isLoading) {
    return (
      <div className="settings-page">
        <LUIBreadcrumb title="Settings" />
        <LUISkeleton height="360px" />
        <LUISkeleton height="120px" />
        <LUISkeleton height="240px" />
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="settings-page">
        <LUIBreadcrumb title="Settings" />
        <div className="alert error">{getErrorMessage(error)}</div>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <LUIBreadcrumb title="Settings" />
      <ProfileSettings profile={profile} />
      <AppearanceSettings theme={profile.preferences.theme} />
      <NotificationSettings prefs={profile.preferences.notifications} />
      <DataSettings />
    </div>
  )
}
