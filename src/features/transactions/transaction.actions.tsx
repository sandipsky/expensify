import type { ComponentProps } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { LUIConfirmDialog, useLUIModal, useLUINotification } from '@lumen-ui/react'
import { useSheet } from '@/components/sheet'
import { useAccountActions } from '@/features/accounts/account.actions'
import { useAccounts } from '@/features/accounts/account.query'
import { useRecurringActions } from '@/features/recurring/recurring.actions'
import { getApiErrorMessage } from '@/lib'
import { formatMoney, localDate } from '@/utils'
import { TransactionFilters } from './components/TransactionFilters'
import { TransactionForm, type TransactionFormResult } from './components/TransactionForm'
import { type TransactionFilter, toBody } from './transaction.domain'
import { useDeleteTransaction } from './transaction.query'
import type { ITransaction, ITransactionBody } from './transaction.types'

type ConfirmData = ComponentProps<typeof LUIConfirmDialog>['data']

/** Wide enough for six category tiles a row; a tall sheet on phones. */
const FORM_OPTIONS = { width: '560px', phoneHeight: '94dvh' }

/**
 * The transaction flows every screen shares: add (prefilled when asked),
 * edit, duplicate, delete, "Make recurring", and the filters sheet. The list,
 * the detail page, the account page, budgets and recurring rules share it,
 * so every entry point behaves the same.
 */
export function useTransactionActions() {
  const navigate = useNavigate()
  const sheet = useSheet()
  const modal = useLUIModal()
  const notify = useLUINotification()
  const remove = useDeleteTransaction()
  const { data: accounts } = useAccounts()
  const accountActions = useAccountActions()
  const recurringActions = useRecurringActions()

  const confirm = (data: ConfirmData) =>
    modal
      .open<boolean>((ref) => <LUIConfirmDialog modalRef={ref} data={data} />, { width: '440px' })
      .afterClosed()

  // A write behind a dialog's confirm button: a failure is reported and
  // rethrown, so the dialog stays open for another try.
  const attempt = async <T,>(action: () => Promise<T>, failure: string): Promise<T> => {
    try {
      return await action()
    } catch (error) {
      notify.error(failure, getApiErrorMessage(error))
      throw error
    }
  }

  const open = async (props: {
    transaction?: ITransaction
    prefill?: Partial<ITransactionBody>
  }): Promise<TransactionFormResult | undefined> => {
    const result = await sheet.open<TransactionFormResult>(
      (handle) => <TransactionForm {...props} sheet={handle} />,
      FORM_OPTIONS,
    )
    // Duplicate, delete and the recurring items close the form first, then run here.
    if (result?.action === 'duplicate') void duplicate(result.transaction)
    if (result?.action === 'delete') void deleteTransaction(result.transaction)
    if (result?.action === 'recurring') void makeRecurring(result.transaction)
    if (result?.action === 'rule') openRule(result.ruleId)
    return result
  }

  /** A rule that repeats the entry, starting one period after it. */
  const makeRecurring = (transaction: ITransaction) => recurringActions.createFrom(transaction)

  /** The page of the rule that added an entry. */
  const openRule = (ruleId: number) =>
    void navigate({ to: '/recurring/$ruleId', params: { ruleId: String(ruleId) } })

  /**
   * Opens the add form, prefilled when given. With no active account yet,
   * the account form comes first, since every entry needs one. Resolves to
   * how the form closed, or `undefined` if cancelled.
   */
  const create = async (prefill: Partial<ITransactionBody> = {}) => {
    const active = (accounts ?? []).filter((a) => !a.archived)
    if (accounts && !active.length) {
      notify.info('Add an account first', 'Every entry comes out of or goes into one.')
      const accountId = await accountActions.create()
      if (!accountId) return undefined
      return open({ prefill: { ...prefill, accountId } })
    }
    return open({ prefill })
  }

  /** Opens the form on an existing entry. */
  const edit = (transaction: ITransaction) => open({ transaction })

  /** A prefilled add form dated today, like any new entry. */
  const duplicate = (transaction: ITransaction) =>
    create({ ...toBody(transaction), date: localDate() })

  /** Asks first, since a delete can't be undone. Resolves to whether the entry was deleted. */
  const deleteTransaction = async (transaction: ITransaction): Promise<boolean> => {
    const amount = formatMoney(transaction.amount, transaction.currency)
    const confirmed = await confirm({
      title: 'Delete this transaction?',
      message:
        `${amount} ${transaction.type === 'income' ? 'comes off' : 'goes back onto'} ` +
        (transaction.type === 'transfer'
          ? 'the accounts it moved between'
          : 'the account balance') +
        ". This can't be undone.",
      confirmText: 'Delete transaction',
      confirmVariant: 'danger',
      onConfirm: () =>
        attempt(() => remove.mutateAsync(transaction.id), 'Could not delete transaction'),
    })
    if (confirmed) notify.success('Transaction deleted', amount)
    return !!confirmed
  }

  /** Opens the filters sheet. Resolves to the new filter, or `undefined` if cancelled. */
  const openFilters = (filter: TransactionFilter, currency: string) =>
    sheet.open<TransactionFilter>((handle) => (
      <TransactionFilters filter={filter} currency={currency} sheet={handle} />
    ))

  return {
    create,
    edit,
    duplicate,
    delete: deleteTransaction,
    makeRecurring,
    openRule,
    openFilters,
  }
}
