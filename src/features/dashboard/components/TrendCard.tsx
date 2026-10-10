import { LUIButton, LUICard } from '@lumen-ui/react'
import { BarChart, type BarChartGroup } from '@/components/chart'
import { EmptyState } from '@/components/empty-state'
import { useTransactionActions } from '@/features/transactions/transaction.actions'
import { TREND_PERIODS } from '../dashboard.domain'
import type { Dashboard } from '../useDashboard'

/**
 * Income and expense for the selected period and the five before it, with
 * each period's net under its bars; the chart's table toggle shows the same
 * figures. A bar selects that period in the switcher.
 */
export const TrendCard = ({ dash }: { dash: Dashboard }) => {
  const actions = useTransactionActions()

  const select = (group: BarChartGroup) => {
    const summary = dash.trend.find((s) => s.range.start === group.key)
    if (summary) dash.selectPeriod(summary.range)
  }

  return (
    <LUICard className="dash-card" title="Income vs expense" padding={dash.trendEmpty ? 'none' : 'md'}>
      {dash.trendEmpty ? (
        <EmptyState icon="bar_chart" title="No trend yet" message="Log a few entries to see your trend.">
          <LUIButton size="lg" onClick={() => actions.create()}>
            Add transaction
          </LUIButton>
        </EmptyState>
      ) : (
        <BarChart
          label={`Income and expense, last ${TREND_PERIODS} periods`}
          groups={dash.trendGroups}
          series={dash.flowSeries}
          format={dash.money}
          tickFormat={dash.compactTick}
          selected={dash.range.start}
          clickable
          height={180}
          onGroupClick={select}
        />
      )}
    </LUICard>
  )
}
