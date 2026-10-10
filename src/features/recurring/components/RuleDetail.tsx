import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { LUIButton, LUICard, LUIChip, LUIIcon, LUIMenu, LUISkeleton } from '@lumen-ui/react'
import { EmptyState } from '@/components/empty-state'
import { useAccounts } from '@/features/accounts/account.query'
import { useCategories } from '@/features/categories/category.query'
import { TransactionAmount } from '@/features/transactions/components/TransactionAmount'
import { TransactionIcon } from '@/features/transactions/components/TransactionIcon'
import { TransactionRow } from '@/features/transactions/components/TransactionRow'
import { useTransactionActions } from '@/features/transactions/transaction.actions'
import { compareNewestFirst } from '@/features/transactions/transaction.domain'
import {
  type TxLookups,
  type TxRow,
  categoryOf,
  toRow,
} from '@/features/transactions/transaction.labels'
import { useTransactions } from '@/features/transactions/transaction.query'
import { getApiErrorMessage, useToday } from '@/lib'
import { formatDate } from '@/utils'
import { useRecurringActions } from '../recurring.actions'
import { pendingDates } from '../recurring.domain'
import { type RuleView, endLabel, entryCount, toRuleView } from '../recurring.labels'
import { useRecurringRules } from '../recurring.query'
import './RuleDetail.scss'

/** How many entries the history shows before "Show more". */
const PAGE_SIZE = 50
/** How many upcoming dates the details list. */
const UPCOMING = 5

type RuleDetailProps = {
  ruleId: string
}

/**
 * `/recurring/$ruleId`: the rule's entry and schedule, its next dates, an
 * entry waiting to be confirmed, and the entries it has added, newest first.
 */
export const RuleDetail = ({ ruleId }: RuleDetailProps) => {
  const id = Number(ruleId)
  const navigate = useNavigate()
  const today = useToday()
  const rulesQuery = useRecurringRules()
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()

  if (rulesQuery.isLoading || accountsQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <div className="rule-page">
        <LUISkeleton height="56px" />
        <LUISkeleton height="220px" />
        <LUISkeleton height="200px" />
      </div>
    )
  }

  const rule = rulesQuery.data?.find((r) => r.id === id)
  if (!rule) {
    return (
      <LUICard>
        <EmptyState
          icon="event_repeat"
          title="Rule not found"
          message={
            rulesQuery.isError
              ? getApiErrorMessage(rulesQuery.error)
              : 'It may have been deleted, perhaps in another tab.'
          }
        >
          <LUIButton size="lg" onClick={() => navigate({ to: '/recurring' })}>
            Back to recurring
          </LUIButton>
        </EmptyState>
      </LUICard>
    )
  }

  const lookups: TxLookups = {
    accountsById: new Map((accountsQuery.data ?? []).map((a) => [a.id, a])),
    categoriesById: new Map((categoriesQuery.data ?? []).map((c) => [c.id, c])),
    today,
  }
  // Keyed, so the page of history starts over for another rule.
  return <RulePage key={rule.id} view={toRuleView(rule, lookups)} lookups={lookups} />
}

interface RulePageProps {
  view: RuleView
  lookups: TxLookups
}

const RulePage = ({ view, lookups }: RulePageProps) => {
  const navigate = useNavigate()
  const actions = useRecurringActions()
  const txActions = useTransactionActions()
  const history = useTransactions({ recurringRuleId: view.id })
  const [limit, setLimit] = useState(PAGE_SIZE)
  const { rule } = view

  const upcoming = view.status === 'active' ? pendingDates(rule, UPCOMING) : []
  const waiting = rule.mode === 'confirm' && view.due.length > 0

  // Every entry has the same note and category, so each row leads with its date.
  const allRows = [...(history.data ?? [])]
    .sort(compareNewestFirst)
    .map((tx) => ({ ...toRow(tx, lookups), title: formatDate(tx.date) }))
  const rows = allRows.slice(0, limit)
  const hiddenCount = allRows.length - rows.length

  const open = (row: TxRow) =>
    navigate({ to: '/transactions/$transactionId', params: { transactionId: String(row.id) } })

  const remove = async () => {
    if (await actions.delete(view)) navigate({ to: '/recurring' })
  }

  const details: { label: string; value: string }[] = [
    ...(view.kind === 'transfer' ? [] : [{ label: 'Category', value: categoryOf(lookups, rule.template).name }]),
    { label: view.kind === 'transfer' ? 'Accounts' : 'Account', value: view.accountLabel },
    { label: 'Starts', value: formatDate(rule.startDate) },
    { label: 'Ends', value: endLabel(rule) || 'Never' },
    {
      label: 'On the due date',
      value: rule.mode === 'confirm' ? 'Asks you first' : 'Adds it automatically',
    },
    { label: 'Added so far', value: entryCount(rule.occurrences) },
  ]

  const menuTrigger = (
    <LUIButton variant="ghost" size="lg" rounded aria-label="More actions">
      <LUIIcon name="more" color="inherit" />
    </LUIButton>
  )

  return (
    <div className="rule-page">
      <div className="rule-page__header">
        <LUIButton
          variant="ghost"
          size="lg"
          rounded
          aria-label="Back to recurring"
          onClick={() => navigate({ to: '/recurring' })}
        >
          <LUIIcon name="caret" className="rotate-180" color="inherit" />
        </LUIButton>

        <TransactionIcon row={view} size={48} />

        <div className="rule-page__title">
          <h1 className="text-ellipsis">{view.name}</h1>
          <div className="rule-page__meta">
            <span>{view.schedule}</span>
            {view.status === 'paused' && <LUIChip size="sm">Paused</LUIChip>}
            {view.status === 'ended' && <LUIChip size="sm">Ended</LUIChip>}
            {rule.mode === 'confirm' && <LUIChip size="sm">Asks first</LUIChip>}
          </div>
        </div>

        <div className="rule-page__actions">
          <LUIButton variant="outlined" size="lg" onClick={() => actions.edit(rule)}>
            <LUIIcon name="edit" color="inherit" />
            Edit
          </LUIButton>
          <LUIMenu mode="right" closeOnItemClick appendBody dropdownDisplay={menuTrigger}>
            {/* An ended rule has nothing to pause: edit its end to run it again. */}
            {view.status !== 'ended' &&
              (rule.active ? (
                <button
                  type="button"
                  className="dropdown-item rule-page__item"
                  onClick={() => actions.pause(view)}
                >
                  <LUIIcon name="eye_slash" size={18} />
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  className="dropdown-item rule-page__item"
                  onClick={() => actions.resume(view)}
                >
                  <LUIIcon name="eye" size={18} />
                  Resume
                </button>
              ))}
            <button
              type="button"
              className="dropdown-item rule-page__item rule-page__item--danger"
              onClick={remove}
            >
              <LUIIcon name="trash" size={18} color="inherit" />
              Delete
            </button>
          </LUIMenu>
        </div>
      </div>

      {view.status === 'missing_account' && (
        <p className="alert error">
          An account this rule uses was deleted, so it can't add entries. Edit the rule to pick
          another account.
        </p>
      )}
      {view.status === 'paused' && (
        <p className="alert warn">Paused: no entries are added until you resume it.</p>
      )}

      {waiting && (
        <LUICard title="Waiting for you">
          <div className="rule-due">
            <p>
              Due {formatDate(view.due[0])}
              {view.due.length > 1 && (
                <span className="rule-due__more"> · then {entryCount(view.due.length - 1)} more</span>
              )}
            </p>
            <div className="rule-due__actions">
              <LUIButton size="lg" onClick={() => actions.confirm(view, view.due[0])}>
                <LUIIcon name="add" color="inherit" />
                Confirm
              </LUIButton>
              <LUIButton variant="outlined" size="lg" onClick={() => actions.skip(view, view.due[0])}>
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
          </div>
        </LUICard>
      )}

      <LUICard padding="lg">
        <div className="rule-page__amount">
          <span className="rule-page__caption">
            {view.kind === 'transfer' ? 'Moves' : view.kind === 'income' ? 'Receives' : 'Spends'}
          </span>
          <TransactionAmount kind={view.kind} amount={view.amount} currency={view.currency} size="lg" />
          <span className="rule-page__caption">{view.schedule}</span>
        </div>
      </LUICard>

      <LUICard title="Details">
        <dl className="rule-page__facts">
          {details.map((item) => (
            <div key={item.label} className="rule-page__fact">
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>

        {upcoming.length > 0 && (
          <>
            <h2 className="rule-page__subhead">Next dates</h2>
            <ul className="rule-next">
              {upcoming.map((date) => (
                <li key={date}>
                  {formatDate(date)}
                  {date <= lookups.today && (
                    <LUIChip size="sm" variant="warn">
                      Due
                    </LUIChip>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </LUICard>

      <LUICard
        title="Entries added"
        padding="none"
        footer={
          hiddenCount > 0 ? (
            <div className="rule-page__more">
              <LUIButton variant="outlined" size="lg" onClick={() => setLimit(limit + PAGE_SIZE)}>
                Show more ({hiddenCount})
              </LUIButton>
            </div>
          ) : undefined
        }
      >
        {history.isLoading ? (
          <div className="rule-page__skeleton">
            <LUISkeleton height="56px" />
            <LUISkeleton height="56px" />
          </div>
        ) : history.isError ? (
          <div className="rule-page__skeleton">
            <div className="alert error">{getApiErrorMessage(history.error)}</div>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="receipt"
            title="Nothing added yet"
            message={
              view.next
                ? 'Entries show up here from their due date.'
                : 'This rule ended without adding any entries.'
            }
          >
            <LUIButton variant="outlined" size="lg" onClick={() => actions.edit(rule)}>
              Edit rule
            </LUIButton>
          </EmptyState>
        ) : (
          <ul className="rule-page__history">
            {rows.map((row) => (
              <li key={row.id}>
                <TransactionRow
                  row={row}
                  onOpen={() => open(row)}
                  onEdit={() => txActions.edit(row.tx)}
                  onDelete={() => txActions.delete(row.tx)}
                />
              </li>
            ))}
          </ul>
        )}
      </LUICard>
    </div>
  )
}
