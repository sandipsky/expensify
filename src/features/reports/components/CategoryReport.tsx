import { useNavigate } from '@tanstack/react-router'
import { LUICard } from '@lumen-ui/react'
import { DonutChart, type DonutSegment } from '@/components/chart'
import { EmptyState } from '@/components/empty-state'
import { ReportRow } from '@/components/report-row'
import { TransactionIcon } from '@/features/transactions/components/TransactionIcon'
import { changeOf, topAndOther } from '@/features/dashboard/dashboard.domain'
import { changeText } from '@/features/dashboard/dashboard.labels'
import { entries } from '@/features/transactions/transaction.labels'
import { useTransactions } from '@/features/transactions/transaction.query'
import { idsOf, idsParamOf, transactionSearchFor } from '@/features/transactions/transaction.search'
import { dataColor, daysIn, formatPeriod } from '@/utils'
import type { CategoryType } from '@/features/categories/category.types'
import {
  type CategoryRow,
  categoryComparison,
  onAccounts,
  periodState,
  previousRange,
  sumOf,
} from '../report.domain'
import { type ReportDocument, reportFileName } from '../report.export'
import {
  CATEGORY_TYPE_LABELS,
  CATEGORY_TYPE_OPTIONS,
  accountsText,
  categoryView,
  percentText,
} from '../report.labels'
import type { CategorySearch } from '../report.types'
import { useReportBase } from '../useReportBase'
import { AccountsField, PeriodField, SwitchField } from './ReportFields'
import { ReportFrame } from './ReportFrame'
import { type ReportColumn, ReportTable } from './ReportTable'
import { ReportTiles } from './ReportTiles'
import './CategoryReport.scss'

/** Slices before the rest folds into "Other". */
const TOP_SLICES = 6
/** Rows in the biggest changes card. */
const TOP_MOVERS = 5
/** Neutral for "Other" and entries without a category, so no category's color is borrowed. */
const NEUTRAL = 'var(--text-quaternary)'
const OTHER = 'other'

/**
 * Whether a change is good news (spending less, or earning more) or bad,
 * null for none. Colors always sit beside a sign, so they're never the only cue.
 */
function changeTone(type: CategoryType, amount: number): 'income' | 'expense' | null {
  if (!amount) return null
  return (amount > 0) === (type === 'income') ? 'income' : 'expense'
}

/** The class a change's amount reads in. */
const toneClass = (type: CategoryType, amount: number) => {
  const tone = changeTone(type, amount)
  return tone ? `is-${tone}` : undefined
}

/**
 * `/reports/categories`: every expense (or income) category in the period
 * with its total, share, entries and average entry, against the period
 * before. A donut shows the split, a card the biggest changes, and the table
 * every category; a category opens its transactions.
 */
export const CategoryReport = ({ search }: { search: CategorySearch }) => {
  const navigate = useNavigate()
  const base = useReportBase()
  const { money, signedMoney } = base

  const period = periodState(search, 'this_month', base.today)
  const { range } = period
  const before = previousRange(range)
  const type: CategoryType = search.type ?? 'expense'
  const accountIds = idsOf(search.accounts)

  const current = useTransactions({ from: range.start, to: range.end })
  const previous = useTransactions({ from: before.start, to: before.end })

  const set = (changes: Partial<CategorySearch>) =>
    void navigate({ to: '/reports/categories', search: { ...search, ...changes }, replace: true })
  const filtered = Object.values(search).some((value) => value !== undefined)
  const reset = () => void navigate({ to: '/reports/categories', search: {}, replace: true })

  const rows = categoryComparison(
    onAccounts(current.data ?? [], accountIds),
    onAccounts(previous.data ?? [], accountIds),
    type,
  )
  const active = rows.filter((r) => r.amount > 0)
  const total = sumOf(rows.map((r) => r.amount))
  const totalBefore = sumOf(rows.map((r) => r.previous))
  const count = rows.reduce((sum, r) => sum + r.count, 0)
  const countBefore = rows.reduce((sum, r) => sum + r.previousCount, 0)
  const totalChange = changeOf(totalBefore, total)
  const periodLabel = formatPeriod(range)
  const beforeLabel = formatPeriod(before)
  const typeLabel = CATEGORY_TYPE_LABELS[type]
  const noun = type === 'expense' ? 'spending' : 'income'

  const view = (row: Pick<CategoryRow, 'categoryId'>) => categoryView(base.lookups, row.categoryId)

  const open = (row: CategoryRow) => {
    if (row.categoryId === null) return
    void navigate({
      to: '/transactions',
      search: transactionSearchFor(range, type, [row.categoryId], accountIds),
    })
  }

  // The donut: the largest categories, then the rest as "Other" when that holds two or more.
  const keep = active.length <= TOP_SLICES + 1 ? active.length : TOP_SLICES
  const { top, other } = topAndOther(active, keep)
  const segments: DonutSegment[] = top.map((row) => {
    const v = view(row)
    return {
      key: String(row.categoryId ?? 'none'),
      label: v.name,
      value: row.amount,
      color: v.color ? dataColor(v.color) : NEUTRAL,
    }
  })
  if (other) segments.push({ key: OTHER, label: 'Other', value: other.amount, color: NEUTRAL })

  /** The categories that moved most from the period before, either way. */
  const movers = [...rows]
    .filter((r) => r.change.amount !== 0)
    .sort((a, b) => Math.abs(b.change.amount) - Math.abs(a.change.amount))
    .slice(0, TOP_MOVERS)
  const moverMax = Math.max(0, ...movers.flatMap((r) => [r.amount, r.previous]))

  const largest = active[0]

  const columns: ReportColumn<CategoryRow>[] = [
    {
      key: 'category',
      header: 'Category',
      cell: (r) => {
        const v = view(r)
        return (
          <span className="report-name">
            <TransactionIcon row={{ icon: v.icon, color: v.color }} size={28} />
            <span className="report-name__text">
              <span className="text-ellipsis">{v.name}</span>
              {v.archived && <span className="report-name__caption">Archived</span>}
            </span>
          </span>
        )
      },
      total: 'Total',
    },
    { key: 'amount', header: typeLabel, numeric: true, cell: (r) => money(r.amount), total: money(total) },
    {
      key: 'share',
      header: 'Share',
      numeric: true,
      cell: (r) => percentText(r.share),
      total: total > 0 ? '100%' : '—',
    },
    { key: 'count', header: 'Entries', numeric: true, cell: (r) => r.count, total: count },
    {
      key: 'average',
      header: 'Avg entry',
      numeric: true,
      cell: (r) => (r.count ? money(r.average) : '—'),
      total: count ? money(total / count) : '—',
    },
    {
      key: 'previous',
      header: 'Previous',
      numeric: true,
      cell: (r) => money(r.previous),
      total: money(totalBefore),
    },
    {
      key: 'change',
      header: 'Change',
      numeric: true,
      cell: (r) => (
        <span className="report-figure">
          <span className={toneClass(type, r.change.amount)}>{signedMoney(r.change.amount)}</span>
          <span className="report-figure__sub">{changeText(r.change.percent)}</span>
        </span>
      ),
      total: (
        <span className="report-figure">
          <span className={toneClass(type, totalChange.amount)}>{signedMoney(totalChange.amount)}</span>
          <span className="report-figure__sub">{changeText(totalChange.percent)}</span>
        </span>
      ),
    },
  ]

  const document = (): ReportDocument | null =>
    rows.length
      ? {
          title: type === 'expense' ? 'Spending by category' : 'Income by category',
          fileName: reportFileName(`${type}-by-category`, range),
          currency: base.currency,
          details: [
            { label: 'Period', value: periodLabel },
            { label: 'Compared with', value: beforeLabel },
            { label: 'Type', value: typeLabel },
            { label: 'Accounts', value: accountsText(base.lookups, accountIds) },
          ],
          summary: [
            { label: 'Total', value: money(total) },
            { label: 'Previous', value: money(totalBefore) },
            { label: 'Change', value: signedMoney(totalChange.amount) },
          ],
          tables: [
            {
              name: 'Categories',
              columns: [
                { header: 'Category', kind: 'text', width: 28 },
                { header: typeLabel, kind: 'money' },
                { header: 'Share', kind: 'percent', width: 12 },
                { header: 'Entries', kind: 'count', width: 10 },
                { header: 'Avg entry', kind: 'money' },
                { header: 'Previous', kind: 'money' },
                { header: 'Change', kind: 'signed' },
                { header: 'Change %', kind: 'change', width: 12 },
              ],
              rows: rows.map((r) => [
                view(r).name,
                r.amount,
                r.share,
                r.count,
                r.count ? r.average : null,
                r.previous,
                r.change.amount,
                r.change.percent,
              ]),
              totals: [
                'Total',
                total,
                total > 0 ? 100 : null,
                count,
                count ? total / count : null,
                totalBefore,
                totalChange.amount,
                totalChange.percent,
              ],
            },
          ],
        }
      : null

  return (
    <ReportFrame
      report="categories"
      loading={base.loading || current.isLoading || previous.isLoading}
      error={base.error ?? current.error ?? previous.error}
      onReset={filtered ? reset : null}
      document={document}
      summary={`${periodLabel}, against ${beforeLabel} · ${accountsText(base.lookups, accountIds)}`}
      emptyMessage={`No ${noun} in ${periodLabel} or ${beforeLabel}.`}
      filters={
        <>
          <PeriodField state={period} onChange={set} />
          <SwitchField
            label="Type"
            options={CATEGORY_TYPE_OPTIONS}
            value={type}
            onChange={(next) => set({ type: next })}
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
            label: `Total ${noun}`,
            value: money(total),
            tone: total > 0 ? (type === 'income' ? 'income' : 'expense') : null,
            note: entries(count),
          },
          {
            label: 'Previous period',
            value: money(totalBefore),
            note: `${beforeLabel} · ${entries(countBefore)}`,
          },
          {
            label: 'Change',
            value: signedMoney(totalChange.amount),
            tone: changeTone(type, totalChange.amount),
            note: totalBefore ? changeText(totalChange.percent) : 'Nothing before to compare',
          },
          {
            label: 'Per day',
            value: money(total / daysIn(range)),
            note: largest ? `Largest: ${view(largest).name}` : `Over ${daysIn(range)} days`,
          },
        ]}
      />

      {!rows.length ? (
        <LUICard>
          <EmptyState
            icon="pie_chart"
            title={`No ${noun} in ${periodLabel}`}
            message="Pick another period, type or accounts to see your categories."
          />
        </LUICard>
      ) : (
        <>
          <div className="category-report__grid">
            <LUICard title={`Split of ${noun}`} padding="md" className="category-report__card">
              {active.length ? (
                <DonutChart
                  label={`${typeLabel} by category, ${periodLabel}`}
                  segments={segments}
                  format={money}
                  size={200}
                  clickable
                  onSegmentClick={(segment) => {
                    const row = active.find((r) => String(r.categoryId ?? 'none') === segment.key)
                    if (row) open(row)
                  }}
                >
                  <span className="category-report__total">{money(total)}</span>
                  <span className="category-report__caption">{entries(count)}</span>
                </DonutChart>
              ) : (
                <EmptyState icon="pie_chart" title={`No ${noun} in ${periodLabel}`} />
              )}
            </LUICard>

            <LUICard
              title={`Biggest changes from ${beforeLabel}`}
              padding="none"
              className="category-report__card"
            >
              {movers.length ? (
                <ul className="category-report__movers" aria-label="Biggest changes">
                  {movers.map((row) => {
                    const v = view(row)
                    const color = v.color ? dataColor(v.color) : NEUTRAL
                    return (
                      <li key={String(row.categoryId)}>
                        <ReportRow
                          icon={v.icon}
                          color={v.color}
                          name={v.name}
                          caption={`${money(row.previous)} → ${money(row.amount)}`}
                          value={signedMoney(row.change.amount)}
                          detail={changeText(row.change.percent)}
                          bars={[
                            { pct: moverMax ? (row.amount * 100) / moverMax : 0, color },
                            { pct: moverMax ? (row.previous * 100) / moverMax : 0, color: NEUTRAL },
                          ]}
                          clickable={row.categoryId !== null && row.amount > 0}
                          onOpen={() => open(row)}
                        />
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <EmptyState
                  icon="bar_chart"
                  title="No changes"
                  message={`Every category matches ${beforeLabel}.`}
                />
              )}
              <p className="category-report__legend">
                Top bar: {periodLabel} · Bottom bar: {beforeLabel}
              </p>
            </LUICard>
          </div>

          <LUICard title="All categories" padding="none">
            <ReportTable
              caption={`${typeLabel} by category, ${periodLabel}, against ${beforeLabel}`}
              columns={columns}
              rows={rows}
              rowKey={(r) => String(r.categoryId)}
              onRowClick={open}
              canOpen={(r) => r.categoryId !== null && r.amount > 0}
            />
          </LUICard>
        </>
      )}
    </ReportFrame>
  )
}
