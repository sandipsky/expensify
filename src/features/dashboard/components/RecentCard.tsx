import { useNavigate } from '@tanstack/react-router'
import { LUIButton, LUICard } from '@lumen-ui/react'
import { EmptyState } from '@/components/empty-state'
import { TransactionRow } from '@/features/transactions/components/TransactionRow'
import { useTransactionActions } from '@/features/transactions/transaction.actions'
import type { TxRow } from '@/features/transactions/transaction.labels'
import type { Dashboard } from '../useDashboard'

/**
 * The period's five newest entries by date and creation, with "Upcoming" for
 * future dates. A row opens the entry's page, its menu edits or deletes it,
 * and "See all" opens the list on the period.
 */
export const RecentCard = ({ dash }: { dash: Dashboard }) => {
  const navigate = useNavigate()
  const actions = useTransactionActions()
  const rows = dash.recent

  const open = (row: TxRow) =>
    navigate({ to: '/transactions/$transactionId', params: { transactionId: String(row.id) } })

  return (
    <LUICard
      className="dash-card"
      title="Recent transactions"
      padding="none"
      extra={
        rows.length > 0 && (
          <button
            type="button"
            className="dash-link"
            onClick={() => dash.drillDown({ range: dash.range })}
          >
            See all
          </button>
        )
      }
    >
      {!rows.length ? (
        <EmptyState
          icon="receipt"
          title="Nothing logged this period"
          message="Add a transaction and it shows up here."
        >
          <LUIButton size="lg" onClick={() => actions.create({ type: 'expense' })}>
            Add your first expense
          </LUIButton>
        </EmptyState>
      ) : (
        <ul className="dash-list" aria-label="Recent transactions">
          {rows.map((row) => (
            <li key={row.id}>
              <TransactionRow
                row={row}
                masked={dash.masked}
                onOpen={() => open(row)}
                onEdit={() => actions.edit(row.tx)}
                onDelete={() => actions.delete(row.tx)}
              />
            </li>
          ))}
        </ul>
      )}
    </LUICard>
  )
}
