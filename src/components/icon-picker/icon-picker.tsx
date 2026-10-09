import { useId, type CSSProperties } from 'react'
import { LUIIcon, type LUIIconName } from '@lumen-ui/react'
import './icon-picker.scss'

/** An icon tile: the icon it draws is the value it selects. */
export interface IconOption {
  value: LUIIconName
  /** Accessible name, read in place of the icon. */
  label: string
  disabled?: boolean
}

export interface IconPickerProps {
  label?: string
  /** Groups the radios; unique on the page. */
  name: string
  options: readonly IconOption[]
  /** The chosen icon. */
  value?: LUIIconName
  onChange: (value: LUIIconName) => void
  onBlur?: () => void
  /** Color of the chosen tile, to preview the icon as it will be drawn. Default: the accent. */
  color?: string
  disabled?: boolean
}

/**
 * Pick one icon from a grid of 48px tiles. It's a radio group underneath, so
 * the arrow keys move through the grid and a tap anywhere on a tile selects
 * it. The grid grows with its options, so a long list belongs in a scrolling
 * container such as a sheet's fields. Controlled; with react-hook-form, wrap
 * it in a `<Controller>`.
 */
export function IconPicker({
  label,
  name,
  options,
  value,
  onChange,
  onBlur,
  color = 'var(--accent)',
  disabled,
}: IconPickerProps) {
  const labelId = useId()
  const style = { '--pick-color': color } as CSSProperties

  return (
    <div className="form-group icon-picker" style={style}>
      {label && <label id={labelId}>{label}</label>}

      <div
        className="icon-picker__grid"
        role="radiogroup"
        aria-labelledby={label ? labelId : undefined}
      >
        {options.map((option) => {
          const checked = option.value === value
          return (
            <label
              key={option.value}
              className={`icon-picker__tile${checked ? ' is-checked' : ''}`}
            >
              <input
                type="radio"
                className="icon-picker__input"
                name={name}
                value={option.value}
                checked={checked}
                disabled={disabled || option.disabled}
                aria-label={option.label}
                onChange={() => onChange(option.value)}
                onBlur={onBlur}
              />
              <LUIIcon name={option.value} size={24} color="inherit" />
            </label>
          )
        })}
      </div>
    </div>
  )
}
