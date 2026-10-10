import { useRef, type KeyboardEvent } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  LUIButton,
  LUIDateInput,
  LUIIcon,
  LUIMenu,
  LUINumberInput,
  LUISegmentedControl,
  LUISelect,
  LUITextarea,
  useLUINotification,
} from '@lumen-ui/react'
import type { SheetHandle } from '@/components/sheet'
import { useAccounts } from '@/features/accounts/account.query'
import type { IAccount } from '@/features/accounts/account.types'
import { compareCategories } from '@/features/categories/category.domain'
import { useAddDefaultCategories, useCategories } from '@/features/categories/category.query'
import type { CategoryType, ICategory } from '@/features/categories/category.types'
import { getApiErrorMessage } from '@/lib'
import {
  DEFAULT_CURRENCY,
  addDays,
  currencySymbol,
  formatMoney,
  fractionDigits,
  localDate,
  parseYmd,
  toYmd,
} from '@/utils'
import { MAX_NOTE_LENGTH, defaultAccountId, writeLastAccountId } from '../transaction.domain'
import { TX_TYPE_LABELS, TX_TYPE_OPTIONS } from '../transaction.labels'
import { useCreateTransaction, useUpdateTransaction } from '../transaction.query'
import {
  TX_TYPES,
  type ITransaction,
  type ITransactionBody,
  type TxType,
} from '../transaction.types'
import { CategoryPicker, type CategoryOption } from './CategoryPicker'
import './TransactionForm.scss'

/** How the form closed, beyond a plain Cancel. The opener carries out duplicate and delete. */
export type TransactionFormResult =
  | { action: 'saved'; id: number }
  | { action: 'duplicate'; transaction: ITransaction }
  | { action: 'delete'; transaction: ITransaction }

interface TransactionFormProps {
  /** The transaction to edit; omit to add one. */
  transaction?: ITransaction
  /** Adding: start from these fields, as a duplicate does. */
  prefill?: Partial<ITransactionBody>
  /** The sheet this form opened in; closed with how the form ended. */
  sheet: SheetHandle<TransactionFormResult>
}

const transactionSchema = z
  .object({
    type: z.enum(TX_TYPES),
    amount: z.number({ error: 'Enter an amount' }).positive('Enter an amount above zero'),
    accountId: z.number().nullable(),
    toAccountId: z.number().nullable(),
    categoryId: z.number().nullable(),
    date: z.date({ error: 'Pick a date' }),
    note: z.string().trim().max(MAX_NOTE_LENGTH, `Use at most ${MAX_NOTE_LENGTH} characters`),
  })
  .superRefine((values, ctx) => {
    if (values.accountId === null) {
      ctx.addIssue({ code: 'custom', path: ['accountId'], message: 'Choose an account' })
    }
    if (values.type === 'transfer') {
      if (values.toAccountId === null) {
        ctx.addIssue({ code: 'custom', path: ['toAccountId'], message: 'Choose an account' })
      } else if (values.toAccountId === values.accountId) {
        ctx.addIssue({
          code: 'custom',
          path: ['toAccountId'],
          message: 'Pick a different account from the one it comes from.',
        })
      }
    } else if (values.categoryId === null) {
      ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Pick a category' })
    }
  })

type TransactionFormValues = z.infer<typeof transactionSchema>

// Number inputs give strings; an empty field becomes null so zod can say "Enter an amount".
const asNumber = (value: unknown) =>
  value === '' || value === null || value === undefined ? null : Number(value)

/** Active accounts, plus an archived one the entry already uses. */
function accountItems(accounts: readonly IAccount[], used: readonly (number | null)[]) {
  return accounts
    .filter((a) => !a.archived || used.includes(a.id))
    .map((a) => ({ value: a.id, label: a.archived ? `${a.name} (archived)` : a.name }))
}

/** The type's active categories in list order, plus the chosen one when it's archived. */
function categoryOptions(
  categories: readonly ICategory[],
  type: CategoryType,
  chosen: number | null,
): CategoryOption[] {
  return categories
    .filter((c) => c.type === type && (!c.archived || c.id === chosen))
    .sort(compareCategories)
    .map((c) => ({ value: c.id, label: c.name, icon: c.icon, color: c.color }))
}

/**
 * Add or edit a transaction, in a sheet: type, amount, a category grid or the
 * two accounts of a transfer, account, date with Today and Yesterday, and a
 * note. New entries start as an expense, today, on the last-used account.
 * Ctrl/⌘+Enter saves, and with Shift saves and starts another.
 */
export const TransactionForm = ({ transaction, prefill = {}, sheet }: TransactionFormProps) => {
  const notify = useLUINotification()
  const { data: accountsData } = useAccounts()
  const { data: categoriesData } = useCategories()
  const accounts = accountsData ?? []
  const categories = categoriesData ?? []
  // Not `useCategoryActions`: it opens sheets, and this form already renders
  // inside one, where the drawer context isn't available.
  const addDefaultCategories = useAddDefaultCategories()
  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()
  const amountRef = useRef<HTMLInputElement>(null)

  const today = localDate()
  const start = transaction ?? prefill

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: start.type ?? 'expense',
      amount: start.amount ?? (null as unknown as number),
      accountId: start.accountId ?? defaultAccountId(accounts),
      toAccountId: start.toAccountId ?? null,
      categoryId: start.categoryId ?? null,
      date: parseYmd(start.date ?? today),
      note: start.note ?? '',
    },
  })

  const type = useWatch({ control, name: 'type' })
  const accountId = useWatch({ control, name: 'accountId' })
  const toAccountId = useWatch({ control, name: 'toAccountId' })
  const categoryId = useWatch({ control, name: 'categoryId' })
  const date = useWatch({ control, name: 'date' })

  /** The category of each type the user last had, so switching type and back keeps it. */
  const categoryByType = useRef<Partial<Record<CategoryType, number | null>>>({})

  const transfer = type === 'transfer'
  const account = accounts.find((a) => a.id === accountId)
  const currency = transaction?.currency ?? account?.currency ?? DEFAULT_CURRENCY
  const symbol = currencySymbol(currency)
  const decimalPlaces = fractionDigits(currency)

  const hasAccounts = accounts.some((a) => !a.archived)
  const items = accountItems(accounts, [accountId, toAccountId])
  const options = transfer ? [] : categoryOptions(categories, type, categoryId)

  const ymd = date ? toYmd(date) : null
  const isToday = ymd === today
  const isYesterday = ymd === addDays(today, -1)
  const upcoming = ymd !== null && ymd > today

  const switchType = (next: TxType) => {
    const current = getValues('type')
    if (next === current) return
    if (current !== 'transfer') categoryByType.current[current] = getValues('categoryId')
    setValue('type', next)
    setValue('categoryId', next === 'transfer' ? null : (categoryByType.current[next] ?? null))
    if (next !== 'transfer') setValue('toAccountId', null)
  }

  const setDaysAgo = (days: number) =>
    setValue('date', parseYmd(addDays(today, -days)), { shouldDirty: true, shouldValidate: true })

  /** Adds the usual categories, so the grid has something to pick from. */
  const addDefaults = () =>
    addDefaultCategories.mutate(undefined, {
      onSuccess: (added) => {
        if (added.length) notify.success('Default categories added')
        else notify.info('Nothing to add', 'You already have every default category.')
      },
      onError: (error) => notify.error('Could not add default categories', getApiErrorMessage(error)),
    })

  /** "Rs 250.00 · Food and dining" for the toast. */
  const summary = (body: ITransactionBody) => {
    const amount = formatMoney(body.amount, currency)
    const name = (id: number | null) => accounts.find((a) => a.id === id)?.name ?? ''
    const what =
      body.type === 'transfer'
        ? `${name(body.accountId)} → ${name(body.toAccountId)}`
        : categories.find((c) => c.id === body.categoryId)?.name
    return what ? `${amount} · ${what}` : amount
  }

  /** Clears what differs between entries and goes back to the amount. */
  const startAnother = () => {
    reset({ ...getValues(), amount: null as unknown as number, categoryId: null, note: '' })
    categoryByType.current = {}
    amountRef.current?.focus()
  }

  /** Writes the entry; with `another`, keeps type, account and date for the next one. */
  const persist = (values: TransactionFormValues, another: boolean) => {
    const body: ITransactionBody = {
      type: values.type,
      amount: values.amount,
      accountId: values.accountId!,
      toAccountId: values.type === 'transfer' ? values.toAccountId : null,
      categoryId: values.type === 'transfer' ? null : values.categoryId,
      date: toYmd(values.date),
      note: values.note.trim() || null,
    }

    if (transaction) {
      updateTransaction.mutate(
        { id: transaction.id, body },
        {
          onSuccess: (saved) => {
            writeLastAccountId(saved.accountId)
            notify.success('Transaction updated', summary(body))
            sheet.close({ action: 'saved', id: saved.id })
          },
        },
      )
      return
    }

    createTransaction.mutate(body, {
      onSuccess: (saved) => {
        writeLastAccountId(saved.accountId)
        notify.success(`${TX_TYPE_LABELS[body.type]} added`, summary(body))
        if (another) startAnother()
        else sheet.close({ action: 'saved', id: saved.id })
      },
    })
  }

  const onSubmit = (values: TransactionFormValues) => persist(values, false)
  const saveAndAddAnother = () => void handleSubmit((values) => persist(values, true))()

  /** Ctrl/⌘+Enter saves, and with Shift saves and starts another. */
  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return
    event.preventDefault()
    if (event.shiftKey && !transaction) saveAndAddAnother()
    else void handleSubmit(onSubmit)()
  }

  const saving = createTransaction.isPending || updateTransaction.isPending
  const saveError = createTransaction.error ?? updateTransaction.error

  const { ref: amountFieldRef, ...amountField } = register('amount', { setValueAs: asNumber })

  const menuTrigger = (
    <LUIButton variant="ghost" size="lg" rounded aria-label="More actions">
      <LUIIcon name="more" color="inherit" />
    </LUIButton>
  )

  return (
    <form
      className="sheet-form"
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      onKeyDown={onKeyDown}
      noValidate
    >
      <div className="tx-form__header">
        <h2 className="sheet-form__title">{transaction ? 'Edit transaction' : 'Add transaction'}</h2>
        {transaction && (
          <LUIMenu mode="right" closeOnItemClick appendBody dropdownDisplay={menuTrigger}>
            <button
              type="button"
              className="dropdown-item tx-form__item"
              onClick={() => sheet.close({ action: 'duplicate', transaction })}
            >
              <LUIIcon name="content_copy" size={18} />
              Duplicate
            </button>
            <button
              type="button"
              className="dropdown-item tx-form__item tx-form__item--danger"
              onClick={() => sheet.close({ action: 'delete', transaction })}
            >
              <LUIIcon name="trash" size={18} color="inherit" />
              Delete
            </button>
          </LUIMenu>
        )}
      </div>

      <div className="sheet-form__fields">
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
          prefix={symbol}
          decimalPlaces={decimalPlaces}
          autoFocus={!transaction}
          error={errors.amount?.message}
          ref={(el) => {
            amountFieldRef(el)
            amountRef.current = el
          }}
          {...amountField}
        />

        {!hasAccounts && (
          <p className="alert warn">Add an account on the Accounts page first; entries need one.</p>
        )}

        {transfer ? (
          <>
            <Controller
              control={control}
              name="accountId"
              render={({ field }) => (
                <LUISelect
                  label="From account"
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
            {errors.accountId && <div className="alert error">{errors.accountId.message}</div>}
            <Controller
              control={control}
              name="toAccountId"
              render={({ field }) => (
                <LUISelect
                  label="To account"
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
            {errors.toAccountId && <div className="alert error">{errors.toAccountId.message}</div>}
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
                    name="categoryId"
                    options={options}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.categoryId?.message}
                  />
                )}
              />
            ) : (
              <div className="alert info tx-form__no-categories">
                <span>No {type} categories yet.</span>
                <LUIButton
                  variant="outlined-primary"
                  size="lg"
                  disabled={addDefaultCategories.isPending}
                  onClick={addDefaults}
                >
                  Add default categories
                </LUIButton>
              </div>
            )}

            <Controller
              control={control}
              name="accountId"
              render={({ field }) => (
                <LUISelect
                  label="Account"
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
            {errors.accountId && <div className="alert error">{errors.accountId.message}</div>}
          </>
        )}

        <div className="sheet-form__field">
          <div className="tx-form__date">
            <div className="tx-form__date-input">
              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <LUIDateInput
                    label="Date"
                    calendar="ad"
                    clearable={false}
                    value={field.value}
                    error={errors.date?.message}
                    onChange={(value) => field.onChange(value ?? new Date())}
                  />
                )}
              />
            </div>
            <div className="tx-form__date-chips" role="group" aria-label="Quick dates">
              <LUIButton
                size="lg"
                variant={isToday ? 'outlined-primary' : 'outlined'}
                aria-pressed={isToday}
                onClick={() => setDaysAgo(0)}
              >
                Today
              </LUIButton>
              <LUIButton
                size="lg"
                variant={isYesterday ? 'outlined-primary' : 'outlined'}
                aria-pressed={isYesterday}
                onClick={() => setDaysAgo(1)}
              >
                Yesterday
              </LUIButton>
            </div>
          </div>
          {upcoming && (
            <p className="sheet-form__hint">
              A future date: it shows as upcoming, and balances change now.
            </p>
          )}
        </div>

        <LUITextarea
          label="Note"
          placeholder="What it was for"
          rows={3}
          error={errors.note?.message}
          {...register('note')}
        />

        {saveError && <div className="alert error">{getApiErrorMessage(saveError)}</div>}
      </div>

      <div className="sheet-form__actions tx-form__actions">
        <LUIButton variant="outlined" size="lg" onClick={() => sheet.close()}>
          Cancel
        </LUIButton>
        {!transaction && (
          <LUIButton
            variant="outlined-primary"
            size="lg"
            disabled={saving}
            onClick={saveAndAddAnother}
          >
            Save and add another
          </LUIButton>
        )}
        <LUIButton size="lg" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </LUIButton>
      </div>
    </form>
  )
}
