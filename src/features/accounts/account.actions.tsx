import type { ComponentProps } from 'react'
import { LUIConfirmDialog, useLUIModal, useLUINotification } from '@lumen-ui/react'
import { useSheet } from '@/components/sheet'
import { getApiErrorMessage } from '@/lib'
import { formatMoney } from '@/utils'
import { balanceView } from './account.labels'
import { useDeleteAccount, useSetAccountArchived } from './account.query'
import type { IAccount } from './account.types'
import { AccountForm } from './components/AccountForm'
import { ReconcileForm } from './components/ReconcileForm'

type ConfirmData = ComponentProps<typeof LUIConfirmDialog>['data']

/**
 * The accounts screens' user flows: forms in sheets, warnings, confirmations
 * and toasts. Cards and the detail page share it, so every screen behaves the
 * same.
 */
export function useAccountActions() {
  const sheet = useSheet()
  const modal = useLUIModal()
  const notify = useLUINotification()
  const setArchived = useSetAccountArchived()
  const remove = useDeleteAccount()

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

  /** Opens the add form. Resolves to the new account's id, or `undefined` if cancelled. */
  const create = () => sheet.open<number>((handle) => <AccountForm sheet={handle} />)

  const edit = (account: IAccount) =>
    sheet.open<number>((handle) => <AccountForm account={account} sheet={handle} />)

  const reconcile = (account: IAccount) =>
    sheet.open<boolean>((handle) => <ReconcileForm account={account} sheet={handle} />)

  /**
   * Archives at once when the balance is zero. Otherwise it warns first,
   * because the money leaves the total.
   */
  const archive = async (account: IAccount) => {
    const write = () => setArchived.mutateAsync({ id: account.id, archived: true })
    let archived: boolean
    if (account.currentBalance === 0) {
      archived = await attempt(write, 'Could not archive account').then(
        () => true,
        () => false,
      )
    } else {
      const view = balanceView(account)
      const amount = formatMoney(view.amount, account.currency)
      const balance = view.caption === 'Owed' ? `${amount} owed` : amount
      archived = !!(await confirm({
        title: `Archive ${account.name}?`,
        message:
          `Its balance isn't zero (${balance}). Archiving hides it from pickers, the ` +
          'dashboard and your total balance. Its history stays, and you can restore it anytime.',
        confirmText: 'Archive',
        confirmVariant: 'primary',
        onConfirm: () => attempt(write, 'Could not archive account'),
      }))
    }
    if (archived) notify.success('Account archived', account.name)
  }

  const restore = async (account: IAccount) => {
    const restored = await attempt(
      () => setArchived.mutateAsync({ id: account.id, archived: false }),
      'Could not restore account',
    ).then(
      () => true,
      () => false,
    )
    if (restored) notify.success('Account restored', account.name)
  }

  /** Asks first, since a delete can't be undone. Resolves to whether the account was deleted. */
  const deleteAccount = async (account: IAccount): Promise<boolean> => {
    const confirmed = await confirm({
      title: `Delete ${account.name}?`,
      message: "This can't be undone. Archive it instead if you want to keep its history.",
      confirmText: 'Delete account',
      confirmVariant: 'danger',
      onConfirm: () => attempt(() => remove.mutateAsync(account.id), 'Could not delete account'),
    })
    if (confirmed) notify.success('Account deleted', account.name)
    return !!confirmed
  }

  return { create, edit, reconcile, archive, restore, delete: deleteAccount }
}
