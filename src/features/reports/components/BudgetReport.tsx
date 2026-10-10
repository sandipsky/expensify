import { useNavigate } from '@tanstack/react-router'
import { LUIButton, LUICard, LUIChip, LUIIcon, LUISelect } from '@lumen-ui/react'
import { BarChart, type ChartSeries } from '@/components/chart'
import { EmptyState } from '@/components/empty-state'
import { compareBudgets, neededRange } from '@/features/budgets/budget.domain'
import {
  BUDGET_PERIOD_LABELS,
  BUDGET_STATES,
  PER_PERIOD,
  iconOf,
  percentLabel,
  scopeOf,
} from '@/features/budgets/budget.labels'
import { useBudgets, useSpending } from '@/features/budgets/budget.query'
import type { IBudget } from '@/features/budgets/budget.types'
import { CategoryIcon } from '@/features/categories/components/CategoryIcon'
import { transactionSearchFor } from '@/features/transactions/transaction.search'
import { formatPeriod, spanOf } from '@/utils'
import {
  type BudgetPeriodRow,
  type BudgetStats,
  budgetPeriods,
  budgetStats,
  sumOf,
} from '../report.domain'
import { type ExportColumn, type ExportValue, type ReportDocument, reportFileName } from '../report.export'
import {
  BUDGET_LOOKBACK_OPTIONS,
  bucketLabel,
  percentText,
  periodCount,
  spansYears,
} from '../report.labels'
import {
  BUDGET_LOOKBACKS,
  type BudgetLookback,
  type BudgetReportSearch,
  type Granularity,
} from '../report.types'
import { useReportBase } from '../useReportBase'
import { ToggleField } from './ReportFields'
import { ReportFrame } from './ReportFrame'
import { type ReportColumn, ReportTable } from './ReportTable'
import { ReportTiles } from './ReportTiles'
import './BudgetReport.scss'

/** The "All budgets" item of the budget select. */
const ALL = 0

const LIMIT_SERIES: readonly ChartSeries[] = [
  { key: 'limit', label: 'Limit', color: 'var(--text-quaternary)' },
  { key: 'spent', label: 'Spent', color: 'var(--accent)' },
]

/** One budget in the summary, with its periods and how it did. */
interface BudgetSummary {
  budget: IBudget
  rows: BudgetPeriodRow[]
  stats: BudgetStats
  current: BudgetPeriodRow | undefined
}

/** The chart's axis labels follow the budget's own periods. */
const GRANULARITY_OF: Readonly<Record<IBudget['period'], Granularity>> = {
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
}

const toneOf = (amount: number) => (amount < 0 ? 'is-expense' : undefined)

/** "This period", "Before the budget", or nothing for a past period. */
function periodNote(row: BudgetPeriodRow): string {
  if (row.current) return 'This period'
  if (row.beforeBudget) return 'Before the budget'
  return ''
}

/** The columns every period export shares, after any leading ones. */
const PERIOD_COLUMNS: ExportColumn[] = [
  { header: 'Period', kind: 'text', width: 28 },
  { header: 'Start', kind: 'date', width: 12 },
  { header: 'End', kind: 'date', width: 12 },
  { header: 'Limit', kind: 'money' },
  { header: 'Carried over', kind: 'signed' },
  { header: 'Spent', kind: 'money' },
  { header: 'Remaining', kind: 'signed' },
  { header: 'Used', kind: 'percent', width: 10 },
  { header: 'State', kind: 'text', width: 12 },
  { header: 'Note', kind: 'text', width: 18 },
]

function periodValues(row: BudgetPeriodRow): ExportValue[] {
  return [
    formatPeriod(row.range),
    row.range.start,
    row.range.end,
    row.limit,
    row.carry,
    row.spent,
    row.remaining,
    row.percent,
    BUDGET_STATES[row.state].label,
    periodNote(row),
  ]
}

/**
 * `/reports/budgets`: how the budgets did period by period. Without a pick
 * it lists every budget with its hit rate (finished periods under the limit),
 * average spending and overspending; picking one shows each of its periods,
 * spent against limit. A period opens the expenses it counted.
 */
export const BudgetReport = ({ search }: { search: BudgetReportSearch }) => {
  const navigate = useNavigate()
  const base = useReportBase()
  const { money, signedMoney, compactMoney, today } = base
  const budgetsQuery = useBudgets()

  const lookback: BudgetLookback = search.periods ?? 12
  const early = !!search.early
  const showPaused = !!search.paused

  const all = [...(budgetsQuery.data ?? [])].sort(compareBudgets)
  const selected = search.budget ? all.find((b) => b.id === search.budget) : undefined
  const listed = selected ? [selected] : all.filter((b) => b.active || showPaused)
  const spending = useSpending(spanOf(listed.map((b) => neededRange(b, today, lookback))))

  const set = (changes: Partial<BudgetReportSearch>) =>
    void navigate({ to: '/reports/budgets', search: { ...search, ...changes }, replace: true })
  const filtered = Object.values(search).some((value) => value !== undefined)
  const reset = () => void navigate({ to: '/reports/budgets', search: {}, replace: true })

  const categoriesById = base.lookups.categoriesById
  const txs = spending.data ?? []
  const summaries: BudgetSummary[] = listed.map((budget) => {
    const rows = budgetPeriods(budget, txs, today, lookback, early)
    return { budget, rows, stats: budgetStats(rows), current: rows.find((r) => r.current) }
  })

  const tracked = summaries.reduce((sum, s) => sum + s.stats.tracked, 0)
  const under = summaries.reduce((sum, s) => sum + s.stats.under, 0)
  const over = summaries.reduce((sum, s) => sum + s.stats.over, 0)
  const overspent = sumOf(summaries.map((s) => s.stats.overspent))
  const hitRate = tracked ? Math.round((under * 100) / tracked) : null

  const openPeriod = (budget: IBudget, row: BudgetPeriodRow) =>
    void navigate({
      to: '/transactions',
      search: transactionSearchFor(row.range, 'expense', budget.categoryIds),
    })

  const budgetItems = [
    { value: ALL, label: 'All budgets' },
    ...all.map((b) => ({ value: b.id, label: b.active ? b.name : `${b.name} (paused)` })),
  ]

  const filters = (
    <>
      <div className="report-field report-field--wide">
        <LUISelect
          label="Budget"
          items={budgetItems}
          bindValue="value"
          bindLabel="label"
          searchable={budgetItems.length > 8}
          value={selected?.id ?? ALL}
          onChange={(value) => set({ budget: (value as number) || undefined })}
        />
      </div>
      <div className="report-field report-field--period">
        <LUISelect
          label="Look back"
          items={BUDGET_LOOKBACK_OPTIONS}
          bindValue="value"
          bindLabel="label"
          value={lookback}
          onChange={(value) => {
            const next = value as BudgetLookback
            if (BUDGET_LOOKBACKS.includes(next)) set({ periods: next === 12 ? undefined : next })
          }}
        />
      </div>
      {!selected && (
        <ToggleField
          label="Paused budgets"
          checked={showPaused}
          onChange={(checked) => set({ paused: checked || undefined })}
        />
      )}
      <ToggleField
        label="Periods before a budget started"
        checked={early}
        onChange={(checked) => set({ early: checked || undefined })}
      />
    </>
  )

  const loading = base.loading || budgetsQuery.isLoading || (listed.length > 0 && spending.isLoading)
  const error = base.error ?? budgetsQuery.error ?? spending.error

  // One budget's periods.

  if (selected) {
    const summary = summaries[0]
    const { stats } = summary
    const name = selected.name
    const icon = iconOf(selected, categoriesById)
    const oldestFirst = [...summary.rows].reverse()
    const multiYear = spansYears(oldestFirst.map((r) => r.range))

    const columns: ReportColumn<BudgetPeriodRow>[] = [
      {
        key: 'period',
        header: 'Period',
        cell: (r) => (
          <span className="report-name__text">
            <span>{formatPeriod(r.range)}</span>
            {periodNote(r) && <span className="report-name__caption">{periodNote(r)}</span>}
          </span>
        ),
      },
      {
        key: 'limit',
        header: 'Limit',
        numeric: true,
        cell: (r) => (
          <span className="report-figure">
            <span>{money(r.limit)}</span>
            {r.carry !== 0 && (
              <span className="report-figure__sub">{signedMoney(r.carry)} carried</span>
            )}
          </span>
        ),
      },
      { key: 'spent', header: 'Spent', numeric: true, cell: (r) => money(r.spent) },
      {
        key: 'remaining',
        header: 'Remaining',
        numeric: true,
        cell: (r) => <span className={toneOf(r.remaining)}>{signedMoney(r.remaining)}</span>,
      },
      { key: 'used', header: 'Used', numeric: true, cell: (r) => percentLabel(r.percent) },
      {
        key: 'state',
        header: 'State',
        cell: (r) => {
          const state = BUDGET_STATES[r.state]
          return (
            <LUIChip size="sm" variant={r.beforeBudget ? 'default' : state.chip}>
              <LUIIcon name={state.icon} size={12} color="inherit" />
              {state.label}
            </LUIChip>
          )
        },
      },
    ]

    const document = (): ReportDocument | null =>
      summary.rows.length
        ? {
            title: `Budget history: ${name}`,
            fileName: reportFileName(`budget-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`),
            currency: base.currency,
            details: [
              { label: 'Budget', value: name },
              { label: 'Counts', value: scopeOf(selected, categoriesById) },
              {
                label: 'Limit',
                value: `${money(selected.amount)} ${PER_PERIOD[selected.period]}${selected.rollover ? ', rolls over' : ''}`,
              },
              { label: 'Look back', value: `Last ${periodCount(lookback)}` },
            ],
            summary: [
              { label: 'Hit rate', value: percentText(stats.hitRate) },
              { label: 'Under limit', value: `${stats.under} of ${stats.tracked}` },
              { label: 'Overspent', value: money(stats.overspent) },
            ],
            tables: [{ name: 'Periods', columns: PERIOD_COLUMNS, rows: summary.rows.map(periodValues) }],
          }
        : null

    return (
      <ReportFrame
        report="budgets"
        loading={loading}
        error={error}
        onReset={filtered ? reset : null}
        document={document}
        summary={`${name} · Last ${periodCount(lookback)}`}
        emptyMessage={`${name} has no periods to show yet.`}
        filters={filters}
      >
        <div className="budget-report__head">
          <CategoryIcon category={icon} size={40} />
          <div className="report-name__text">
            <strong>{name}</strong>
            <span className="report-name__caption">
              {money(selected.amount)} {PER_PERIOD[selected.period]} · {scopeOf(selected, categoriesById)}
              {selected.rollover ? ' · Rolls over' : ''}
              {selected.active ? '' : ' · Paused'}
            </span>
          </div>
          <LUIButton
            variant="ghost"
            size="md"
            onClick={() =>
              void navigate({ to: '/budgets/$budgetId', params: { budgetId: String(selected.id) } })
            }
          >
            Open budget
          </LUIButton>
        </div>

        <ReportTiles
          tiles={[
            {
              label: 'Hit rate',
              value: percentText(stats.hitRate),
              note: `Under the limit in ${stats.under} of ${periodCount(stats.tracked)}`,
            },
            {
              label: 'Average spent',
              value: stats.averageSpent === null ? '—' : money(stats.averageSpent),
              note: `Used ${percentText(stats.usedPercent)} of the limits overall`,
            },
            {
              label: 'Overspent',
              value: money(stats.overspent),
              tone: stats.overspent > 0 ? 'expense' : null,
              note: `Over the limit in ${periodCount(stats.over)}`,
            },
            {
              label: 'This period',
              value: summary.current ? money(summary.current.spent) : '—',
              note: summary.current
                ? `of ${money(summary.current.limit)} · ${BUDGET_STATES[summary.current.state].label}`
                : undefined,
            },
          ]}
        />

        <LUICard title="Spent against limit" padding="md">
          <BarChart
            label={`${name}: spent against limit by period`}
            groups={oldestFirst.map((r) => ({
              key: r.range.start,
              label: bucketLabel(r.range, GRANULARITY_OF[selected.period], multiYear),
              title: formatPeriod(r.range),
              values: { limit: r.limit, spent: r.spent },
              caption: oldestFirst.length <= 12 ? percentLabel(r.percent) : undefined,
            }))}
            series={LIMIT_SERIES}
            format={money}
            tickFormat={(value) => compactMoney(value)}
            tableToggle={false}
            selected={summary.current?.range.start ?? null}
            clickable
            height={200}
            onGroupClick={(group) => {
              const row = summary.rows.find((r) => r.range.start === group.key)
              if (row) openPeriod(selected, row)
            }}
          />
        </LUICard>

        <LUICard title="Periods" padding="none">
          <ReportTable
            caption={`${name}: results by period`}
            columns={columns}
            rows={summary.rows}
            rowKey={(r) => r.offset}
            onRowClick={(r) => openPeriod(selected, r)}
            isCurrent={(r) => r.current}
            isMuted={(r) => r.beforeBudget}
          />
        </LUICard>
      </ReportFrame>
    )
  }

  // Every budget.

  const columns: ReportColumn<BudgetSummary>[] = [
    {
      key: 'budget',
      header: 'Budget',
      cell: (s) => (
        <span className="report-name">
          <CategoryIcon category={iconOf(s.budget, categoriesById)} size={28} />
          <span className="report-name__text">
            <span className="text-ellipsis">{s.budget.name}</span>
            <span className="report-name__caption text-ellipsis">
              {s.budget.active ? '' : 'Paused · '}
              {scopeOf(s.budget, categoriesById)}
            </span>
          </span>
        </span>
      ),
      total: 'All budgets',
    },
    {
      key: 'limit',
      header: 'Limit',
      numeric: true,
      cell: (s) => (
        <span className="report-figure">
          <span>{money(s.budget.amount)}</span>
          <span className="report-figure__sub">{BUDGET_PERIOD_LABELS[s.budget.period]}</span>
        </span>
      ),
    },
    {
      key: 'current',
      header: 'This period',
      numeric: true,
      cell: (s) =>
        s.current ? (
          <span className="report-figure">
            <span>{money(s.current.spent)}</span>
            <span className="report-figure__sub">{percentLabel(s.current.percent)} used</span>
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'under',
      header: 'Under limit',
      numeric: true,
      cell: (s) => `${s.stats.under} of ${s.stats.tracked}`,
      total: `${under} of ${tracked}`,
    },
    {
      key: 'rate',
      header: 'Hit rate',
      numeric: true,
      cell: (s) => percentText(s.stats.hitRate),
      total: percentText(hitRate),
    },
    {
      key: 'average',
      header: 'Avg spent',
      numeric: true,
      cell: (s) => (s.stats.averageSpent === null ? '—' : money(s.stats.averageSpent)),
    },
    {
      key: 'used',
      header: 'Used overall',
      numeric: true,
      cell: (s) => percentText(s.stats.usedPercent),
    },
    {
      key: 'overspent',
      header: 'Overspent',
      numeric: true,
      cell: (s) => (
        <span className={s.stats.overspent > 0 ? 'is-expense' : undefined}>{money(s.stats.overspent)}</span>
      ),
      total: <span className={overspent > 0 ? 'is-expense' : undefined}>{money(overspent)}</span>,
    },
  ]

  const document = (): ReportDocument | null =>
    summaries.length
      ? {
          title: 'Budget history',
          fileName: reportFileName('budget-history'),
          currency: base.currency,
          details: [
            { label: 'Budgets', value: showPaused ? 'Active and paused' : 'Active' },
            { label: 'Look back', value: `Last ${periodCount(lookback)}` },
          ],
          summary: [
            { label: 'Hit rate', value: percentText(hitRate) },
            { label: 'Under limit', value: `${under} of ${tracked}` },
            { label: 'Overspent', value: money(overspent) },
          ],
          tables: [
            {
              name: 'Budgets',
              columns: [
                { header: 'Budget', kind: 'text', width: 24 },
                { header: 'Counts', kind: 'text', width: 28 },
                { header: 'Period', kind: 'text', width: 10 },
                { header: 'Limit', kind: 'money' },
                { header: 'Status', kind: 'text', width: 10 },
                { header: 'This period spent', kind: 'money', width: 18 },
                { header: 'This period used', kind: 'percent', width: 18 },
                { header: 'Periods tracked', kind: 'count', width: 16 },
                { header: 'Under limit', kind: 'count', width: 12 },
                { header: 'Over limit', kind: 'count', width: 12 },
                { header: 'Hit rate', kind: 'percent', width: 12 },
                { header: 'Avg spent', kind: 'money' },
                { header: 'Used overall', kind: 'percent', width: 14 },
                { header: 'Overspent', kind: 'money' },
              ],
              rows: summaries.map((s) => [
                s.budget.name,
                scopeOf(s.budget, categoriesById),
                BUDGET_PERIOD_LABELS[s.budget.period],
                s.budget.amount,
                s.budget.active ? 'Active' : 'Paused',
                s.current?.spent ?? null,
                s.current?.percent ?? null,
                s.stats.tracked,
                s.stats.under,
                s.stats.over,
                s.stats.hitRate,
                s.stats.averageSpent,
                s.stats.usedPercent,
                s.stats.overspent,
              ]),
              totals: ['All budgets', null, null, null, null, null, null, tracked, under, over, hitRate, null, null, overspent],
            },
            {
              name: 'Periods',
              columns: [{ header: 'Budget', kind: 'text', width: 24 }, ...PERIOD_COLUMNS],
              rows: summaries.flatMap((s) => s.rows.map((r) => [s.budget.name, ...periodValues(r)])),
            },
          ],
        }
      : null

  return (
    <ReportFrame
      report="budgets"
      loading={loading}
      error={error}
      onReset={filtered ? reset : null}
      document={document}
      summary={`${showPaused ? 'Active and paused budgets' : 'Active budgets'} · Last ${periodCount(lookback)}`}
      emptyMessage="There are no budgets to report on."
      filters={filters}
    >
      <ReportTiles
        tiles={[
          { label: 'Budgets', value: String(summaries.length), note: showPaused ? 'Active and paused' : 'Active' },
          {
            label: 'Hit rate',
            value: percentText(hitRate),
            note: `Under the limit in ${under} of ${periodCount(tracked)}`,
          },
          { label: 'Periods over', value: String(over), note: 'Finished periods over the limit' },
          {
            label: 'Overspent',
            value: money(overspent),
            tone: overspent > 0 ? 'expense' : null,
            note: 'Past the limits, in all',
          },
        ]}
      />

      {!summaries.length ? (
        <LUICard>
          <EmptyState
            icon="donut_large"
            title={all.length ? 'All your budgets are paused' : 'No budgets yet'}
            message={
              all.length
                ? 'Turn on "Paused budgets" above to see how they did.'
                : 'Add a budget to see how you do against it, period by period.'
            }
          >
            {!all.length && (
              <LUIButton size="lg" onClick={() => void navigate({ to: '/budgets' })}>
                Go to budgets
              </LUIButton>
            )}
          </EmptyState>
        </LUICard>
      ) : (
        <LUICard title="Budgets" padding="none">
          <ReportTable
            caption={`Budgets over the last ${periodCount(lookback)}`}
            columns={columns}
            rows={summaries}
            rowKey={(s) => s.budget.id}
            onRowClick={(s) => set({ budget: s.budget.id })}
            isMuted={(s) => !s.budget.active}
          />
        </LUICard>
      )}

      <p className="report-page__note">
        The hit rate counts finished periods since each budget was created; the current period
        joins once it ends.
      </p>
    </ReportFrame>
  )
}
