import type { ComponentProps } from 'react'
import { LUIConfirmDialog, useLUIModal, useLUINotification } from '@lumen-ui/react'
import { useSheet } from '@/components/sheet'
import { getApiErrorMessage } from '@/lib'
import { BudgetForm } from './components/BudgetForm'
import { useDeleteBudget, useSetBudgetActive } from './budget.query'
import type { IBudget } from './budget.types'

type ConfirmData = ComponentProps<typeof LUIConfirmDialog>['data']

/**
 * The budget screens' user flows: the form in a sheet, pausing and resuming,
 * and delete behind a confirmation. Cards and the detail page share it, so
 * every screen behaves the same.
 */
export function useBudgetActions() {
  const sheet = useSheet()
  const modal = useLUIModal()
  const notify = useLUINotification()
  const setActive = useSetBudgetActive()
  const remove = useDeleteBudget()

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

  /** Opens the add form. Resolves to the new budget's id, or `undefined` if cancelled. */
  const create = () => sheet.open<number>((handle) => <BudgetForm sheet={handle} />)

  const edit = (budget: IBudget) =>
    sheet.open<number>((handle) => <BudgetForm budget={budget} sheet={handle} />)

  /** Pausing keeps the budget's settings; it just stops tracking and alerting. */
  const pause = async (budget: IBudget) => {
    try {
      await setActive.mutateAsync({ id: budget.id, active: false })
      notify.success('Budget paused', budget.name)
    } catch (error) {
      notify.error('Could not pause budget', getApiErrorMessage(error))
    }
  }

  const resume = async (budget: IBudget) => {
    try {
      await setActive.mutateAsync({ id: budget.id, active: true })
      notify.success('Budget resumed', budget.name)
    } catch (error) {
      notify.error('Could not resume budget', getApiErrorMessage(error))
    }
  }

  /** Asks first, since a delete can't be undone. Resolves to whether the budget was deleted. */
  const deleteBudget = async (budget: IBudget): Promise<boolean> => {
    const confirmed = await confirm({
      title: `Delete ${budget.name}?`,
      message: "Its transactions stay as they are. This can't be undone; pause it to keep it.",
      confirmText: 'Delete budget',
      confirmVariant: 'danger',
      onConfirm: () => attempt(() => remove.mutateAsync(budget.id), 'Could not delete budget'),
    })
    if (confirmed) notify.success('Budget deleted', budget.name)
    return !!confirmed
  }

  return { create, edit, pause, resume, delete: deleteBudget }
}
