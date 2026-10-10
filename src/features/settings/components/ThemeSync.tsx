import { useEffect } from 'react'
import { usePreferences } from '@/features/auth/auth.query'
import { applyTheme } from '../theme'

/**
 * Applies the profile's theme once it loads and whenever it changes, which
 * Settings does before the server answers. Until then the theme index.html
 * applied stays. Renders nothing; mounted once in the signed-in layout.
 */
export function ThemeSync() {
  const theme = usePreferences()?.theme

  useEffect(() => {
    if (theme) applyTheme(theme)
  }, [theme])

  return null
}
