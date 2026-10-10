import { useNavigate } from '@tanstack/react-router'
import { LUICard } from '@lumen-ui/react'
import { BarChart, type BarChartGroup, type ChartSeries } from '@/components/chart'
import { EmptyState } from '@/components/empty-state'
import { idsOf, idsParamOf, transactionSearchFor } from '@/features/transactions/transaction.search'
import { useTransactions } from '@/features/transactions/transaction.query'
import { type DateRange, formatPeriod } from '@/utils'
import { type FlowRow, bucketsOf, cashFlow, onAccounts, periodState, sumOf } from '../report.domain'
import { type ExportColumn, type ReportDocument, reportFileName } from '../report.export'
import {
  GRANULARITY_LABELS,
  GRANULARITY_OPTIONS,
  PER_BUCKET,
  accountsText,
  bucketLabel,
  percentText,
  spansYears,
  thinLabels,
} from '../report.labels'
import type { CashFlowSearch, Granularity } from '../report.types'
import { useReportBase } from '../useReportBase'
import { AccountsField, PeriodField, SwitchField } from './ReportFields'
import { ReportFrame } from './ReportFrame'
import { type ReportColumn, ReportTable } from './ReportTable'
import { ReportTiles } from './ReportTiles'

const FLOW_SERIES: readonly ChartSeries[] = [
  { key: 'income', label: 'Income', color: 'var(--success)' },
  { key: 'expense', label: 'Expense', color: 'var(--error)' },
]

/** The tone a net amount reads in: green above zero, red below. */
const toneOf = (amount: number) => (amount > 0 ? 'is-income' : amount < 0 ? 'is-expense' : '')

/**
 * `/reports/cash-flow`: income, expense, net and savings rate per week,
 * month or year over the period, for every account or the ones picked. A bar
 * or a row opens the transactions behind it.
 */
export const CashFlowReport = ({ search }: { search: CashFlowSearch }) => {
  const navigate = useNavigate()
  const base = useReportBase()
  const { money, signedMoney, compactMoney } = base

  const period = periodState(search, 'last_12_months', base.today)
  const { range } = period
  const by: Granularity = search.by ?? 'month'
  const accountIds = idsOf(search.accounts)

  const query = useTransactions({ from: range.start, to: range.end })

  const set = (changes: Partial<CashFlowSearch>) =>
    void navigate({ to: '/reports/cash-flow', search: { ...search, ...changes }, replace: true })
  const filtered = Object.values(search).some((value) => value !== undefined)
  const reset = () => void navigate({ to: '/reports/cash-flow', search: {}, replace: true })

  const txs = onAccounts(query.data ?? [], accountIds)
  const buckets = bucketsOf(range, by)
  const rows = cashFlow(txs, buckets)
  const income = sumOf(rows.map((r) => r.income))
  const expense = sumOf(rows.map((r) => r.expense))
  const net = sumOf(rows.map((r) => r.net))
  const count = rows.reduce((sum, r) => sum + r.count, 0)
  const savingsRate = income > 0 ? Math.round((net * 100) / income) : null
  const positive = rows.filter((r) => r.net > 0).length
  const periodLabel = formatPeriod(range)
  const per = PER_BUCKET[by]
  const multiYear = spansYears(buckets)
  /** "months", or "month" for a period of one. */
  const unit = `${GRANULARITY_LABELS[by].toLowerCase()}${rows.length === 1 ? '' : 's'}`

  const drillDown = (bucket: DateRange) =>
    void navigate({ to: '/transactions', search: transactionSearchFor(bucket, undefined, undefined, accountIds) })

  const groups: BarChartGroup[] = thinLabels(
    rows.map((row) => ({
      key: row.range.start,
      label: bucketLabel(row.range, by, multiYear),
      title: formatPeriod(row.range),
      values: { income: row.income, expense: row.expense },
      // Captions only fit under a handful of columns.
      caption: rows.length <= 12 ? compactMoney(row.net, 'exceptZero') : undefined,
    })),
  )

  const columns: ReportColumn<FlowRow>[] = [
    { key: 'period', header: 'Period', cell: (r) => formatPeriod(r.range) },
    {
      key: 'income',
      header: 'Income',
      numeric: true,
      cell: (r) => money(r.income),
      total: money(income),
    },
    {
      key: 'expense',
      header: 'Expense',
      numeric: true,
      cell: (r) => money(r.expense),
      total: money(expense),
    },
    {
      key: 'net',
      header: 'Net',
      numeric: true,
      cell: (r) => <span className={toneOf(r.net)}>{signedMoney(r.net)}</span>,
      total: <span className={toneOf(net)}>{signedMoney(net)}</span>,
    },
    {
      key: 'rate',
      header: 'Savings rate',
      numeric: true,
      cell: (r) => percentText(r.savingsRate),
      total: percentText(savingsRate),
    },
    { key: 'count', header: 'Entries', numeric: true, cell: (r) => r.count, total: count },
    {
      key: 'cumulative',
      header: 'Running net',
      numeric: true,
      cell: (r) => <span className={toneOf(r.cumulative)}>{signedMoney(r.cumulative)}</span>,
    },
  ]

  const exportColumns: ExportColumn[] = [
    { header: 'Period', kind: 'text', width: 28 },
    { header: 'Start', kind: 'date', width: 12 },
    { header: 'End', kind: 'date', width: 12 },
    { header: 'Income', kind: 'money' },
    { header: 'Expense', kind: 'money' },
    { header: 'Net', kind: 'signed' },
    { header: 'Savings rate', kind: 'percent', width: 18 },
    { header: 'Entries', kind: 'count', width: 10 },
    { header: 'Running net', kind: 'signed' },
  ]

  const document = (): ReportDocument | null =>
    count
      ? {
          title: 'Cash flow',
          fileName: reportFileName('cash-flow', range),
          currency: base.currency,
          details: [
            { label: 'Period', value: periodLabel },
            { label: 'Group by', value: GRANULARITY_LABELS[by] },
            { label: 'Accounts', value: accountsText(base.lookups, accountIds) },
          ],
          summary: [
            { label: 'Income', value: money(income) },
            { label: 'Expense', value: money(expense) },
            { label: 'Net', value: signedMoney(net) },
            { label: 'Savings rate', value: percentText(savingsRate) },
          ],
          tables: [
            {
              name: 'Cash flow',
              columns: exportColumns,
              rows: rows.map((r) => [
                formatPeriod(r.range),
                r.range.start,
                r.range.end,
                r.income,
                r.expense,
                r.net,
                r.savingsRate,
                r.count,
                r.cumulative,
              ]),
              totals: ['Total', range.start, range.end, income, expense, net, savingsRate, count, null],
            },
          ],
        }
      : null

  return (
    <ReportFrame
      report="cash-flow"
      loading={base.loading || query.isLoading}
      error={base.error ?? query.error}
      onReset={filtered ? reset : null}
      document={document}
      summary={`${periodLabel} · By ${by} · ${accountsText(base.lookups, accountIds)}`}
      emptyMessage={`No income or expenses in ${periodLabel}.`}
      filters={
        <>
          <PeriodField state={period} onChange={set} />
          <SwitchField
            label="Group by"
            options={GRANULARITY_OPTIONS}
            value={by}
            onChange={(next) => set({ by: next })}
          />
          <AccountsField
            accounts={base.accounts}
            value={accountIds}
            onChange={(ids) => set({ accounts: idsParamOf(ids) })}
          />
        </>
      }
    >
      <ReportTiles
        tiles={[
          {
            label: 'Income',
            value: signedMoney(income),
            tone: income > 0 ? 'income' : null,
            note: `Avg ${money(income / rows.length)} ${per}`,
          },
          {
            label: 'Expense',
            value: signedMoney(-expense),
            tone: expense > 0 ? 'expense' : null,
            note: `Avg ${money(expense / rows.length)} ${per}`,
          },
          {
            label: 'Net',
            value: signedMoney(net),
            tone: net > 0 ? 'income' : net < 0 ? 'expense' : null,
            note: `Saved money in ${positive} of ${rows.length} ${unit}`,
          },
          {
            label: 'Savings rate',
            value: percentText(savingsRate),
            note: 'Net as a share of income',
          },
        ]}
      />

      {!count ? (
        <LUICard>
          <EmptyState
            icon="bar_chart"
            title={`No income or expenses in ${periodLabel}`}
            message="Pick a longer period, or other accounts, to see your cash flow."
          />
        </LUICard>
      ) : (
        <>
          <LUICard title="Income vs expense" padding="md">
            <BarChart
              label={`Income and expense by ${by}, ${periodLabel}`}
              groups={groups}
              series={FLOW_SERIES}
              format={money}
              tickFormat={(value) => compactMoney(value)}
              clickable
              tableToggle={false}
              height={220}
              onGroupClick={(group) => {
                const row = rows.find((r) => r.range.start === group.key)
                if (row) drillDown(row.range)
              }}
            />
          </LUICard>

          <LUICard title={`By ${by}`} padding="none">
            <ReportTable
              caption={`Cash flow by ${by}, ${periodLabel}`}
              columns={columns}
              rows={rows}
              rowKey={(r) => r.range.start}
              onRowClick={(r) => drillDown(r.range)}
              canOpen={(r) => r.count > 0}
            />
          </LUICard>
        </>
      )}
    </ReportFrame>
  )
}
