import { LUICard, LUISegmentedControl, useLUINotification } from '@lumen-ui/react'
import { useUpdatePreferences } from '@/features/auth/auth.query'
import { THEMES, type Theme } from '@/features/auth/auth.types'
import { getApiErrorMessage } from '@/lib'
import { THEME_OPTIONS } from '../settings.labels'

interface AppearanceSettingsProps {
  theme: Theme
}

/** Settings › Appearance: light, dark or the device's setting. Applies at once. */
export const AppearanceSettings = ({ theme }: AppearanceSettingsProps) => {
  const notify = useLUINotification()
  const save = useUpdatePreferences()

  const setTheme = (value: unknown) => {
    if (!THEMES.includes(value as Theme) || value === theme) return
    save.mutate(
      { theme: value as Theme },
      { onError: (error) => notify.error("Couldn't change the theme", getApiErrorMessage(error)) },
    )
  }

  return (
    <section className="settings-section" aria-labelledby="appearance-heading">
      <h2 className="settings-section__title" id="appearance-heading">
        Appearance
      </h2>

      <LUICard padding="lg">
        <div className="settings-card">
          <div className="settings-card__control" role="group" aria-labelledby="theme-label">
            <span className="settings-card__label" id="theme-label">
              Theme
            </span>
            <LUISegmentedControl size="lg" options={THEME_OPTIONS} value={theme} onChange={setTheme} />
          </div>
          <p className="settings-card__hint">System follows your device's light or dark setting.</p>
        </div>
      </LUICard>
    </section>
  )
}
