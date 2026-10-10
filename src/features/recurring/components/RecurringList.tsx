import {
  LUIAccordion,
  LUIAccordionItem,
  LUIBreadcrumb,
  LUIButton,
  LUICard,
  LUIIcon,
  LUISkeleton,
} from '@lumen-ui/react'
import { EmptyState } from '@/components/empty-state'
import { useAccounts } from '@/features/accounts/account.query'
import { useCategories } from '@/features/categories/category.query'
import { TransactionAmount } from '@/features/transactions/components/TransactionAmount'
import { TransactionIcon } from '@/features/transactions/components/TransactionIcon'
import type { TxLookups } from '@/features/transactions/transaction.labels'
import { getErrorMessage, useToday } from '@/lib'
import { useRecurringActions } from '../recurring.actions'
import { type RuleView, dueCaption, groupRules } from '../recurring.labels'
import { useRecurringRules } from '../recurring.query'
import { RuleRow } from './RuleRow'
import './RecurringList.scss'

/**
 * `/recurring`: ask-first entries waiting for Confirm, Skip or Edit, then the
 * running rules with their next date, then paused and ended ones. Automatic
 * rules add their entries on their own (`RecurringRunner`).
 */
export const RecurringList = () => {
  const today = useToday()
  const rulesQuery = useRecurringRules()
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()
  const actions = useRecurringActions()

  if (rulesQuery.isLoading || accountsQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <div className="recurring-page">
        <LUIBreadcrumb title="Recurring" />
        <LUISkeleton height="200px" />
      </div>
    )
  }

  if (rulesQuery.isError) {
    return (
      <div className="recurring-page">
        <LUIBreadcrumb title="Recurring" />
        <div className="alert error">{getErrorMessage(rulesQuery.error)}</div>
      </div>
    )
  }

  const lookups: TxLookups = {
    accountsById: new Map((accountsQuery.data ?? []).map((a) => [a.id, a])),
    categoriesById: new Map((categoriesQuery.data ?? []).map((c) => [c.id, c])),
    today,
  }
  const groups = groupRules(rulesQuery.data ?? [], lookups)

  const addButton = (
    <LUIButton size="lg" onClick={() => actions.create()}>
      <LUIIcon name="add" color="inherit" />
      Add rule
    </LUIButton>
  )

  const ruleList = (views: RuleView[], label?: string) => (
    <ul className="rule-list" aria-label={label}>
      {views.map((view) => (
        <li key={view.id}>
          <RuleRow
            view={view}
            today={today}
            onEdit={() => actions.edit(view.rule)}
            onPause={() => actions.pause(view)}
            onResume={() => actions.resume(view)}
            onDelete={() => actions.delete(view)}
          />
        </li>
      ))}
    </ul>
  )

  return (
    <div className="recurring-page">
      <div className="recurring-page__header">
        <LUIBreadcrumb title="Recurring" />
        {groups.all.length > 0 && addButton}
      </div>

      {groups.all.length === 0 ? (
        <LUICard>
          <EmptyState
            icon="event_repeat"
            title="No recurring entries yet"
            message="Add your salary, rent or subscriptions once, and they're logged on schedule. You can also open any transaction and choose Make recurring."
          >
            {addButton}
          </EmptyState>
        </LUICard>
      ) : (
        <>
          {groups.waiting.length > 0 && (
            <LUICard title="Waiting for you" padding="none">
              <ul className="rule-list" aria-label="Entries waiting for you">
                {groups.waiting.map((view) => (
                  <li key={view.id} className="due-item">
                    <div className="due-item__head">
                      <TransactionIcon row={view} size={40} />
                      <div className="due-item__text">
                        <span className="due-item__name text-ellipsis">{view.name}</span>
                        <span className="due-item__caption">{dueCaption(view)}</span>
                      </div>
                      <TransactionAmount kind={view.kind} amount={view.amount} currency={view.currency} />
                    </div>
                    <div className="due-item__actions">
                      <LUIButton size="lg" onClick={() => actions.confirm(view, view.due[0])}>
                        <LUIIcon name="add" color="inherit" />
                        Confirm
                      </LUIButton>
                      <LUIButton
                        variant="outlined"
                        size="lg"
                        onClick={() => actions.skip(view, view.due[0])}
                      >
                        Skip
                      </LUIButton>
                      <LUIButton
                        variant="ghost"
                        size="lg"
                        onClick={() => actions.editAndConfirm(view, view.due[0])}
                      >
                        <LUIIcon name="edit" color="inherit" />
                        Edit
                      </LUIButton>
                    </div>
                  </li>
                ))}
              </ul>
            </LUICard>
          )}

          {groups.active.length > 0 ? (
            <LUICard title="Active" padding="none">
              {ruleList(groups.active, 'Active rules')}
            </LUICard>
          ) : (
            <LUICard>
              <EmptyState
                icon="event_repeat"
                title="No active rules"
                message="Resume a paused rule, or add a new one."
              >
                {addButton}
              </EmptyState>
            </LUICard>
          )}

          {(groups.paused.length > 0 || groups.ended.length > 0) && (
            <LUIAccordion>
              {groups.paused.length > 0 && (
                <LUIAccordionItem title={`Paused (${groups.paused.length})`}>
                  {ruleList(groups.paused)}
                </LUIAccordionItem>
              )}
              {groups.ended.length > 0 && (
                <LUIAccordionItem title={`Ended (${groups.ended.length})`}>
                  {ruleList(groups.ended)}
                </LUIAccordionItem>
              )}
            </LUIAccordion>
          )}
        </>
      )}
    </div>
  )
}
