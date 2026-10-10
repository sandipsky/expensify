/**
 * A user-picked color (a category's or an account's) as the screen draws it:
 * as picked in light mode, mixed toward white by `--data-color-lift` in dark
 * mode, so dark hues such as navy stay visible on dark surfaces.
 */
export function dataColor(color: string): string {
  return `color-mix(in srgb, ${color}, var(--text-white) var(--data-color-lift))`
}
