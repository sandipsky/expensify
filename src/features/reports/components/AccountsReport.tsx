import { useNavigate } from '@tanstack/react-router'
import { LUICard } from '@lumen-ui/react'
import { BarChart, type ChartSeries } from '@/components/chart'
import { EmptyState } from '@/components/empty-state'
import { ACCOUNT_TYPE_LABELS } from '@/features/accounts/account.labels'
import { AccountIcon } from '@/features/accounts/components/AccountIcon'
import type { IAccount } from '@/features/accounts/account.types'
import { useTransactions } from '@/features/transactions/transaction.query'
import { idsOf, idsParamOf } from '@/features/transactions/transaction.search'
import { formatDate, formatPeriod } from '@/utils'
import {
  type AccountStatement,
  type NetWorthPoint,
  accountStatements,
  bucketsOf,
  netWorthSeries,
  periodState,
  sumOf,
} from '../report.domain'
import { type ReportDocument, reportFileName } from '../report.export'
import {
  GRANULARITY_LABELS,
  GRANULARITY_OPTIONS,
  accountsText,
  bucketLabel,
  spansYears,
  thinLabels,
} from '../report.labels'
import type { AccountsSearch, Granularity } from '../report.types'
import { useReportBase } from '../useReportBase'
import { AccountsField, PeriodField, SwitchField } from './ReportFields'
import { ReportFrame } from './ReportFrame'
import { type ReportColumn, ReportTable } from './ReportTable'
import { ReportTiles } from './ReportTiles'

const WORTH_SERIES: readonly ChartSeries[] = [
  { key: 'assets', label: 'Assets', color: 'var(--success)' },
  { key: 'liabilities', label: 'Liabilities', color: 'var(--error)' },
]

/** How the balances are worked out, under the report and in the files. */
const BALANCE_NOTE =
  "Balances are worked back from each account's current balance, so entries dated later, " +
  'reconciliations and upcoming entries all count. Before an account was added, it reads as ' +
  'its opening balance.'

const toneOf = (amount: number) => (amount > 0 ? 'is-income' : amount < 0 ? 'is-expense' : '')

/** One statement row with its account. */
interface StatementRow extends AccountStatement {
  account: IAccount
}

/**
 * `/reports/accounts`: each account's opening balance, money in and out,
 * transfers and closing balance over the period, then net worth (assets
 * minus liabilities) at the end of each week, month or year. Without a pick
 * it covers the accounts in the total, as the dashboard does. An account
 * opens its page.
 */
export const AccountsReport = ({ search }: { search: AccountsSearch }) => {
  const navigate = useNavigate()
  const base = useReportBase()
  const { money, signedMoney, compactMoney } = base

  const period = periodState(search, 'last_12_months', base.today)
  const { range } = period
  const by: Granularity = search.by ?? 'month'
  const accountIds = idsOf(search.accounts)

  // Every entry from the period's start on, future ones too: balances are worked back from today's.
  const query = useTransactions({ from: range.start })

  const set = (changes: Partial<AccountsSearch>) =>
    void navigate({ to: '/reports/accounts', search: { ...search, ...changes }, replace: true })
  const filtered = Object.values(search).some((value) => value !== undefined)
  const reset = () => void navigate({ to: '/reports/accounts', search: {}, replace: true })

  const picked = new Set(accountIds)
  const accounts = picked.size
    ? base.accounts.filter((a) => picked.has(a.id))
    : base.accounts.filter((a) => a.includeInTotal && !a.archived)
  const txs = query.data ?? []

  const statements: StatementRow[] = accountStatements(accounts, txs, range).map((s, i) => ({
    ...s,
    account: accounts[i],
  }))
  const buckets = bucketsOf(range, by)
  const { opening, points } = netWorthSeries(accounts, txs, buckets)
  const last = points[points.length - 1]
  const closing = last?.netWorth ?? opening
  const change = sumOf([closing, -opening])
  const multiYear = spansYears(buckets)
  const periodLabel = formatPeriod(range)
  const scope = accountsText(base.lookups, accountIds, 'Accounts in your total')

  const sum = (pick: (s: AccountStatement) => number) => sumOf(statements.map(pick))
  const totals = {
    opening: sum((s) => s.opening),
    income: sum((s) => s.income),
    expense: sum((s) => s.expense),
    transfersIn: sum((s) => s.transfersIn),
    transfersOut: sum((s) => s.transfersOut),
    closing: sum((s) => s.closing),
    change: sum((s) => s.change),
  }

  const statementColumns: ReportColumn<StatementRow>[] = [
    {
      key: 'account',
      header: 'Account',
      cell: (r) => (
        <span className="report-name">
          <AccountIcon account={r.account} size={28} />
          <span className="report-name__text">
            <span className="text-ellipsis">{r.account.name}</span>
            <span className="report-name__caption">
              {ACCOUNT_TYPE_LABELS[r.account.type]}
              {r.account.archived ? ' · Archived' : ''}
            </span>
          </span>
        </span>
      ),
      total: 'Total',
    },
    { key: 'opening', header: 'Opening', numeric: true, cell: (r) => money(r.opening), total: money(totals.opening) },
    { key: 'income', header: 'Income', numeric: true, cell: (r) => money(r.income), total: money(totals.income) },
    { key: 'expense', header: 'Expense', numeric: true, cell: (r) => money(r.expense), total: money(totals.expense) },
    {
      key: 'in',
      header: 'Transfers in',
      numeric: true,
      cell: (r) => money(r.transfersIn),
      total: money(totals.transfersIn),
    },
    {
      key: 'out',
      header: 'Transfers out',
      numeric: true,
      cell: (r) => money(r.transfersOut),
      total: money(totals.transfersOut),
    },
    {
      key: 'closing',
      header: 'Closing',
      numeric: true,
      cell: (r) => <strong>{money(r.closing)}</strong>,
      total: money(totals.closing),
    },
    {
      key: 'change',
      header: 'Change',
      numeric: true,
      cell: (r) => <span className={toneOf(r.change)}>{signedMoney(r.change)}</span>,
      total: <span className={toneOf(totals.change)}>{signedMoney(totals.change)}</span>,
    },
  ]

  const worthColumns: ReportColumn<NetWorthPoint>[] = [
    {
      key: 'period',
      header: 'Period',
      cell: (p) => (
        <span className="report-name__text">
          <span>{formatPeriod(p.range)}</span>
          <span className="report-name__caption">At the end of {formatDate(p.range.end)}</span>
        </span>
      ),
    },
    { key: 'assets', header: 'Assets', numeric: true, cell: (p) => money(p.assets) },
    { key: 'liabilities', header: 'Liabilities', numeric: true, cell: (p) => money(p.liabilities) },
    {
      key: 'worth',
      header: 'Net worth',
      numeric: true,
      cell: (p) => <strong className={p.netWorth < 0 ? 'is-expense' : undefined}>{money(p.netWorth)}</strong>,
    },
    {
      key: 'change',
      header: 'Change',
      numeric: true,
      cell: (p) => <span className={toneOf(p.change)}>{signedMoney(p.change)}</span>,
    },
  ]

  const document = (): ReportDocument | null =>
    accounts.length
      ? {
          title: 'Accounts & net worth',
          fileName: reportFileName('accounts-net-worth', range),
          currency: base.currency,
          details: [
            { label: 'Period', value: periodLabel },
            { label: 'Group by', value: GRANULARITY_LABELS[by] },
            { label: 'Accounts', value: scope },
          ],
          summary: [
            { label: 'Opening net worth', value: money(opening) },
            { label: 'Closing net worth', value: money(closing) },
            { label: 'Change', value: signedMoney(change) },
          ],
          tables: [
            {
              name: 'Account statement',
              columns: [
                { header: 'Account', kind: 'text', width: 24 },
                { header: 'Type', kind: 'text', width: 14 },
                { header: 'Opening', kind: 'money' },
                { header: 'Income', kind: 'money' },
                { header: 'Expense', kind: 'money' },
                { header: 'Transfers in', kind: 'money' },
                { header: 'Transfers out', kind: 'money' },
                { header: 'Closing', kind: 'money' },
                { header: 'Change', kind: 'signed' },
              ],
              rows: statements.map((r) => [
                r.account.name,
                ACCOUNT_TYPE_LABELS[r.account.type],
                r.opening,
                r.income,
                r.expense,
                r.transfersIn,
                r.transfersOut,
                r.closing,
                r.change,
              ]),
              totals: [
                'Total',
                null,
                totals.opening,
                totals.income,
                totals.expense,
                totals.transfersIn,
                totals.transfersOut,
                totals.closing,
                totals.change,
              ],
            },
            {
              name: 'Net worth',
              columns: [
                { header: 'Period', kind: 'text', width: 28 },
                { header: 'As of', kind: 'date', width: 12 },
                { header: 'Assets', kind: 'money' },
                { header: 'Liabilities', kind: 'money' },
                { header: 'Net worth', kind: 'signed' },
                { header: 'Change', kind: 'signed' },
              ],
              rows: points.map((p) => [
                formatPeriod(p.range),
                p.range.end,
                p.assets,
                p.liabilities,
                p.netWorth,
                p.change,
              ]),
            },
          ],
          notes: [BALANCE_NOTE],
        }
      : null

  return (
    <ReportFrame
      report="accounts"
      loading={base.loading || query.isLoading}
      error={base.error ?? query.error}
      onReset={filtered ? reset : null}
      document={document}
      summary={`${periodLabel} · ${scope}`}
      emptyMessage="Pick at least one account."
      filters={
        <>
          <PeriodField state={period} onChange={set} />
          <SwitchField
            label="Net worth by"
            options={GRANULARITY_OPTIONS}
            value={by}
            onChange={(next) => set({ by: next })}
          />
          <AccountsField
            accounts={base.accounts}
            value={accountIds}
            placeholder="Accounts in your total"
            onChange={(ids) => set({ accounts: idsParamOf(ids) })}
          />
        </>
      }
    >
      {!accounts.length ? (
        <LUICard>
          <EmptyState
            icon="wallet"
            title={base.accounts.length ? 'No accounts in your total' : 'No accounts yet'}
            message={
              base.accounts.length
                ? 'Pick accounts above to see their balances and net worth.'
                : 'Add an account to see its balances here.'
            }
          />
        </LUICard>
      ) : (
        <>
          <ReportTiles
            tiles={[
              {
                label: 'Net worth',
                value: money(closing),
                tone: closing < 0 ? 'expense' : null,
                note: `As of ${formatDate(range.end)}`,
              },
              {
                label: 'Change',
                value: signedMoney(change),
                tone: change > 0 ? 'income' : change < 0 ? 'expense' : null,
                note: `From ${money(opening)} at the start`,
              },
              {
                label: 'Assets',
                value: money(last?.assets ?? 0),
                note: 'Balances above zero',
              },
              {
                label: 'Liabilities',
                value: money(last?.liabilities ?? 0),
                note: 'Owed on cards, loans and overdrafts',
              },
            ]}
          />

          <LUICard title="Assets and liabilities" padding="md">
            <BarChart
              label={`Assets and liabilities at the end of each ${by}, ${periodLabel}`}
              groups={thinLabels(
                points.map((p) => ({
                  key: p.range.start,
                  label: bucketLabel(p.range, by, multiYear),
                  title: `${formatPeriod(p.range)} · net worth ${money(p.netWorth)}`,
                  values: { assets: p.assets, liabilities: p.liabilities },
                  caption: points.length <= 12 ? compactMoney(p.netWorth) : undefined,
                })),
              )}
              series={WORTH_SERIES}
              format={money}
              tickFormat={(value) => compactMoney(value)}
              tableToggle={false}
              height={200}
            />
          </LUICard>

          <LUICard title="Account statement" padding="none">
            <ReportTable
              caption={`Account statement, ${periodLabel}`}
              columns={statementColumns}
              rows={statements}
              rowKey={(r) => r.accountId}
              onRowClick={(r) =>
                void navigate({
                  to: '/accounts/$accountId',
                  params: { accountId: String(r.accountId) },
                })
              }
            />
          </LUICard>

          <LUICard title={`Net worth by ${by}`} padding="none">
            <ReportTable
              caption={`Net worth at the end of each ${by}, ${periodLabel}`}
              columns={worthColumns}
              rows={points}
              rowKey={(p) => p.range.start}
            />
          </LUICard>

          <p className="report-page__note">{BALANCE_NOTE}</p>
        </>
      )}
    </ReportFrame>
  )
}
