import { LUIButton, LUIIcon } from '@lumen-ui/react'

interface ChartToggleProps {
  pressed: boolean
  onChange: (pressed: boolean) => void
  className?: string
}

/**
 * The "Table" toggle in a chart's top row. A toggle button keeps one label and
 * reports its state through `aria-pressed`, so it reads "Table, toggle button,
 * pressed" while the table is shown.
 */
export const ChartToggle = ({ pressed, onChange, className }: ChartToggleProps) => (
  <LUIButton
    variant="ghost"
    size="sm"
    className={`chart-toggle${pressed ? ' is-on' : ''}${className ? ` ${className}` : ''}`}
    aria-pressed={pressed}
    onClick={() => onChange(!pressed)}
  >
    <LUIIcon name="list" size={16} color="inherit" />
    Table
  </LUIButton>
)
