/**
 * The four arrows the summary tiles draw, which lumen-ui doesn't ship. Paths
 * are Material Symbols Outlined, weight 400 (Apache 2.0), the same files
 * expensify-web renders under these names.
 */
const PATHS = {
  south_west: 'M200-200v-396h60v294l498-498 42 42-498 498h294v60H200Z',
  north_east: 'm202-160-42-42 498-498H364v-60h396v396h-60v-294L202-160Z',
  arrow_upward: 'M450-160v-526L202-438l-42-42 320-320 320 320-42 42-248-248v526h-60Z',
  arrow_downward: 'M450-800v526L202-522l-42 42 320 320 320-320-42-42-248 248v-526h-60Z',
} as const

export type ArrowName = keyof typeof PATHS

interface ArrowIconProps {
  name: ArrowName
  /** Width and height in px. */
  size?: number
  /** Any CSS color; the surrounding text color by default. */
  color?: string
}

/** Decorative: the text beside it always says the same thing. */
export const ArrowIcon = ({ name, size = 16, color }: ArrowIconProps) => (
  <svg
    className="arrow-icon"
    viewBox="0 -960 960 960"
    width={size}
    height={size}
    fill="currentColor"
    style={color ? { color } : undefined}
    aria-hidden="true"
    focusable="false"
  >
    <path d={PATHS[name]} />
  </svg>
)
