import { useRef } from 'react'
import { LUIAvatar, LUIIcon, LUIMenu, type LUIMenuRef } from '@lumen-ui/react'
import { logout, sessionUser, useProfile } from '@/features/auth'
import { useSettingsActions } from '@/features/settings'
import './account-menu.scss'

/**
 * The header's account button: the user's avatar, opening a menu with who is
 * signed in, changing the password (the same sheet Settings opens) and
 * logging out.
 */
export function AccountMenu() {
  const menu = useRef<LUIMenuRef>(null)
  // The profile once it loads, so a new name or photo shows at once; the login's user until then.
  const profile = useProfile().data
  const user = profile ?? sessionUser()
  const { changePassword } = useSettingsActions()

  if (!user) return null

  // Closed by hand, not on any click inside, so clicking the name and email leaves it open.
  const onChangePassword = () => {
    menu.current?.close()
    void changePassword()
  }

  const onLogout = () => {
    menu.current?.close()
    void logout()
  }

  const trigger = (
    // The label starts with the shown name, so voice control finds the button by what it says.
    <button type="button" className="app-header__account" aria-label={`${user.name}, account menu`}>
      <LUIAvatar imageUrl={profile?.photoUrl} name={user.name} size="28px" />
      <span className="app-header__account-name">{user.name}</span>
    </button>
  )

  return (
    <LUIMenu ref={menu} mode="right" closeOnItemClick={false} appendBody dropdownDisplay={trigger}>
      <div className="app-account">
        <div className="app-account__who">
          <p className="app-account__name">{user.name}</p>
          {profile?.email && <p className="app-account__email">{profile.email}</p>}
        </div>

        <button type="button" className="dropdown-item app-account__item" onClick={onChangePassword}>
          <LUIIcon name="lock" size={18} />
          Change password
        </button>
        <button type="button" className="dropdown-item app-account__item" onClick={onLogout}>
          <LUIIcon name="logout" size={18} />
          Logout
        </button>
      </div>
    </LUIMenu>
  )
}
