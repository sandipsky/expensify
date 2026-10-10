import { useState } from 'react'
import { LUIButton, LUICard } from '@lumen-ui/react'
import { DonutChart, type DonutSegment } from '@/components/chart'
import { EmptyState } from '@/components/empty-state'
import { ReportRow } from '@/components/report-row'
import { useTransactionActions } from '@/features/transactions/transaction.actions'
import { entries } from '@/features/transactions/transaction.labels'
import { categoryCount, percentText } from '../dashboard.labels'
import type { SpendingRow } from '../dashboard.types'
import type { Dashboard } from '../useDashboard'
import './SpendingCard.scss'

/**
 * The period's expenses by category: a donut of the top five and "Other",
 * each with its amount and share, in the category's color and icon.
 * Transfers stay out. The chart's table toggle lists the same rows; a slice
 * or a row opens the transaction list on that category and period.
 */
export const SpendingCard = ({ dash }: { dash: Dashboard }) => {
  const actions = useTransactionActions()
  /** The donut's table view stands in for the rows, so they aren't listed twice. */
  const [showTable, setShowTable] = useState(false)
  const rows = dash.spending

  /** "3 transactions", or "4 categories · 9 transactions" for Other. */
  const caption = (row: SpendingRow): string => {
    const count = entries(row.count)
    return row.categoryIds.length > 1 ? `${categoryCount(row.categoryIds.length)} · ${count}` : count
  }

  const open = (row: SpendingRow) => {
    if (!row.categoryIds.length) return
    dash.drillDown({ range: dash.range, type: 'expense', categoryIds: row.categoryIds })
  }

  const openSegment = (segment: DonutSegment) => {
    const row = rows.find((r) => r.key === segment.key)
    if (row) open(row)
  }

  return (
    <LUICard className="dash-card" title="Spending by category" padding={rows.length ? 'md' : 'none'}>
      {!rows.length ? (
        <EmptyState
          icon="pie_chart"
          title="No expenses this period"
          message="Add an expense to see where the money goes."
        >
          <LUIButton size="lg" onClick={() => actions.create({ type: 'expense' })}>
            Add expense
          </LUIButton>
        </EmptyState>
      ) : (
        <div className="spending">
          <div className="spending__donut">
            <DonutChart
              label={`Spending by category, ${dash.periodLabel}`}
              segments={dash.segments}
              format={dash.money}
              clickable
              legend={false}
              size={180}
              showTable={showTable}
              onShowTableChange={setShowTable}
              onSegmentClick={openSegment}
            >
              <span className="spending__total">{dash.money(dash.spent)}</span>
              <span className="spending__caption">{entries(dash.spentCount)}</span>
            </DonutChart>
          </div>

          {!showTable && (
            <ul className="spending__list dash-list" aria-label="Spending by category">
              {rows.map((row) => (
                <li key={row.key}>
                  <ReportRow
                    icon={row.icon}
                    color={row.color}
                    name={row.name}
                    caption={caption(row)}
                    value={dash.money(row.amount)}
                    detail={percentText(row.share)}
                    clickable={!!row.categoryIds.length}
                    onOpen={() => open(row)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </LUICard>
  )
}
