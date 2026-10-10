import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  LUIButton,
  LUINumberInput,
  LUISelect,
  LUITextInput,
  LUIToggle,
  useLUINotification,
} from '@lumen-ui/react'
import type { SheetHandle } from '@/components/sheet'
import { getErrorMessage } from '@/lib'
import { DEFAULT_CURRENCY, currencySymbol, fractionDigits } from '@/utils'
import { flipForLiability, iconAndColorFor, isLiability } from '../account.domain'
import { ACCOUNT_TYPE_OPTIONS } from '../account.labels'
import { useCreateAccount, useUpdateAccount } from '../account.query'
import { ACCOUNT_TYPES, type AccountType, type IAccount, type IAccountBody } from '../account.types'

interface AccountFormProps {
  /** The account to edit; omit to add one. */
  account?: IAccount
  /** The sheet this form opened in; closed with the saved account's id. */
  sheet: SheetHandle<string>
}

const accountSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40, 'Use at most 40 characters'),
  type: z.enum(ACCOUNT_TYPES),
  balance: z.number({ error: 'Enter an amount' }),
  creditLimit: z.number({ error: 'Enter an amount' }).positive('Must be more than 0').nullable(),
  includeInTotal: z.boolean(),
})

type AccountFormValues = z.infer<typeof accountSchema>

// Number inputs give strings; an empty field becomes null so zod can say "Enter an amount".
const asNumber = (value: unknown) =>
  value === '' || value === null || value === undefined ? null : Number(value)

/**
 * Add or edit an account, in a sheet. Cards and loans enter the amount owed,
 * stored as a negative balance. Icon and color come from the type; there is
 * no picker yet.
 */
export const AccountForm = ({ account, sheet }: AccountFormProps) => {
  const notify = useLUINotification()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()

  const currency = account?.currency ?? DEFAULT_CURRENCY
  const symbol = currencySymbol(currency)
  const decimalPlaces = fractionDigits(currency)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: account
      ? {
          name: account.name,
          type: account.type,
          balance: flipForLiability(account.type, account.openingBalance),
          creditLimit: account.creditLimit,
          includeInTotal: account.includeInTotal,
        }
      : { name: '', type: 'cash', balance: 0, creditLimit: null, includeInTotal: true },
  })

  const type = useWatch({ control, name: 'type' })
  const liability = isLiability(type)

  const balanceLabel = !liability ? 'Opening balance' : account ? 'Opening amount owed' : 'Amount owed'
  const balanceHint = account
    ? 'Changing it moves the current balance by the same amount.'
    : liability
      ? 'What you owe today.'
      : "What's in the account today."

  const onSubmit = (values: AccountFormValues) => {
    const body: IAccountBody = {
      name: values.name,
      type: values.type,
      currency,
      openingBalance: flipForLiability(values.type, values.balance),
      // A zero limit means none, so no utilization is shown.
      creditLimit: values.type === 'credit_card' && values.creditLimit ? values.creditLimit : null,
      includeInTotal: values.includeInTotal,
      ...iconAndColorFor(account, values.type),
    }

    if (account) {
      updateAccount.mutate(
        { id: account.id, body },
        {
          onSuccess: (saved) => {
            notify.success('Account updated', saved.name)
            sheet.close(saved.id)
          },
        },
      )
    } else {
      createAccount.mutate(body, {
        onSuccess: (saved) => {
          notify.success('Account added', saved.name)
          sheet.close(saved.id)
        },
      })
    }
  }

  const saving = createAccount.isPending || updateAccount.isPending
  const saveError = createAccount.error ?? updateAccount.error

  return (
    <form className="sheet-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h2 className="sheet-form__title">{account ? 'Edit account' : 'Add account'}</h2>

      <div className="sheet-form__fields">
        <LUITextInput
          label="Name"
          placeholder="e.g. Wallet, Everyday bank"
          autoFocus
          error={errors.name?.message}
          {...register('name')}
        />

        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <LUISelect
              label="Type"
              items={ACCOUNT_TYPE_OPTIONS}
              bindValue="value"
              bindLabel="label"
              value={field.value}
              onChange={(value) => field.onChange(value as AccountType)}
              onBlur={field.onBlur}
            />
          )}
        />

        <div className="sheet-form__field">
          <LUINumberInput
            label={balanceLabel}
            prefix={symbol}
            decimalPlaces={decimalPlaces}
            allowNegative
            error={errors.balance?.message}
            {...register('balance', { setValueAs: asNumber })}
          />
          <p className="sheet-form__hint">{balanceHint}</p>
        </div>

        {type === 'credit_card' && (
          <div className="sheet-form__field">
            <LUINumberInput
              label="Credit limit"
              prefix={symbol}
              decimalPlaces={decimalPlaces}
              error={errors.creditLimit?.message}
              {...register('creditLimit', { setValueAs: asNumber })}
            />
            <p className="sheet-form__hint">Optional. Shows how much of it you've used.</p>
          </div>
        )}

        <LUIToggle label="Include in total balance" {...register('includeInTotal')} />

        {saveError && <div className="alert error">{getErrorMessage(saveError)}</div>}
      </div>

      <div className="sheet-form__actions">
        <LUIButton variant="outlined" size="lg" onClick={() => sheet.close()}>
          Cancel
        </LUIButton>
        <LUIButton size="lg" type="submit" disabled={saving}>
          {saving ? 'Saving...' : account ? 'Save' : 'Add account'}
        </LUIButton>
      </div>
    </form>
  )
}
