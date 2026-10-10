import { useNavigate } from '@tanstack/react-router'
import { LUIButton, LUICard, LUIIcon, LUISkeleton } from '@lumen-ui/react'
import { EmptyState } from '@/components/empty-state'
import { useAccounts } from '@/features/accounts/account.query'
import type { IAccount } from '@/features/accounts/account.types'
import { useCategories } from '@/features/categories/category.query'
import { getErrorMessage } from '@/lib'
import { dayLabel, formatMoney, localDate } from '@/utils'
import { useTransactionActions } from '../transaction.actions'
import { compareNewestFirst, groupByDay, totalsOf } from '../transaction.domain'
import { type TxLookups, type TxRow, entries, toRow } from '../transaction.labels'
import { useTransactions } from '../transaction.query'
import { TransactionRow } from './TransactionRow'
import './TransactionList.scss'

interface AccountTransactionsProps {
  account: IAccount
}

/**
 * The account page's history: every entry touching the account, newest
 * first, grouped by day. Adding from here starts on this account.
 */
export const AccountTransactions = ({ account }: AccountTransactionsProps) => {
  const navigate = useNavigate()
  const actions = useTransactionActions()
  const transactions = useTransactions({ accountId: account.id })
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()

  const today = localDate()
  const lookups: TxLookups = {
    accountsById: new Map((accountsQuery.data ?? []).map((a) => [a.id, a])),
    categoriesById: new Map((categoriesQuery.data ?? []).map((c) => [c.id, c])),
    today,
  }

  const rows = [...(transactions.data ?? [])]
    .sort(compareNewestFirst)
    .map((tx) => toRow(tx, lookups))
  const days = groupByDay(rows).map(({ date, items }) => ({
    date,
    label: dayLabel(date, today),
    net: totalsOf(items.map((row) => row.tx)).net,
    rows: items,
  }))

  const open = (row: TxRow) =>
    navigate({ to: '/transactions/$transactionId', params: { transactionId: String(row.id) } })

  const addButton = !account.archived && (
    <LUIButton variant="outlined" size="md" onClick={() => actions.create({ accountId: account.id })}>
      <LUIIcon name="add" color="inherit" />
      Add
    </LUIButton>
  )

  if (transactions.isLoading || accountsQuery.isLoading || categoriesQuery.isLoading) {
    return <LUISkeleton height="240px" />
  }

  if (transactions.isError) {
    return (
      <LUICard title="Transactions">
        <div className="alert error">{getErrorMessage(transactions.error)}</div>
      </LUICard>
    )
  }

  if (!rows.length) {
    return (
      <LUICard title="Transactions" extra={addButton}>
        <EmptyState
          icon="receipt"
          title="No transactions yet"
          message="Entries on this account show up here, newest first."
        >
          {!account.archived && (
            <LUIButton size="lg" onClick={() => actions.create({ accountId: account.id })}>
              Add transaction
            </LUIButton>
          )}
        </EmptyState>
      </LUICard>
    )
  }

  return (
    <LUICard title={`Transactions · ${entries(rows.length)}`} extra={addButton} padding="none">
      <div className="tx-days">
        {days.map((day) => (
          <section key={day.date} className="tx-day-group" aria-label={day.label}>
            <div className="tx-day">
              <h2 className="tx-day__label">{day.label}</h2>
              <span
                className={`tx-day__net${day.net > 0 ? ' is-income' : day.net < 0 ? ' is-expense' : ''}`}
              >
                <span className="visually-hidden">Net </span>
                {formatMoney(day.net, account.currency, 'exceptZero')}
              </span>
            </div>
            <ul className="tx-list">
              {day.rows.map((row) => (
                <li key={row.id}>
                  <TransactionRow
                    row={row}
                    onOpen={() => open(row)}
                    onEdit={() => actions.edit(row.tx)}
                    onDelete={() => actions.delete(row.tx)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </LUICard>
  )
}
