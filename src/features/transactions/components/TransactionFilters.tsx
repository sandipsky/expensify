import { useState } from 'react'
import { LUIButton, LUINumberInput, LUISegmentedControl, LUISelect } from '@lumen-ui/react'
import type { SheetHandle } from '@/components/sheet'
import { useAccounts } from '@/features/accounts/account.query'
import { compareCategories } from '@/features/categories/category.domain'
import { useCategories } from '@/features/categories/category.query'
import { CATEGORY_TYPES } from '@/features/categories/category.types'
import { currencySymbol, fractionDigits } from '@/utils'
import { NO_FILTER, type TransactionFilter } from '../transaction.domain'
import { TX_TYPE_LABELS, TX_TYPE_OPTIONS } from '../transaction.labels'
import type { TxType } from '../transaction.types'
import './TransactionFilters.scss'

interface TransactionFiltersProps {
  filter: TransactionFilter
  currency: string
  /** The sheet this form opened in; closed with the filter to apply. */
  sheet: SheetHandle<TransactionFilter>
}

const ALL = 'all'
type TypeChoice = TxType | typeof ALL

const TYPE_OPTIONS = [{ value: ALL, label: 'All' }, ...TX_TYPE_OPTIONS]

/**
 * The list's filters besides the period and search: type, accounts,
 * categories and an amount range. They combine, and apply when the user
 * taps Apply; the search text passes through untouched.
 */
export const TransactionFilters = ({ filter, currency, sheet }: TransactionFiltersProps) => {
  const { data: accountsData } = useAccounts()
  const { data: categoriesData } = useCategories()
  const accounts = accountsData ?? []
  const categories = categoriesData ?? []

  const [type, setType] = useState<TypeChoice>(filter.type ?? ALL)
  const [accountIds, setAccountIds] = useState<string[]>([...filter.accountIds])
  const [categoryIds, setCategoryIds] = useState<string[]>([...filter.categoryIds])
  const [min, setMin] = useState<number | null>(filter.minAmount)
  const [max, setMax] = useState<number | null>(filter.maxAmount)
  // The amount fields are uncontrolled, so "Clear all" remounts them to empty them.
  const [amountsKey, setAmountsKey] = useState(0)

  const symbol = currencySymbol(currency)
  const decimalPlaces = fractionDigits(currency)

  /** Every account, archived ones too: their history is still in the list. */
  const accountItems = accounts.map((a) => ({
    value: a.id,
    label: a.archived ? `${a.name} (archived)` : a.name,
  }))

  /** Categories of the chosen type (both when none is), grouped; transfers have none. */
  const types = type === ALL ? CATEGORY_TYPES : type === 'transfer' ? [] : [type]
  const categoryItems = types.flatMap((t) =>
    categories
      .filter((c) => c.type === t)
      .sort(compareCategories)
      .map((c) => ({
        value: c.id,
        label: c.archived ? `${c.name} (archived)` : c.name,
        group: TX_TYPE_LABELS[t],
      })),
  )

  /** A category of the other type can't match, so switching type drops it. */
  const selectType = (value: unknown) => {
    const next = value as TypeChoice
    setType(next)
    const allowed = new Set(
      categories.filter((c) => next === ALL || c.type === next).map((c) => c.id),
    )
    setCategoryIds((ids) => ids.filter((id) => allowed.has(id)))
  }

  const reset = () => {
    setType(ALL)
    setAccountIds([])
    setCategoryIds([])
    setMin(null)
    setMax(null)
    setAmountsKey((k) => k + 1)
  }

  const apply = () => {
    let minAmount = min
    let maxAmount = max
    if (minAmount !== null && maxAmount !== null && minAmount > maxAmount) {
      ;[minAmount, maxAmount] = [maxAmount, minAmount]
    }
    sheet.close({
      ...NO_FILTER,
      search: filter.search,
      type: type === ALL ? null : type,
      accountIds,
      categoryIds: type === 'transfer' ? [] : categoryIds,
      minAmount,
      maxAmount,
    })
  }

  return (
    <div className="sheet-form">
      <h2 className="sheet-form__title">Filters</h2>

      <div className="sheet-form__fields">
        <LUISegmentedControl
          options={TYPE_OPTIONS}
          size="lg"
          fullWidth
          value={type}
          onChange={selectType}
        />

        <LUISelect
          label="Accounts"
          placeholder="Any account"
          items={accountItems}
          bindValue="value"
          bindLabel="label"
          multiple
          searchable={accountItems.length > 8}
          value={accountIds}
          onChange={(value) => setAccountIds(value as string[])}
        />

        {categoryItems.length > 0 && (
          <LUISelect
            label="Categories"
            placeholder="Any category"
            items={categoryItems}
            bindValue="value"
            bindLabel="label"
            groupBy="group"
            multiple
            searchable
            value={categoryIds}
            onChange={(value) => setCategoryIds(value as string[])}
          />
        )}

        <fieldset key={amountsKey} className="filter-amounts">
          <legend>Amount</legend>
          <LUINumberInput
            label="From"
            prefix={symbol}
            decimalPlaces={decimalPlaces}
            defaultValue={min ?? ''}
            onValueChange={setMin}
          />
          <LUINumberInput
            label="To"
            prefix={symbol}
            decimalPlaces={decimalPlaces}
            defaultValue={max ?? ''}
            onValueChange={setMax}
          />
        </fieldset>
      </div>

      <div className="sheet-form__actions filter-actions">
        <LUIButton variant="ghost" size="lg" onClick={reset}>
          Clear all
        </LUIButton>
        <LUIButton variant="outlined" size="lg" onClick={() => sheet.close()}>
          Cancel
        </LUIButton>
        <LUIButton size="lg" onClick={apply}>
          Apply
        </LUIButton>
      </div>
    </div>
  )
}
