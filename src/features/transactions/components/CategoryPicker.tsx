import { useId, useState, type CSSProperties } from 'react'
import { LUIButton, LUIIcon, type LUIIconName } from '@lumen-ui/react'
import { dataColor } from '@/utils'
import './CategoryPicker.scss'

/** One tile: the category it selects, drawn with its icon and color. */
export interface CategoryOption {
  value: number
  label: string
  icon: LUIIconName
  color: string
}

export interface CategoryPickerProps {
  label?: string
  /** Groups the radios; unique on the page. */
  name: string
  options: readonly CategoryOption[]
  /** The chosen category. */
  value: number | null
  onChange: (value: number) => void
  onBlur?: () => void
  /** Validation message shown under the grid; also applies the error style. */
  error?: string
  disabled?: boolean
}

/** Tiles shown before "Show all": two rows on a phone. */
const COLLAPSED = 8

/**
 * Pick one category from a grid of labelled tiles. It's a radio group
 * underneath, so the arrow keys move through the grid and a tap anywhere on a
 * tile selects it. Long lists start collapsed to the first tiles, with the
 * chosen one kept in view, until "Show all". Controlled; with
 * react-hook-form, wrap it in a `<Controller>`.
 */
export function CategoryPicker({
  label,
  name,
  options,
  value,
  onChange,
  onBlur,
  error,
  disabled,
}: CategoryPickerProps) {
  const labelId = useId()
  const [showAll, setShowAll] = useState(false)

  // The first tiles, plus the chosen one if it's further down, until "Show all".
  const collapsed = !showAll && options.length > COLLAPSED + 1
  let visible: readonly CategoryOption[] = options
  if (collapsed) {
    const shown = options.slice(0, COLLAPSED)
    const chosen = options.find((o) => o.value === value)
    visible = chosen && !shown.includes(chosen) ? [...shown.slice(0, -1), chosen] : shown
  }
  const hidden = options.length - visible.length

  // Not a `.form-group`: lumen colors every span inside a form-group label
  // red (its required-field mark), which would take the tiles' colors away.
  return (
    <div className={`category-picker${error ? ' has-error' : ''}`}>
      {label && (
        <span id={labelId} className="category-picker__title">
          {label}
        </span>
      )}

      <div
        className="category-picker__grid"
        role="radiogroup"
        aria-labelledby={label ? labelId : undefined}
        aria-invalid={error ? true : undefined}
      >
        {visible.map((option) => {
          const checked = option.value === value
          const style = { '--pick-color': dataColor(option.color) } as CSSProperties
          return (
            <label
              key={option.value}
              className={`category-picker__tile${checked ? ' is-checked' : ''}`}
              style={style}
            >
              <input
                type="radio"
                className="category-picker__input"
                name={name}
                value={option.value}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(option.value)}
                onBlur={onBlur}
              />
              <span className="category-picker__icon">
                <LUIIcon name={option.icon} size={22} color="inherit" />
              </span>
              <span className="category-picker__label">{option.label}</span>
            </label>
          )
        })}
      </div>

      {hidden > 0 && (
        <LUIButton
          variant="ghost"
          size="lg"
          className="category-picker__more"
          onClick={() => setShowAll(true)}
        >
          Show all {options.length} categories
        </LUIButton>
      )}

      {error && <span className="category-picker__error">{error}</span>}
    </div>
  )
}
