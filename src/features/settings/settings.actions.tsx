import type { ComponentProps } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LUIConfirmDialog, useLUIModal, useLUINotification } from '@lumen-ui/react'
import { useSheet } from '@/components/sheet'
import { useAuthStore } from '@/features/auth/auth.store'
import { clearNotificationState } from '@/features/notifications/device-state'
import { entries } from '@/features/transactions/transaction.labels'
import { transactionKeys, useDeleteAllTransactions } from '@/features/transactions/transaction.query'
import { getTransactions } from '@/features/transactions/transactions.api'
import { getApiErrorMessage } from '@/lib'
import { DeleteAccountDialog } from './components/DeleteAccountDialog'
import { PasswordForm } from './components/PasswordForm'

type ConfirmData = ComponentProps<typeof LUIConfirmDialog>['data']

/** Where a deleted account lands, with a note that says so. */
const DELETED_URL = '/login?deleted=1'

/**
 * The Settings flows that open a sheet or a dialog: changing the password,
 * deleting every transaction and deleting the account. Each delete asks
 * first, since neither has an undo.
 */
export function useSettingsActions() {
  const sheet = useSheet()
  const modal = useLUIModal()
  const notify = useLUINotification()
  const queryClient = useQueryClient()
  const deleteAll = useDeleteAllTransactions()
  const logout = useAuthStore((s) => s.logout)

  const confirm = (data: ConfirmData) =>
    modal
      .open<boolean>((ref) => <LUIConfirmDialog modalRef={ref} data={data} />, { width: '440px' })
      .afterClosed()

  /** Resolves to whether the password changed. */
  const changePassword = () =>
    sheet.open<boolean>((handle) => <PasswordForm sheet={handle} />, { width: '440px' })

  /**
   * Deletes every transaction once confirmed. Balances drop what the entries
   * added or took; accounts, categories, budgets and rules stay. Resolves to
   * whether anything was deleted.
   */
  const deleteAllTransactions = async (): Promise<boolean> => {
    let count: number
    try {
      // The cached full list when there is one: it's only for the question.
      const all = await queryClient.fetchQuery({
        queryKey: transactionKeys.list({}),
        queryFn: () => getTransactions({}),
      })
      count = all.length
    } catch (error) {
      notify.error('Could not count your transactions', getApiErrorMessage(error))
      return false
    }
    if (!count) {
      notify.info('No transactions to delete')
      return false
    }

    let deleted = count
    const confirmed = await confirm({
      title: `Delete all ${entries(count)}?`,
      message:
        'Each account goes back to its balance from before them. Accounts, categories, ' +
        "budgets and recurring rules stay. This can't be undone.",
      confirmText: 'Delete all',
      confirmVariant: 'danger',
      onConfirm: async () => {
        try {
          deleted = await deleteAll.mutateAsync()
        } catch (error) {
          // Reported and rethrown, so the dialog stays open for another try.
          notify.error('Could not delete transactions', getApiErrorMessage(error))
          throw error
        }
      },
    })
    if (!confirmed) return false
    notify.success(`Deleted ${entries(deleted)}`, 'Account balances are back to where they started.')
    return true
  }

  /**
   * Deletes the account once the user types DELETE and their password, then
   * signs out to the login page with a note. Everything they entered goes
   * with it, and this browser forgets the reminders it showed.
   */
  const deleteAccount = async () => {
    const deleted = await modal
      .open<boolean>((ref) => <DeleteAccountDialog modalRef={ref} />, {
        width: '440px',
        panelClass: 'sheet-panel',
      })
      .afterClosed()
    if (!deleted) return
    clearNotificationState()
    logout(DELETED_URL)
  }

  return { changePassword, deleteAllTransactions, deleteAccount }
}
