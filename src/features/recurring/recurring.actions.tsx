import type { ComponentProps } from 'react'
import { LUIConfirmDialog, useLUIModal, useLUINotification } from '@lumen-ui/react'
import { useSheet } from '@/components/sheet'
import {
  TransactionForm,
  type TransactionFormResult,
} from '@/features/transactions/components/TransactionForm'
import type { ITransaction, ITransactionBody, TxType } from '@/features/transactions/transaction.types'
import { getErrorMessage } from '@/lib'
import { formatDate, formatMoney, localDate } from '@/utils'
import { RuleForm } from './components/RuleForm'
import {
  nextAfter,
  occurrenceOf,
  resumedDueDate,
  scheduleAfter,
  templateOf,
} from './recurring.domain'
import type { RuleView } from './recurring.labels'
import {
  isAlreadyHandled,
  useAddOccurrences,
  useDeleteRecurringRule,
  useSetRecurringRuleActive,
  useSkipOccurrence,
} from './recurring.query'
import type { IRecurringRule } from './recurring.types'

type ConfirmData = ComponentProps<typeof LUIConfirmDialog>['data']

/** Tall enough for the entry and its schedule; a near full-height sheet on phones. */
const FORM_OPTIONS = { width: '560px', phoneHeight: '94dvh' }

/** "+Rs 3,000.00", "−Rs 250.00", or unsigned for a transfer. */
const signedAmount = (kind: TxType, amount: number, currency: string) =>
  formatMoney(
    kind === 'expense' ? -amount : amount,
    currency,
    kind === 'transfer' ? 'auto' : 'exceptZero',
  )

/**
 * The recurring screens' user flows: the rule form, "Make recurring",
 * pausing and resuming, delete behind a confirmation, and Confirm, Skip or
 * Edit for entries that ask first. Rows and the detail page share it, so
 * every screen behaves the same.
 */
export function useRecurringActions() {
  const sheet = useSheet()
  const modal = useLUIModal()
  const notify = useLUINotification()
  const setActive = useSetRecurringRuleActive()
  const remove = useDeleteRecurringRule()
  const addOccurrences = useAddOccurrences()
  const skipOccurrence = useSkipOccurrence()

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
      notify.error(failure, getErrorMessage(error))
      throw error
    }
  }

  /** A date another tab already handled isn't an error; anything else is. */
  const report = (error: unknown, failure: string) => {
    if (isAlreadyHandled(error)) {
      notify.info('Already handled', 'This entry was confirmed or skipped in another tab.')
    } else {
      notify.error(failure, getErrorMessage(error))
    }
  }

  /** Opens the add form. Resolves to the new rule's id, or `undefined` if cancelled. */
  const create = () => sheet.open<string>((handle) => <RuleForm sheet={handle} />, FORM_OPTIONS)

  /**
   * "Make recurring": a rule with the entry's fields, repeating monthly from
   * one period after it, so the entry itself isn't added again.
   */
  const createFrom = (tx: ITransaction) =>
    sheet.open<string>(
      (handle) => (
        <RuleForm
          prefill={{ template: templateOf(tx), ...scheduleAfter(tx.date, 'monthly') }}
          fromDate={tx.date}
          sheet={handle}
        />
      ),
      FORM_OPTIONS,
    )

  const edit = (rule: IRecurringRule) =>
    sheet.open<string>((handle) => <RuleForm rule={rule} sheet={handle} />, FORM_OPTIONS)

  /** No new entries while paused. */
  const pause = async (view: RuleView) => {
    try {
      await setActive.mutateAsync({ id: view.id, active: false })
      notify.success('Recurring rule paused', view.name)
    } catch (error) {
      notify.error('Could not pause rule', getErrorMessage(error))
    }
  }

  /** Picks up from today; dates that passed while paused are left out. */
  const resume = async (view: RuleView) => {
    const nextDueDate = resumedDueDate(view.rule, view.rule.nextDueDate, localDate())
    try {
      await setActive.mutateAsync({ id: view.id, active: true, nextDueDate })
      notify.success('Recurring rule resumed', view.name)
    } catch (error) {
      notify.error('Could not resume rule', getErrorMessage(error))
    }
  }

  /** Asks first, since a delete can't be undone. Resolves to whether the rule was deleted. */
  const deleteRule = async (view: RuleView): Promise<boolean> => {
    const confirmed = await confirm({
      title: 'Delete this recurring rule?',
      message: `${view.name}: entries it already added stay. This can't be undone; pause it to keep it.`,
      confirmText: 'Delete rule',
      confirmVariant: 'danger',
      onConfirm: () => attempt(() => remove.mutateAsync(view.id), 'Could not delete rule'),
    })
    if (confirmed) notify.success('Recurring rule deleted', view.name)
    return !!confirmed
  }

  /** Adds the ask-first entry due on `date`: as the rule has it, or as edited (`entry`). */
  const confirmDue = async (view: RuleView, date: string, entry?: ITransactionBody) => {
    try {
      await addOccurrences.mutateAsync({
        id: view.id,
        body: { dates: [date], nextDueDate: nextAfter(view.rule, date), entry },
      })
      const amount = entry
        ? signedAmount(entry.type, entry.amount, view.currency)
        : signedAmount(view.kind, view.rule.template.amount, view.currency)
      notify.success('Entry added', `${view.name} · ${amount}`)
    } catch (error) {
      report(error, "Couldn't add the entry")
    }
  }

  /** Passes over the entry due on `date` without adding anything. */
  const skip = async (view: RuleView, date: string) => {
    try {
      await skipOccurrence.mutateAsync({ id: view.id, date, nextDueDate: nextAfter(view.rule, date) })
      notify.info('Entry skipped', `${view.name} · ${formatDate(date)}`)
    } catch (error) {
      report(error, "Couldn't skip the entry")
    }
  }

  /** Opens the entry due on `date` in the transaction form, and adds it as edited. */
  const editAndConfirm = async (view: RuleView, date: string) => {
    const result = await sheet.open<TransactionFormResult>(
      (handle) => (
        <TransactionForm
          prefill={occurrenceOf(view.rule.template, date)}
          draft={{ title: 'Confirm recurring entry', saveLabel: 'Add entry' }}
          sheet={handle}
        />
      ),
      FORM_OPTIONS,
    )
    if (result?.action === 'draft') await confirmDue(view, date, result.body)
  }

  return {
    create,
    createFrom,
    edit,
    pause,
    resume,
    delete: deleteRule,
    confirm: confirmDue,
    skip,
    editAndConfirm,
  }
}
