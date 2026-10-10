import type { CSSProperties } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { LUICard } from '@lumen-ui/react'
import { BarChart, type ChartSeries } from '@/components/chart'
import { EmptyState } from '@/components/empty-state'
import type { CategoryType } from '@/features/categories/category.types'
import { TransactionIcon } from '@/features/transactions/components/TransactionIcon'
import { useTransactions } from '@/features/transactions/transaction.query'
import { idsOf, idsParamOf, transactionSearchFor } from '@/features/transactions/transaction.search'
import { type DateRange, dataColor, formatPeriod } from '@/utils'
import {
  MAX_TREND_MONTHS,
  type MatrixRow,
  bucketsOf,
  categoryMatrix,
  onAccounts,
  periodState,
  trendRange,
} from '../report.domain'
import { type ExportColumn, type ReportDocument, reportFileName } from '../report.export'
import {
  CATEGORY_TYPE_LABELS,
  CATEGORY_TYPE_OPTIONS,
  accountsText,
  bucketLabel,
  categoriesText,
  categoryView,
  spansYears,
  thinLabels,
} from '../report.labels'
import type { CategoryTrendSearch } from '../report.types'
import { useReportBase } from '../useReportBase'
import { AccountsField, CategoriesField, PeriodField, SwitchField } from './ReportFields'
import { ReportFrame } from './ReportFrame'
import { type ReportColumn, ReportTable } from './ReportTable'
import { ReportTiles } from './ReportTiles'
import './CategoryTrendReport.scss'

/**
 * `/reports/category-trends`: one row per category and one column per month,
 * with each row's total and monthly average and each month's total, so
 * spending that creeps up stands out. Cells are shaded against their row's
 * busiest month. A cell opens that month's transactions in the category; a
 * row's name opens the whole range.
 */
export const CategoryTrendReport = ({ search }: { search: CategoryTrendSearch }) => {
  const navigate = useNavigate()
  const base = useReportBase()
  const { money, compactMoney } = base

  const period = periodState(search, 'last_6_months', base.today)
  const { range, clipped } = trendRange(period.range)
  const type: CategoryType = search.type ?? 'expense'
  const accountIds = idsOf(search.accounts)
  const categoryIds = idsOf(search.categories)

  const query = useTransactions({ from: range.start, to: range.end })

  const set = (changes: Partial<CategoryTrendSearch>) =>
    void navigate({ to: '/reports/category-trends', search: { ...search, ...changes }, replace: true })
  const filtered = Object.values(search).some((value) => value !== undefined)
  const reset = () => void navigate({ to: '/reports/category-trends', search: {}, replace: true })

  /** Switching type drops categories of the other type, which could never match. */
  const setType = (next: CategoryType) => {
    const keep = categoryIds.filter((id) => base.lookups.categoriesById.get(id)?.type === next)
    set({ type: next, categories: idsParamOf(keep) })
  }

  const chosen = new Set(categoryIds)
  const txs = onAccounts(query.data ?? [], accountIds).filter(
    (tx) => !chosen.size || (tx.categoryId !== null && chosen.has(tx.categoryId)),
  )
  const months = bucketsOf(range, 'month')
  const matrix = categoryMatrix(txs, type, months)
  const multiYear = spansYears(months)
  const periodLabel = formatPeriod(range)
  const typeLabel = CATEGORY_TYPE_LABELS[type]
  const noun = type === 'expense' ? 'spending' : 'income'
  const average = months.length ? matrix.total / months.length : 0
  const busiest = matrix.columnTotals.reduce(
    (best, amount, i) => (amount > matrix.columnTotals[best] ? i : best),
    0,
  )

  const view = (row: MatrixRow) => categoryView(base.lookups, row.categoryId)

  const open = (row: MatrixRow, within: DateRange) => {
    if (row.categoryId === null) return
    void navigate({
      to: '/transactions',
      search: transactionSearchFor(within, type, [row.categoryId], accountIds),
    })
  }

  const series: ChartSeries[] = [
    { key: 'total', label: typeLabel, color: type === 'expense' ? 'var(--error)' : 'var(--success)' },
  ]

  const columns: ReportColumn<MatrixRow>[] = [
    {
      key: 'category',
      header: 'Category',
      cell: (r) => {
        const v = view(r)
        return (
          <span className="report-name">
            <TransactionIcon row={{ icon: v.icon, color: v.color }} size={24} />
            <span className="report-name__text">
              <span className="text-ellipsis">{v.name}</span>
            </span>
          </span>
        )
      },
      total: 'Total',
    },
    ...months.map(
      (month, i): ReportColumn<MatrixRow> => ({
        key: month.start,
        header: <span title={formatPeriod(month)}>{bucketLabel(month, 'month', multiYear)}</span>,
        numeric: true,
        cell: (r) => {
          const amount = r.cells[i]
          if (!amount) return <span className="trend-cell is-empty">—</span>
          const top = Math.max(...r.cells)
          const v = view(r)
          const style = {
            '--trend-color': v.color ? dataColor(v.color) : 'var(--accent)',
            '--trend-heat': `${Math.round((amount / top) * 28)}%`,
          } as CSSProperties
          return r.categoryId === null ? (
            <span className="trend-cell" style={style}>
              {money(amount)}
            </span>
          ) : (
            <button
              type="button"
              className="trend-cell"
              style={style}
              aria-label={`${v.name}, ${formatPeriod(month)}: ${money(amount)}`}
              onClick={(event) => {
                event.stopPropagation()
                open(r, month)
              }}
            >
              {money(amount)}
            </button>
          )
        },
        total: money(matrix.columnTotals[i]),
      }),
    ),
    { key: 'total', header: 'Total', numeric: true, cell: (r) => <strong>{money(r.total)}</strong>, total: money(matrix.total) },
    { key: 'average', header: 'Monthly avg', numeric: true, cell: (r) => money(r.average), total: money(average) },
  ]

  const exportColumns: ExportColumn[] = [
    { header: 'Category', kind: 'text', width: 26 },
    ...months.map((month): ExportColumn => ({
      header: bucketLabel(month, 'month', multiYear),
      kind: 'money',
      width: 14,
    })),
    { header: 'Total', kind: 'money' },
    { header: 'Monthly avg', kind: 'money' },
  ]

  const document = (): ReportDocument | null =>
    matrix.rows.length
      ? {
          title: 'Category trends',
          fileName: reportFileName(`category-trends-${type}`, range),
          currency: base.currency,
          details: [
            { label: 'Period', value: periodLabel },
            { label: 'Type', value: typeLabel },
            { label: 'Accounts', value: accountsText(base.lookups, accountIds) },
            { label: 'Categories', value: categoriesText(base.lookups, categoryIds) },
          ],
          summary: [
            { label: 'Total', value: money(matrix.total) },
            { label: 'Monthly average', value: money(average) },
          ],
          tables: [
            {
              name: 'Category trends',
              columns: exportColumns,
              rows: matrix.rows.map((r) => [view(r).name, ...r.cells, r.total, r.average]),
              totals: ['Total', ...matrix.columnTotals, matrix.total, average],
            },
          ],
          notes: clipped ? [`Only the last ${MAX_TREND_MONTHS} months of the chosen range are shown.`] : [],
        }
      : null

  return (
    <ReportFrame
      report="category-trends"
      loading={base.loading || query.isLoading}
      error={base.error ?? query.error}
      onReset={filtered ? reset : null}
      document={document}
      summary={`${periodLabel} · ${accountsText(base.lookups, accountIds)} · ${categoriesText(base.lookups, categoryIds)}`}
      emptyMessage={`No ${noun} in ${periodLabel}.`}
      filters={
        <>
          <PeriodField state={period} onChange={set} />
          <SwitchField label="Type" options={CATEGORY_TYPE_OPTIONS} value={type} onChange={setType} />
          <AccountsField
            accounts={base.accounts}
            value={accountIds}
            onChange={(ids) => set({ accounts: idsParamOf(ids) })}
          />
          <CategoriesField
            categories={base.categories}
            type={type}
            value={categoryIds}
            onChange={(ids) => set({ categories: idsParamOf(ids) })}
          />
        </>
      }
    >
      {clipped && (
        <p className="alert info">
          The table spans at most {MAX_TREND_MONTHS} months, so it shows the last {MAX_TREND_MONTHS}{' '}
          of the range you picked.
        </p>
      )}

      <ReportTiles
        tiles={[
          {
            label: `Total ${noun}`,
            value: money(matrix.total),
            tone: matrix.total > 0 ? (type === 'income' ? 'income' : 'expense') : null,
            note: `Over ${months.length} ${months.length === 1 ? 'month' : 'months'}`,
          },
          { label: 'Monthly average', value: money(average), note: 'Total ÷ months' },
          {
            label: 'Highest month',
            value: money(matrix.columnTotals[busiest] ?? 0),
            note: months[busiest] ? formatPeriod(months[busiest]) : undefined,
          },
          {
            label: 'Categories',
            value: String(matrix.rows.length),
            note: matrix.rows[0] ? `Largest: ${view(matrix.rows[0]).name}` : undefined,
          },
        ]}
      />

      {!matrix.rows.length ? (
        <LUICard>
          <EmptyState
            icon="calendar_month"
            title={`No ${noun} in ${periodLabel}`}
            message="Pick a longer period, or other accounts or categories."
          />
        </LUICard>
      ) : (
        <>
          <LUICard title={`${typeLabel} by month`} padding="md">
            <BarChart
              label={`${typeLabel} by month, ${periodLabel}`}
              groups={thinLabels(
                months.map((month, i) => ({
                  key: month.start,
                  label: bucketLabel(month, 'month', multiYear),
                  title: formatPeriod(month),
                  values: { total: matrix.columnTotals[i] },
                })),
              )}
              series={series}
              format={money}
              tickFormat={(value) => compactMoney(value)}
              tableToggle={false}
              height={180}
            />
          </LUICard>

          <LUICard title="Categories by month" padding="none">
            <ReportTable
              caption={`${typeLabel} by category and month, ${periodLabel}`}
              columns={columns}
              rows={matrix.rows}
              rowKey={(r) => String(r.categoryId)}
              onRowClick={(r) => open(r, range)}
              canOpen={(r) => r.categoryId !== null}
            />
          </LUICard>
        </>
      )}
    </ReportFrame>
  )
}
