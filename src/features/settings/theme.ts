import type { Theme } from '@/features/auth/auth.types'

/**
 * Where the last theme is kept for the first paint: index.html reads it
 * before the app starts, so a dark theme doesn't flash light while the
 * profile loads, and the login page keeps the last choice. Keep in sync with
 * the script in index.html.
 */
export const THEME_KEY = 'expensify.theme'

/**
 * Applies a theme as `data-theme` on `<html>`: `light` or `dark` pin it, and
 * no attribute follows the device through `prefers-color-scheme`. The colors
 * themselves are the tokens in `_colors.scss`.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Storage blocked: the theme still applies once the profile loads.
  }
}
