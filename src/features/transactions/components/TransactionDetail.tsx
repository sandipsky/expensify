import { useNavigate } from '@tanstack/react-router'
import {
  LUIButton,
  LUICard,
  LUIChip,
  LUIIcon,
  LUIMenu,
  LUISkeleton,
  type ChipVariant,
} from '@lumen-ui/react'
import { EmptyState } from '@/components/empty-state'
import { useAccounts } from '@/features/accounts/account.query'
import { useCategories } from '@/features/categories/category.query'
import { useRecurringRules } from '@/features/recurring/recurring.query'
import { getErrorMessage } from '@/lib'
import { formatDateTime, formatMoney, localDate } from '@/utils'
import { useTransactionActions } from '../transaction.actions'
import { TX_TYPE_LABELS, type TxLookups, type TxRow, accountName, toRow } from '../transaction.labels'
import { useTransaction } from '../transaction.query'
import type { TxType } from '../transaction.types'
import { TransactionAmount } from './TransactionAmount'
import { TransactionIcon } from './TransactionIcon'
import './TransactionDetail.scss'

type TransactionDetailProps = {
  transactionId: string
}

const TYPE_CHIP: Readonly<Record<TxType, ChipVariant>> = {
  expense: 'error',
  income: 'success',
  transfer: 'default',
}

/** `/transactions/$transactionId`: one entry in full, with edit, duplicate and delete. */
export const TransactionDetail = ({ transactionId: id }: TransactionDetailProps) => {
  const navigate = useNavigate()
  const transaction = useTransaction(id)
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()
  const actions = useTransactionActions()

  const backToList = () => navigate({ to: '/transactions' })

  if (transaction.isLoading || accountsQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <div className="tx-detail">
        <LUISkeleton height="56px" />
        <LUISkeleton height="120px" />
        <LUISkeleton height="280px" />
      </div>
    )
  }

  if (transaction.isError || !transaction.data) {
    return (
      <LUICard>
        <EmptyState
          icon="receipt"
          title="Transaction not found"
          message={
            transaction.isError && transaction.error
              ? getErrorMessage(transaction.error)
              : 'It may have been deleted.'
          }
        >
          <LUIButton size="lg" onClick={backToList}>
            Back to transactions
          </LUIButton>
        </EmptyState>
      </LUICard>
    )
  }

  const lookups: TxLookups = {
    accountsById: new Map((accountsQuery.data ?? []).map((a) => [a.id, a])),
    categoriesById: new Map((categoriesQuery.data ?? []).map((c) => [c.id, c])),
    today: localDate(),
  }
  return <TransactionPage row={toRow(transaction.data, lookups)} lookups={lookups} actions={actions} />
}

interface TransactionPageProps {
  row: TxRow
  lookups: TxLookups
  actions: ReturnType<typeof useTransactionActions>
}

const TransactionPage = ({ row, lookups, actions }: TransactionPageProps) => {
  const navigate = useNavigate()
  const { data: rules } = useRecurringRules()
  const { tx } = row
  const transfer = tx.type === 'transfer'
  // The rule that added this entry, while it still exists.
  const rule =
    tx.recurringRuleId != null ? rules?.find((r) => r.id === tx.recurringRuleId) : undefined

  const remove = async () => {
    if (await actions.delete(tx)) navigate({ to: '/transactions' })
  }

  const menuTrigger = (
    <LUIButton variant="ghost" size="lg" rounded aria-label="More actions">
      <LUIIcon name="more" color="inherit" />
    </LUIButton>
  )

  const details: { label: string; value: string }[] = [
    { label: 'Type', value: TX_TYPE_LABELS[tx.type] },
    { label: 'Amount', value: formatMoney(tx.amount, tx.currency) },
    ...(transfer
      ? [
          { label: 'From account', value: accountName(lookups, tx.accountId) },
          { label: 'To account', value: accountName(lookups, tx.toAccountId) },
        ]
      : [
          { label: 'Category', value: row.categoryLabel },
          { label: 'Account', value: row.accountLabel },
        ]),
    { label: 'Date', value: row.dateLabel },
    { label: 'Added', value: formatDateTime(tx.createdAt) },
    ...(tx.updatedAt !== tx.createdAt
      ? [{ label: 'Last edited', value: formatDateTime(tx.updatedAt) }]
      : []),
  ]

  return (
    <div className="tx-detail">
      <div className="tx-detail__header">
        <LUIButton
          variant="ghost"
          size="lg"
          rounded
          aria-label="Back to transactions"
          onClick={() => navigate({ to: '/transactions' })}
        >
          <LUIIcon name="caret" className="rotate-180" color="inherit" />
        </LUIButton>

        <TransactionIcon row={row} size={48} />

        <div className="tx-detail__title">
          <h1 className="text-ellipsis">{row.title}</h1>
          <div className="tx-detail__meta">
            <LUIChip size="sm" variant={TYPE_CHIP[tx.type]}>
              {TX_TYPE_LABELS[tx.type]}
            </LUIChip>
            <span>{row.dateLabel}</span>
            {row.upcoming && (
              <LUIChip size="sm" variant="info">
                Upcoming
              </LUIChip>
            )}
            {rule && <LUIChip size="sm">Recurring</LUIChip>}
          </div>
        </div>

        <div className="tx-detail__actions">
          <LUIButton variant="outlined" size="lg" onClick={() => actions.edit(tx)}>
            <LUIIcon name="edit" color="inherit" />
            Edit
          </LUIButton>
          <LUIMenu mode="right" closeOnItemClick appendBody dropdownDisplay={menuTrigger}>
            <button
              type="button"
              className="dropdown-item tx-detail__item"
              onClick={() => actions.duplicate(tx)}
            >
              <LUIIcon name="content_copy" size={18} />
              Duplicate
            </button>
            {rule ? (
              <button
                type="button"
                className="dropdown-item tx-detail__item"
                onClick={() => actions.openRule(rule.id)}
              >
                <LUIIcon name="event_repeat" size={18} />
                Open recurring rule
              </button>
            ) : (
              <button
                type="button"
                className="dropdown-item tx-detail__item"
                onClick={() => actions.makeRecurring(tx)}
              >
                <LUIIcon name="event_repeat" size={18} />
                Make recurring
              </button>
            )}
            <button
              type="button"
              className="dropdown-item tx-detail__item tx-detail__item--danger"
              onClick={remove}
            >
              <LUIIcon name="trash" size={18} color="inherit" />
              Delete
            </button>
          </LUIMenu>
        </div>
      </div>

      <LUICard padding="lg">
        <div className="tx-detail__amount">
          <span className="tx-detail__caption">
            {transfer ? 'Amount moved' : tx.type === 'income' ? 'Received' : 'Spent'}
          </span>
          <TransactionAmount kind={row.kind} amount={row.amount} currency={row.currency} size="lg" />
          <span className="tx-detail__caption">{row.accountLabel}</span>
        </div>
      </LUICard>

      <LUICard title="Details">
        <dl className="tx-detail__list">
          {details.map((item) => (
            <div key={item.label} className="tx-detail__field">
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
          <div className="tx-detail__field tx-detail__field--wide">
            <dt>Note</dt>
            <dd className={row.note ? 'tx-detail__note' : 'tx-detail__empty'}>
              {row.note || 'No note'}
            </dd>
          </div>
        </dl>
      </LUICard>
    </div>
  )
}
