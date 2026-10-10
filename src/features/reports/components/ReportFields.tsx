import { useId } from 'react'
import { LUIDateInput, LUISegmentedControl, LUISelect, LUIToggle } from '@lumen-ui/react'
import type { IAccount } from '@/features/accounts/account.types'
import { compareCategories } from '@/features/categories/category.domain'
import type { CategoryType, ICategory } from '@/features/categories/category.types'
import { orderedRange, parseYmd, toYmd } from '@/utils'
import type { PeriodState } from '../report.domain'
import { REPORT_PRESET_OPTIONS } from '../report.labels'
import { REPORT_PRESETS, type PeriodSearch, type ReportPreset } from '../report.types'

interface PeriodFieldProps {
  state: PeriodState
  /** The period part of the URL to apply. */
  onChange: (search: PeriodSearch) => void
}

/**
 * The period select, and two dates when it's a custom range. Custom starts
 * from whatever the report showed; the frame's summary line names the range.
 */
export const PeriodField = ({ state, onChange }: PeriodFieldProps) => {
  const select = (value: unknown) => {
    const preset = value as ReportPreset
    if (!REPORT_PRESETS.includes(preset)) return
    if (preset === 'custom') onChange({ period: preset, from: state.range.start, to: state.range.end })
    else onChange({ period: preset, from: undefined, to: undefined })
  }

  const setDate = (edge: 'start' | 'end', date: Date | null) => {
    if (!date) return
    const next = { ...state.custom, [edge]: toYmd(date) }
    const { start, end } = orderedRange(next.start, next.end)
    onChange({ period: 'custom', from: start, to: end })
  }

  return (
    <>
      <div className="report-field report-field--period">
        <LUISelect
          label="Period"
          items={REPORT_PRESET_OPTIONS}
          bindValue="value"
          bindLabel="label"
          value={state.preset}
          onChange={select}
        />
      </div>
      {state.preset === 'custom' && (
        <div className="report-dates">
          <LUIDateInput
            label="From"
            calendar="ad"
            clearable={false}
            value={parseYmd(state.custom.start)}
            onChange={(date) => setDate('start', date)}
          />
          <LUIDateInput
            label="To"
            calendar="ad"
            clearable={false}
            value={parseYmd(state.custom.end)}
            onChange={(date) => setDate('end', date)}
          />
        </div>
      )}
    </>
  )
}

interface SwitchFieldProps<T extends string> {
  label: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

/** A labelled segmented control: Group by, Expense or Income. */
export function SwitchField<T extends string>({ label, options, value, onChange }: SwitchFieldProps<T>) {
  const id = useId()
  return (
    <div className="report-field" role="group" aria-labelledby={id}>
      <span id={id} className="report-field__label">
        {label}
      </span>
      <LUISegmentedControl
        options={options}
        size="md"
        value={value}
        onChange={(next) => {
          if (options.some((o) => o.value === next)) onChange(next as T)
        }}
      />
    </div>
  )
}

interface AccountsFieldProps {
  accounts: readonly IAccount[]
  value: readonly string[]
  onChange: (ids: string[]) => void
  /** What an empty selection means: "All accounts". */
  placeholder?: string
}

/** Accounts to narrow the report to; archived ones too, since their history still counts. */
export const AccountsField = ({
  accounts,
  value,
  onChange,
  placeholder = 'All accounts',
}: AccountsFieldProps) => {
  const items = accounts.map((a) => ({
    value: a.id,
    label: a.archived ? `${a.name} (archived)` : a.name,
  }))
  return (
    <div className="report-field report-field--wide">
      <LUISelect
        label="Accounts"
        placeholder={placeholder}
        items={items}
        bindValue="value"
        bindLabel="label"
        multiple
        clearable
        searchable={items.length > 8}
        value={[...value]}
        onChange={(next) => onChange((next as string[] | null) ?? [])}
      />
    </div>
  )
}

interface CategoriesFieldProps {
  categories: readonly ICategory[]
  type: CategoryType
  value: readonly string[]
  onChange: (ids: string[]) => void
}

/** Categories of one type to narrow the report to; archived ones too. */
export const CategoriesField = ({ categories, type, value, onChange }: CategoriesFieldProps) => {
  const items = categories
    .filter((c) => c.type === type)
    .sort(compareCategories)
    .map((c) => ({ value: c.id, label: c.archived ? `${c.name} (archived)` : c.name }))
  return (
    <div className="report-field report-field--wide">
      <LUISelect
        label="Categories"
        placeholder="All categories"
        items={items}
        bindValue="value"
        bindLabel="label"
        multiple
        clearable
        searchable
        value={[...value]}
        onChange={(next) => onChange((next as string[] | null) ?? [])}
      />
    </div>
  )
}

interface ToggleFieldProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/** A switch that sits in the filters row, lined up with the fields' inputs. */
export const ToggleField = ({ label, checked, onChange }: ToggleFieldProps) => (
  <div className="report-field report-field--toggle">
    <LUIToggle label={label} checked={checked} onChange={(event) => onChange(event.target.checked)} />
  </div>
)
