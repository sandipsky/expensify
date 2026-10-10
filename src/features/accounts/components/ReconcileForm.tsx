import { useState } from 'react'
import { LUIButton, LUINumberInput, useLUINotification } from '@lumen-ui/react'
import type { SheetHandle } from '@/components/sheet'
import { getErrorMessage } from '@/lib'
import { currencySymbol, formatMoney, fractionDigits } from '@/utils'
import { flipForLiability, isLiability } from '../account.domain'
import { balanceView } from '../account.labels'
import { useReconcileAccount } from '../account.query'
import type { IAccount } from '../account.types'
import './ReconcileForm.scss'

interface ReconcileFormProps {
  account: IAccount
  /** The sheet this form opened in; closed with `true` after a save. */
  sheet: SheetHandle<boolean>
}

/**
 * Reconcile, in a sheet: the user types the real balance and the current
 * balance moves to it. Cards and loans enter the amount owed, stored as a
 * negative balance.
 */
export const ReconcileForm = ({ account, sheet }: ReconcileFormProps) => {
  const notify = useLUINotification()
  const reconcile = useReconcileAccount()

  const liability = isLiability(account.type)
  const current = balanceView(account)
  const initial = flipForLiability(account.type, account.currentBalance)
  const [actual, setActual] = useState<number | null>(initial)

  // The typed figure (owed for cards and loans) as a stored balance.
  const toStored = (value: number) => flipForLiability(account.type, value)
  const difference = actual === null ? null : toStored(actual) - account.currentBalance

  const save = () => {
    if (actual === null) return
    reconcile.mutate(
      { id: account.id, actualBalance: toStored(actual) },
      {
        onSuccess: () => {
          if (difference === 0) {
            notify.info('Already matches', `${account.name} needed no adjustment.`)
          } else {
            notify.success('Balance adjusted', `${account.name} now matches what you entered.`)
          }
          sheet.close(true)
        },
        onError: (error) => notify.error('Could not reconcile', getErrorMessage(error)),
      },
    )
  }

  const inApp =
    formatMoney(current.amount, account.currency) +
    (current.caption === 'Owed' ? ' owed' : current.caption === 'In credit' ? ' in credit' : '')

  const adjustmentClass = [
    difference !== null && difference > 0 ? 'is-income' : '',
    difference !== null && difference < 0 ? 'is-expense' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="sheet-form">
      <h2 className="sheet-form__title">Reconcile {account.name}</h2>
      <p className="sheet-form__intro">
        Enter what your bank, card or wallet shows right now. The difference is saved as a
        balance adjustment, which reports and budgets leave out.
      </p>

      <div className="sheet-form__fields">
        <LUINumberInput
          label={liability ? 'Actual amount owed' : 'Actual balance'}
          prefix={currencySymbol(account.currency)}
          decimalPlaces={fractionDigits(account.currency)}
          allowNegative
          defaultValue={initial}
          onValueChange={setActual}
          autoFocus
        />
      </div>

      <dl className="reconcile-summary">
        <div className="reconcile-summary__row">
          <dt>In the app</dt>
          <dd>{inApp}</dd>
        </div>
        <div className="reconcile-summary__row">
          <dt>Adjustment</dt>
          <dd className={adjustmentClass}>
            {difference === null
              ? '—'
              : difference === 0
                ? 'None, it already matches'
                : formatMoney(difference, account.currency, 'exceptZero')}
          </dd>
        </div>
      </dl>

      <div className="sheet-form__actions">
        <LUIButton variant="outlined" size="lg" onClick={() => sheet.close()}>
          Cancel
        </LUIButton>
        <LUIButton size="lg" disabled={actual === null || reconcile.isPending} onClick={save}>
          {reconcile.isPending ? 'Saving...' : 'Save'}
        </LUIButton>
      </div>
    </div>
  )
}
