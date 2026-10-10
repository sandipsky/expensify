import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  LUIButton,
  LUINumberInput,
  LUISegmentedControl,
  LUISelect,
  LUITextInput,
  LUIToggle,
  useLUINotification,
} from '@lumen-ui/react'
import type { SheetHandle } from '@/components/sheet'
import { useAccounts } from '@/features/accounts/account.query'
import { compareCategories } from '@/features/categories/category.domain'
import { useCategories } from '@/features/categories/category.query'
import { getApiErrorMessage } from '@/lib'
import { DEFAULT_CURRENCY, currencySymbol, formatPeriod, fractionDigits, localDate } from '@/utils'
import { DEFAULT_ALERT_THRESHOLDS, MAX_BUDGET_NAME, budgetPeriodRange } from '../budget.domain'
import {
  BUDGET_PERIOD_LABELS,
  BUDGET_PERIOD_OPTIONS,
  PREVIOUS_PERIOD,
  suggestBudgetName,
} from '../budget.labels'
import { useCreateBudget, useUpdateBudget } from '../budget.query'
import { BUDGET_PERIODS, type BudgetPeriod, type IBudget, type IBudgetBody } from '../budget.types'

interface BudgetFormProps {
  /** The budget to edit; omit to add one. */
  budget?: IBudget
  /** The sheet this form opened in; closed with the saved budget's id. */
  sheet: SheetHandle<number>
}

const budgetSchema = z.object({
  period: z.enum(BUDGET_PERIODS),
  amount: z.number({ error: 'Enter an amount' }).positive('Enter an amount above zero'),
  categoryIds: z.array(z.number()),
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(MAX_BUDGET_NAME, `Use at most ${MAX_BUDGET_NAME} characters`),
  rollover: z.boolean(),
  alerts: z.boolean(),
})

type BudgetFormValues = z.infer<typeof budgetSchema>

// Number inputs give strings; an empty field becomes null so zod can say "Enter an amount".
const asNumber = (value: unknown) =>
  value === '' || value === null || value === undefined ? null : Number(value)

/**
 * Add or edit a budget, in a sheet: a limit per week, month or year for every
 * expense or for chosen categories, with rollover and alerts at 80% and 100%.
 * A new budget's name follows its categories until the user types one.
 */
export const BudgetForm = ({ budget, sheet }: BudgetFormProps) => {
  const notify = useLUINotification()
  const { data: accounts } = useAccounts()
  const { data: categoriesData } = useCategories()
  const categories = categoriesData ?? []
  const createBudget = useCreateBudget()
  const updateBudget = useUpdateBudget()
  /** Set once the user types a name; until then a new budget's name follows its categories. */
  const [nameEdited, setNameEdited] = useState(!!budget)

  // Accounts share one currency until multi-currency exists, and budgets use it.
  const currency = accounts?.[0]?.currency ?? DEFAULT_CURRENCY
  const symbol = currencySymbol(currency)
  const decimalPlaces = fractionDigits(currency)

  // Expense categories in list order, plus archived ones the budget still counts.
  const kept = new Set(budget?.categoryIds ?? [])
  const items = categories
    .filter((c) => c.type === 'expense' && (!c.archived || kept.has(c.id)))
    .sort(compareCategories)
    .map((c) => ({ value: c.id, label: c.archived ? `${c.name} (archived)` : c.name }))

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      period: budget?.period ?? 'monthly',
      amount: budget?.amount ?? (null as unknown as number),
      categoryIds: [...(budget?.categoryIds ?? [])],
      name: budget?.name ?? suggestBudgetName([]),
      rollover: budget?.rollover ?? false,
      alerts: budget ? budget.alertThresholds.length > 0 : true,
    },
  })

  const period = useWatch({ control, name: 'period' })
  const range = budgetPeriodRange(period, localDate())

  const changeCategories = (ids: number[]) => {
    setValue('categoryIds', ids, { shouldDirty: true })
    if (nameEdited) return
    const names = ids
      .map((id) => categories.find((c) => c.id === id)?.name)
      .filter((name): name is string => !!name)
    setValue('name', suggestBudgetName(names), { shouldValidate: true })
  }

  const onSubmit = (values: BudgetFormValues) => {
    // Keeping alerts on keeps the thresholds the budget already has.
    const alertThresholds = values.alerts
      ? budget?.alertThresholds.length
        ? budget.alertThresholds
        : [...DEFAULT_ALERT_THRESHOLDS]
      : []
    // A category deleted since can't be saved; the budget counts the rest.
    const known = new Set(categories.map((c) => c.id))
    const body: IBudgetBody = {
      name: values.name.trim(),
      amount: values.amount,
      period: values.period,
      categoryIds: categoriesData ? values.categoryIds.filter((id) => known.has(id)) : values.categoryIds,
      rollover: values.rollover,
      alertThresholds,
    }

    if (budget) {
      updateBudget.mutate(
        { id: budget.id, body },
        {
          onSuccess: (saved) => {
            notify.success('Budget updated', saved.name)
            sheet.close(saved.id)
          },
        },
      )
    } else {
      createBudget.mutate(body, {
        onSuccess: (saved) => {
          notify.success('Budget added', saved.name)
          sheet.close(saved.id)
        },
      })
    }
  }

  const saving = createBudget.isPending || updateBudget.isPending
  const saveError = createBudget.error ?? updateBudget.error

  return (
    <form className="sheet-form" onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
      <h2 className="sheet-form__title">{budget ? 'Edit budget' : 'Add budget'}</h2>

      <div className="sheet-form__fields">
        <div className="sheet-form__field">
          <Controller
            control={control}
            name="period"
            render={({ field }) => (
              <LUISegmentedControl
                options={BUDGET_PERIOD_OPTIONS}
                size="lg"
                fullWidth
                value={field.value}
                onChange={(value) => field.onChange(value as BudgetPeriod)}
              />
            )}
          />
          <p className="sheet-form__hint">This period: {formatPeriod(range)}</p>
        </div>

        <LUINumberInput
          label={`${BUDGET_PERIOD_LABELS[period]} limit`}
          placeholder="0"
          prefix={symbol}
          decimalPlaces={decimalPlaces}
          autoFocus={!budget}
          error={errors.amount?.message}
          {...register('amount', { setValueAs: asNumber })}
        />

        <div className="sheet-form__field">
          <Controller
            control={control}
            name="categoryIds"
            render={({ field }) => (
              <LUISelect
                label="Categories"
                placeholder="All expenses"
                items={items}
                bindValue="value"
                bindLabel="label"
                multiple
                searchable
                value={field.value}
                onChange={(value) => changeCategories((value as number[] | null) ?? [])}
                onBlur={field.onBlur}
              />
            )}
          />
          <p className="sheet-form__hint">Leave empty to count every expense.</p>
        </div>

        <LUITextInput
          label="Name"
          error={errors.name?.message}
          {...register('name', { onChange: () => setNameEdited(true) })}
        />

        <div className="sheet-form__field">
          <LUIToggle label="Roll over what's left" {...register('rollover')} />
          <p className="sheet-form__hint">
            Adds what's left from {PREVIOUS_PERIOD[period]} to this one, or takes an overspend off
            it.
          </p>
        </div>

        <div className="sheet-form__field">
          <LUIToggle label="Alert me at 80% and 100%" {...register('alerts')} />
          <p className="sheet-form__hint">Once each, every period.</p>
        </div>

        {saveError && <div className="alert error">{getApiErrorMessage(saveError)}</div>}
      </div>

      <div className="sheet-form__actions">
        <LUIButton variant="outlined" size="lg" onClick={() => sheet.close()}>
          Cancel
        </LUIButton>
        <LUIButton size="lg" type="submit" disabled={saving}>
          {saving ? 'Saving...' : budget ? 'Save' : 'Add budget'}
        </LUIButton>
      </div>
    </form>
  )
}
