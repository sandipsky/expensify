import { useRef } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  LUIButton,
  LUIDateInput,
  LUINumberInput,
  LUIRadio,
  LUISegmentedControl,
  LUISelect,
  LUITextarea,
  useLUINotification,
} from '@lumen-ui/react'
import type { SheetHandle } from '@/components/sheet'
import { useAccounts } from '@/features/accounts/account.query'
import type { IAccount } from '@/features/accounts/account.types'
import { useCategories } from '@/features/categories/category.query'
import type { CategoryType } from '@/features/categories/category.types'
import { CategoryPicker } from '@/features/transactions/components/CategoryPicker'
import { MAX_NOTE_LENGTH, defaultAccountId } from '@/features/transactions/transaction.domain'
import {
  TX_TYPE_OPTIONS,
  accountItems,
  categoryOptions,
} from '@/features/transactions/transaction.labels'
import { TX_TYPES, type TxType } from '@/features/transactions/transaction.types'
import { getApiErrorMessage } from '@/lib'
import {
  DEFAULT_CURRENCY,
  currencySymbol,
  formatDate,
  fractionDigits,
  isoWeekday,
  localDate,
  parseYmd,
  toYmd,
} from '@/utils'
import {
  MAX_INTERVAL,
  MAX_OCCURRENCES,
  dayOfMonthOf,
  firstDueDate,
  pendingDates,
  rescheduledDueDate,
  sameSchedule,
  scheduleAfter,
  weekdaysOf,
} from '../recurring.domain'
import {
  DAY_OF_MONTH_OPTIONS,
  END_OPTIONS,
  FREQUENCY_OPTIONS,
  MODE_OPTIONS,
  entryCount,
  intervalUnit,
  weekdayOptions,
} from '../recurring.labels'
import { useCreateRecurringRule, useUpdateRecurringRule } from '../recurring.query'
import {
  END_TYPES,
  FREQUENCIES,
  RULE_MODES,
  type EndType,
  type Frequency,
  type IRecurringRule,
  type IRecurringRuleBody,
  type RecurringTemplate,
  type RuleMode,
  type Schedule,
} from '../recurring.types'
import './RuleForm.scss'

/** What a new rule starts from, as "Make recurring" passes it. */
export interface RulePrefill extends Partial<Schedule> {
  template?: Partial<RecurringTemplate>
}

interface RuleFormProps {
  /** The rule to edit; omit to add one. */
  rule?: IRecurringRule
  /** Adding: start from these fields. */
  prefill?: RulePrefill
  /**
   * The date of the entry being made recurring. Until the user picks a start
   * date, the schedule starts one period after it for whichever frequency is
   * chosen, so the entry itself isn't added again.
   */
  fromDate?: string
  /** The sheet this form opened in; closed with the saved rule's id. */
  sheet: SheetHandle<number>
}

const ruleSchema = z
  .object({
    type: z.enum(TX_TYPES),
    amount: z.number({ error: 'Enter an amount' }).positive('Enter an amount above zero'),
    accountId: z.number().nullable(),
    toAccountId: z.number().nullable(),
    categoryId: z.number().nullable(),
    note: z.string().trim().max(MAX_NOTE_LENGTH, `Use at most ${MAX_NOTE_LENGTH} characters`),
    frequency: z.enum(FREQUENCIES),
    interval: z
      .number({ error: 'Enter a number' })
      .int('Enter a whole number')
      .min(1, 'Enter 1 or more')
      .max(MAX_INTERVAL, `Enter ${MAX_INTERVAL} or less`),
    weekdays: z.array(z.number()),
    dayOfMonth: z.number(),
    startDate: z.date({ error: 'Pick a date' }),
    endType: z.enum(END_TYPES),
    maxCount: z.number().nullable(),
    endDate: z.date().nullable(),
    mode: z.enum(RULE_MODES),
  })
  .superRefine((values, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message })
    if (values.accountId === null) issue('accountId', 'Choose an account')
    if (values.type === 'transfer') {
      if (values.toAccountId === null) issue('toAccountId', 'Choose an account')
      else if (values.toAccountId === values.accountId) {
        issue('toAccountId', 'Pick a different account from the one it comes from.')
      }
    } else if (values.categoryId === null) {
      issue('categoryId', 'Pick a category')
    }
    if (values.frequency === 'weekly' && !values.weekdays.length) {
      issue('weekdays', 'Pick at least one day')
    }
    if (values.endType === 'count') {
      const count = values.maxCount
      if (count === null || !Number.isInteger(count) || count < 1 || count > MAX_OCCURRENCES) {
        issue('maxCount', `Enter a whole number from 1 to ${MAX_OCCURRENCES}`)
      }
    }
    if (values.endType === 'until') {
      if (!values.endDate) issue('endDate', 'Pick a date')
      else if (toYmd(values.endDate) < toYmd(values.startDate)) {
        issue('endDate', 'Pick a date on or after the start date.')
      }
    }
  })

type RuleFormValues = z.infer<typeof ruleSchema>

// Number inputs give strings; an empty field becomes null so zod can say "Enter a number".
const asNumber = (value: unknown) =>
  value === '' || value === null || value === undefined ? null : Number(value)

/** The rule being edited, or a new one: the prefill, else an expense each month from today. */
function startingValues(
  rule: IRecurringRule | undefined,
  prefill: RulePrefill,
  accounts: readonly IAccount[],
  today: string,
): RuleFormValues {
  const { template: prefillTemplate, ...prefillSchedule } = prefill
  const template = rule?.template ?? {
    type: 'expense' as TxType,
    amount: null,
    accountId: defaultAccountId(accounts),
    toAccountId: null,
    categoryId: null,
    note: null,
    ...prefillTemplate,
  }
  const schedule: Schedule = rule ?? {
    frequency: 'monthly',
    interval: 1,
    weekdays: [],
    dayOfMonth: null,
    startDate: today,
    ...prefillSchedule,
  }
  return {
    type: template.type,
    // Empty until typed; zod says "Enter an amount".
    amount: template.amount ?? (null as unknown as number),
    accountId: template.accountId,
    toAccountId: template.toAccountId,
    categoryId: template.categoryId,
    note: template.note ?? '',
    frequency: schedule.frequency,
    interval: schedule.interval,
    // Every frequency keeps a weekday and a day ready, for switching to weekly or monthly.
    weekdays: weekdaysOf(schedule),
    dayOfMonth: dayOfMonthOf(schedule),
    startDate: parseYmd(schedule.startDate),
    endType: rule?.endType ?? 'never',
    maxCount: rule?.maxCount ?? null,
    endDate: rule?.endDate ? parseYmd(rule.endDate) : null,
    mode: rule?.mode ?? 'auto',
  }
}

/**
 * Add or edit a recurring rule, in a sheet: the entry it adds (type, amount,
 * category or the two accounts of a transfer, account, note), how often
 * (daily, chosen weekdays, a day of the month or the last day, yearly; every
 * N), when it starts and ends, and whether each entry is added automatically
 * or asks first. A preview lists the next dates. An edit reaches entries from
 * now on only.
 */
export const RuleForm = ({ rule, prefill = {}, fromDate, sheet }: RuleFormProps) => {
  const notify = useLUINotification()
  const { data: accountsData } = useAccounts()
  const { data: categoriesData } = useCategories()
  const accounts = accountsData ?? []
  const categories = categoriesData ?? []
  const createRule = useCreateRecurringRule()
  const updateRule = useUpdateRecurringRule()
  const today = localDate()

  /** Schedule fields the user has set, so they stop following the start date or the frequency. */
  const picked = useRef({ weekdays: false, dayOfMonth: false, startDate: false })
  /** The category of each type the user last had, so switching type and back keeps it. */
  const categoryByType = useRef<Partial<Record<CategoryType, number | null>>>({})

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: startingValues(rule, prefill, accounts, today),
  })

  const type = useWatch({ control, name: 'type' })
  const accountId = useWatch({ control, name: 'accountId' })
  const toAccountId = useWatch({ control, name: 'toAccountId' })
  const categoryId = useWatch({ control, name: 'categoryId' })
  const frequency = useWatch({ control, name: 'frequency' })
  const interval = useWatch({ control, name: 'interval' })
  const weekdays = useWatch({ control, name: 'weekdays' })
  const dayOfMonth = useWatch({ control, name: 'dayOfMonth' })
  const startDate = useWatch({ control, name: 'startDate' })
  const endType = useWatch({ control, name: 'endType' })
  const maxCount = useWatch({ control, name: 'maxCount' })
  const endDate = useWatch({ control, name: 'endDate' })
  const mode = useWatch({ control, name: 'mode' })

  const transfer = type === 'transfer'
  const account = accounts.find((a) => a.id === accountId)
  const currency = account?.currency ?? DEFAULT_CURRENCY
  const items = accountItems(accounts, [accountId, toAccountId])
  const options = transfer ? [] : categoryOptions(categories, type, categoryId)

  /** The schedule as the form stands, or null while a field it needs is incomplete. */
  const toSchedule = (values: {
    frequency: Frequency
    interval: number
    weekdays: number[]
    dayOfMonth: number
    startDate: Date
  }): Schedule => ({
    frequency: values.frequency,
    interval: values.interval,
    weekdays: values.frequency === 'weekly' ? [...values.weekdays].sort((a, b) => a - b) : [],
    dayOfMonth: values.frequency === 'monthly' ? values.dayOfMonth : null,
    startDate: toYmd(values.startDate),
  })

  /** A new rule starts at its first date; an edit moves on only when the schedule changed. */
  const nextDueDateOf = (schedule: Schedule) =>
    !rule
      ? firstDueDate(schedule)
      : sameSchedule(schedule, rule)
        ? rule.nextDueDate
        : rescheduledDueDate(schedule, rule.nextDueDate, today)

  const scheduleReady =
    !!startDate &&
    Number.isInteger(interval) &&
    interval >= 1 &&
    interval <= MAX_INTERVAL &&
    (frequency !== 'weekly' || weekdays.length > 0)
  const schedule = scheduleReady
    ? toSchedule({ frequency, interval, weekdays, dayOfMonth, startDate })
    : null
  const state = schedule && {
    ...schedule,
    endType,
    endDate: endType === 'until' && endDate ? toYmd(endDate) : null,
    maxCount: endType === 'count' ? maxCount : null,
    occurrences: rule?.occurrences ?? 0,
    nextDueDate: nextDueDateOf(schedule),
  }

  // "Next: Thu, 1 Oct 2026 · Sun, 1 Nov 2026 · Tue, 1 Dec 2026".
  let preview = ''
  if (state) {
    const next = pendingDates(state, 3)
    preview = next.length
      ? `Next: ${next.map(formatDate).join(' · ')}`
      : 'This rule ends before its next entry.'
  }

  // A new rule that starts in the past catches up at once; say how many that makes.
  let pastHint = ''
  if (!rule && state) {
    const count = pendingDates(state, MAX_OCCURRENCES + 1, today).length
    if (count) {
      const entries =
        count > MAX_OCCURRENCES ? `More than ${MAX_OCCURRENCES} entries` : entryCount(count)
      pastHint =
        mode === 'confirm'
          ? `${entries} dated up to today will wait for you to confirm or skip them.`
          : `${entries} dated up to today will be added when you save.`
    }
  }

  const switchType = (next: TxType) => {
    const current = getValues('type')
    if (next === current) return
    if (current !== 'transfer') categoryByType.current[current] = getValues('categoryId')
    setValue('type', next)
    setValue('categoryId', next === 'transfer' ? null : (categoryByType.current[next] ?? null))
    if (next !== 'transfer') setValue('toAccountId', null)
  }

  /** A new rule's weekday and day of the month follow its start date until the user picks them. */
  const changeStart = (date: Date) => {
    setValue('startDate', date, { shouldDirty: true, shouldValidate: true })
    picked.current.startDate = true
    if (rule || fromDate) return
    if (!picked.current.weekdays) setValue('weekdays', [isoWeekday(toYmd(date))])
    if (!picked.current.dayOfMonth) setValue('dayOfMonth', date.getDate())
  }

  /** "Make recurring": the start stays one period after the entry for the frequency chosen. */
  const changeFrequency = (next: Frequency) => {
    setValue('frequency', next)
    if (!fromDate || picked.current.startDate) return
    const after = scheduleAfter(fromDate, next)
    setValue('startDate', parseYmd(after.startDate))
    if (!picked.current.weekdays) setValue('weekdays', weekdaysOf(after))
    if (!picked.current.dayOfMonth) setValue('dayOfMonth', dayOfMonthOf(after))
  }

  /** "After" starts from a year of monthly entries. */
  const changeEnd = (next: EndType) => {
    setValue('endType', next)
    if (next === 'count' && getValues('maxCount') === null) setValue('maxCount', 12)
  }

  const onSubmit = (values: RuleFormValues) => {
    const isTransfer = values.type === 'transfer'
    const next = toSchedule(values)
    const body: IRecurringRuleBody = {
      template: {
        type: values.type,
        amount: values.amount,
        accountId: values.accountId!,
        toAccountId: isTransfer ? values.toAccountId : null,
        categoryId: isTransfer ? null : values.categoryId,
        note: values.note.trim() || null,
      },
      ...next,
      endType: values.endType,
      endDate: values.endType === 'until' && values.endDate ? toYmd(values.endDate) : null,
      maxCount: values.endType === 'count' ? values.maxCount : null,
      mode: values.mode,
      nextDueDate: nextDueDateOf(next),
    }
    const name =
      body.template.note ||
      categories.find((c) => c.id === body.template.categoryId)?.name ||
      'Transfer'

    if (rule) {
      updateRule.mutate(
        { id: rule.id, body },
        {
          onSuccess: (saved) => {
            notify.success('Recurring rule updated', `${name}. Entries already added stay as they were.`)
            sheet.close(saved.id)
          },
        },
      )
      return
    }
    createRule.mutate(body, {
      onSuccess: (saved) => {
        notify.success('Recurring rule added', name)
        sheet.close(saved.id)
      },
    })
  }

  const saving = createRule.isPending || updateRule.isPending
  const saveError = createRule.error ?? updateRule.error

  const accountSelect = (name: 'accountId' | 'toAccountId', label: string) => (
    <>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <LUISelect
            label={label}
            placeholder="Choose an account"
            items={items}
            bindValue="value"
            bindLabel="label"
            value={field.value}
            onChange={(value) => field.onChange(value as number)}
            onBlur={field.onBlur}
          />
        )}
      />
      {errors[name] && <div className="alert error">{errors[name].message}</div>}
    </>
  )

  return (
    <form className="sheet-form" onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
      <h2 className="sheet-form__title">{rule ? 'Edit recurring rule' : 'Add recurring rule'}</h2>

      <div className="sheet-form__fields">
        {rule && (
          <p className="alert info">
            Changes apply to entries from now on. Entries already added stay as they are.
          </p>
        )}

        <h3 className="rule-form__section">Entry</h3>

        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <LUISegmentedControl
              options={TX_TYPE_OPTIONS}
              size="lg"
              fullWidth
              value={field.value}
              onChange={(value) => switchType(value as TxType)}
            />
          )}
        />

        <LUINumberInput
          label="Amount"
          placeholder="0"
          prefix={currencySymbol(currency)}
          decimalPlaces={fractionDigits(currency)}
          error={errors.amount?.message}
          {...register('amount', { setValueAs: asNumber })}
        />

        {transfer ? (
          <>
            {accountSelect('accountId', 'From account')}
            {accountSelect('toAccountId', 'To account')}
          </>
        ) : (
          <>
            {options.length ? (
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <CategoryPicker
                    label="Category"
                    name="rule-category"
                    options={options}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.categoryId?.message}
                  />
                )}
              />
            ) : (
              <p className="alert info">No {type} categories yet. Add some on the Categories page.</p>
            )}
            {accountSelect('accountId', 'Account')}
          </>
        )}

        <LUITextarea
          label="Note"
          placeholder="Such as rent, salary or a subscription"
          rows={2}
          error={errors.note?.message}
          {...register('note')}
        />

        <h3 className="rule-form__section">Schedule</h3>

        <Controller
          control={control}
          name="frequency"
          render={({ field }) => (
            <LUISegmentedControl
              options={FREQUENCY_OPTIONS}
              size="lg"
              fullWidth
              value={field.value}
              onChange={(value) => changeFrequency(value as Frequency)}
            />
          )}
        />

        <div className="rule-form__row">
          <LUINumberInput
            className="rule-form__interval"
            label="Every"
            suffix={intervalUnit(frequency, interval)}
            decimalPlaces={0}
            allowZero={false}
            error={errors.interval?.message}
            {...register('interval', { setValueAs: asNumber })}
          />
          {frequency === 'weekly' && (
            <div className="rule-form__grow">
              <Controller
                control={control}
                name="weekdays"
                render={({ field }) => (
                  <LUISelect
                    label="On"
                    placeholder="Pick days"
                    items={weekdayOptions()}
                    bindValue="value"
                    bindLabel="label"
                    multiple
                    value={field.value}
                    onChange={(value) => {
                      picked.current.weekdays = true
                      field.onChange((value as number[] | null) ?? [])
                    }}
                    onBlur={field.onBlur}
                  />
                )}
              />
              {errors.weekdays && <div className="alert error">{errors.weekdays.message}</div>}
            </div>
          )}
          {frequency === 'monthly' && (
            <div className="rule-form__grow">
              <Controller
                control={control}
                name="dayOfMonth"
                render={({ field }) => (
                  <LUISelect
                    label="On the"
                    items={DAY_OF_MONTH_OPTIONS}
                    bindValue="value"
                    bindLabel="label"
                    value={field.value}
                    onChange={(value) => {
                      picked.current.dayOfMonth = true
                      field.onChange(value as number)
                    }}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </div>
          )}
        </div>
        {frequency === 'monthly' && (
          <p className="sheet-form__hint rule-form__tight">
            The 29th to 31st fall on the last day of shorter months.
          </p>
        )}

        <div className="sheet-form__field">
          <Controller
            control={control}
            name="startDate"
            render={({ field }) => (
              <LUIDateInput
                label="Starts"
                calendar="ad"
                clearable={false}
                value={field.value}
                error={errors.startDate?.message}
                onChange={(value) => {
                  if (value) changeStart(value)
                }}
              />
            )}
          />
          {pastHint && <p className="sheet-form__hint">{pastHint}</p>}
        </div>

        <div className="sheet-form__field">
          <span className="rule-form__label">Ends</span>
          <Controller
            control={control}
            name="endType"
            render={({ field }) => (
              <LUISegmentedControl
                options={END_OPTIONS}
                size="lg"
                fullWidth
                value={field.value}
                onChange={(value) => changeEnd(value as EndType)}
              />
            )}
          />
          {endType === 'count' && (
            <LUINumberInput
              label="Number of entries"
              suffix="in all"
              decimalPlaces={0}
              allowZero={false}
              error={errors.maxCount?.message}
              {...register('maxCount', { setValueAs: asNumber })}
            />
          )}
          {endType === 'until' && (
            <Controller
              control={control}
              name="endDate"
              render={({ field }) => (
                <LUIDateInput
                  label="Last date"
                  calendar="ad"
                  clearable={false}
                  min={startDate}
                  value={field.value}
                  error={errors.endDate?.message}
                  onChange={field.onChange}
                />
              )}
            />
          )}
        </div>

        <Controller
          control={control}
          name="mode"
          render={({ field }) => (
            <LUIRadio
              label="On the due date"
              name="rule-mode"
              orientation="stacked"
              options={MODE_OPTIONS}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value as RuleMode)}
            />
          )}
        />

        {preview && (
          <p className="rule-form__preview" aria-live="polite">
            {preview}
          </p>
        )}

        {saveError && <div className="alert error">{getApiErrorMessage(saveError)}</div>}
      </div>

      <div className="sheet-form__actions">
        <LUIButton variant="outlined" size="lg" onClick={() => sheet.close()}>
          Cancel
        </LUIButton>
        <LUIButton size="lg" type="submit" disabled={saving}>
          {saving ? 'Saving...' : rule ? 'Save' : 'Add rule'}
        </LUIButton>
      </div>
    </form>
  )
}
