import { useState, type MouseEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  LUIBreadcrumb,
  LUIButton,
  LUICard,
  LUIChip,
  LUICol,
  LUIDateInput,
  LUIIcon,
  LUIMenu,
  LUIRow,
  LUISegmentedControl,
  LUISelect,
  LUISkeleton,
  LUITableCell,
  LUITextInput,
  LUITooltip,
  useLUINotification,
  type TableColumn,
} from '@lumen-ui/react'
import { EmptyState } from '@/components/empty-state'
import { GroupedTable, type GroupHeader } from '@/components/grouped-table'
import { useMediaQuery } from '@/components/sheet'
import { useAccounts } from '@/features/accounts/account.query'
import { useCategories } from '@/features/categories/category.query'
import { getErrorMessage } from '@/lib'
import {
  DEFAULT_CURRENCY,
  PERIOD_PRESETS,
  type DateRange,
  type PeriodPreset,
  dayLabel,
  formatMoney,
  formatPeriod,
  localDate,
  monthPeriod,
  orderedRange,
  parseYmd,
  presetOf,
  presetRange,
  toYmd,
} from '@/utils'
import { useTransactionActions } from '../transaction.actions'
import {
  NO_FILTER,
  type TransactionFilter,
  activeFilterCount,
  compareNewestFirst,
  filterTransactions,
  groupByDay,
  totalsOf,
} from '../transaction.domain'
import {
  EXPORT_FORMAT_LABELS,
  type ExportFormat,
  exportTransactions,
} from '../transaction.export'
import {
  PERIOD_OPTIONS,
  TX_TYPE_LABELS,
  type TxLookups,
  type TxRow,
  entries,
  searchTextOf,
  toRow,
} from '../transaction.labels'
import { useTransactions } from '../transaction.query'
import type { ListStart } from '../transaction.search'
import { TransactionAmount } from './TransactionAmount'
import { TransactionIcon } from './TransactionIcon'
import { TransactionRow } from './TransactionRow'
import './TransactionList.scss'

/** Phones get a period select and the row list; desktops get the table. */
const PHONE = '(max-width: 599.98px)'
const DESKTOP = '(min-width: 1024px)'

/** A removable chip for one active filter. */
interface FilterChip {
  key: string
  label: string
  remove: () => void
}

const COLUMNS: readonly TableColumn[] = [
  { key: 'date', header: 'Date', sortable: true, width: '170px' },
  { key: 'note', header: 'Description', sortable: true },
  { key: 'categoryLabel', header: 'Category', sortable: true, width: '20%' },
  { key: 'accountLabel', header: 'Account', sortable: true, width: '16%' },
  { key: 'amount', header: 'Amount', sortable: true, align: 'right', width: '150px' },
  { key: 'actions', header: '', width: '92px' },
]

interface TransactionListProps {
  /** Where a link into the list starts it: the period and the filters already set. */
  start?: ListStart
}

/**
 * `/transactions`: the period's entries newest first with income, expense and
 * net of what's shown; period, type, account, category and amount filters
 * that combine; search; export to Excel or PDF. Desktops get a sortable
 * table with an actions column and, while unsorted, a header row per day
 * with its net; phones and tablets get day-grouped rows. A row opens the
 * entry's page.
 */
export const TransactionList = ({ start }: TransactionListProps = {}) => {
  const navigate = useNavigate()
  const notify = useLUINotification()
  const actions = useTransactionActions()
  const phone = useMediaQuery(PHONE)
  const desktop = useMediaQuery(DESKTOP)

  const today = localDate()
  const [preset, setPreset] = useState<PeriodPreset>(() =>
    start?.range ? presetOf(start.range, today) : 'this_month',
  )
  /** The range "Custom" shows; it starts as this month, or as the period a link opened. */
  const [custom, setCustom] = useState<DateRange>(() => start?.range ?? monthPeriod(today))
  const [filter, setFilter] = useState<TransactionFilter>(start?.filter ?? NO_FILTER)
  const range = presetRange(preset, today, custom)
  const periodLabel = formatPeriod(range)

  const transactions = useTransactions({ from: range.start, to: range.end })
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()

  const selectPreset = (value: unknown) => {
    if (PERIOD_PRESETS.includes(value as PeriodPreset)) setPreset(value as PeriodPreset)
  }

  const setCustomDate = (edge: 'start' | 'end', date: Date | null) => {
    if (!date) return
    const next = { ...custom, [edge]: toYmd(date) }
    setCustom(orderedRange(next.start, next.end))
    setPreset('custom')
  }

  const setSearch = (search: string) => setFilter((f) => ({ ...f, search }))
  const clearFilters = () => setFilter(NO_FILTER)

  const header = (
    <div className="tx-page__header">
      <LUIBreadcrumb title="Transactions" />
      <div className="tx-page__actions">
        <LUIMenu
          mode="right"
          closeOnItemClick
          appendBody
          dropdownDisplay={
            <LUIButton variant="outlined" size="lg">
              <LUIIcon name="download" color="inherit" />
              Export
            </LUIButton>
          }
        >
          {(['xlsx', 'pdf'] as const).map((format) => (
            <button
              key={format}
              type="button"
              className="dropdown-item tx-page__item"
              onClick={() => exportAs(format)}
            >
              <LUIIcon name={format === 'xlsx' ? 'file_alt' : 'file'} size={18} />
              {EXPORT_FORMAT_LABELS[format]}
            </button>
          ))}
        </LUIMenu>
        <LUIButton size="lg" onClick={() => actions.create()}>
          <LUIIcon name="add" color="inherit" />
          Add transaction
        </LUIButton>
      </div>
    </div>
  )

  const loading = transactions.isLoading || accountsQuery.isLoading || categoriesQuery.isLoading
  const error = transactions.error ?? accountsQuery.error ?? categoriesQuery.error

  const accounts = accountsQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const lookups: TxLookups = {
    accountsById: new Map(accounts.map((a) => [a.id, a])),
    categoriesById: new Map(categories.map((c) => [c.id, c])),
    today,
  }
  // Accounts share one currency until multi-currency exists.
  const currency = accounts[0]?.currency ?? DEFAULT_CURRENCY

  const loaded = [...(transactions.data ?? [])].sort(compareNewestFirst)
  const visible = filterTransactions(loaded, filter, (tx) => searchTextOf(tx, lookups))
  const rows = visible.map((tx) => toRow(tx, lookups))
  const totals = totalsOf(visible)
  const days = groupByDay(rows).map(({ date, items }) => ({
    date,
    label: dayLabel(date, today),
    net: totalsOf(items.map((row) => row.tx)).net,
    rows: items,
  }))
  const filterCount = activeFilterCount(filter)
  const filtering = filterCount > 0 || !!filter.search.trim()

  /** Saves what the list shows, the whole period with its filters, as a file. */
  async function exportAs(format: ExportFormat) {
    try {
      const count = await exportTransactions({ rows, range, totals, currency }, format)
      if (count) {
        notify.success(`Exported ${entries(count)}`, `${periodLabel} · ${EXPORT_FORMAT_LABELS[format]}`)
      } else {
        notify.info('Nothing to export', `No transactions match in ${periodLabel}.`)
      }
    } catch (err) {
      notify.error('Could not export', getErrorMessage(err))
    }
  }

  const openFilters = async () => {
    const next = await actions.openFilters(filter, currency)
    if (next) setFilter(next)
  }

  const open = (row: TxRow) =>
    navigate({ to: '/transactions/$transactionId', params: { transactionId: String(row.id) } })

  /** An action in a table row must not also open the row. */
  const stop = (event: MouseEvent) => event.stopPropagation()

  const chips: FilterChip[] = []
  const set = (changes: Partial<TransactionFilter>) => setFilter({ ...filter, ...changes })
  if (filter.type) {
    chips.push({ key: 'type', label: TX_TYPE_LABELS[filter.type], remove: () => set({ type: null }) })
  }
  for (const id of filter.accountIds) {
    chips.push({
      key: `account:${id}`,
      label: lookups.accountsById.get(id)?.name ?? 'Deleted account',
      remove: () => set({ accountIds: filter.accountIds.filter((a) => a !== id) }),
    })
  }
  for (const id of filter.categoryIds) {
    chips.push({
      key: `category:${id}`,
      label: lookups.categoriesById.get(id)?.name ?? 'Deleted category',
      remove: () => set({ categoryIds: filter.categoryIds.filter((c) => c !== id) }),
    })
  }
  const { minAmount: min, maxAmount: max } = filter
  if (min !== null || max !== null) {
    const money = (amount: number) => formatMoney(amount, currency)
    chips.push({
      key: 'amount',
      label:
        min !== null && max !== null
          ? `${money(min)} – ${money(max)}`
          : min !== null
            ? `From ${money(min)}`
            : `Up to ${money(max!)}`,
      remove: () => set({ minAmount: null, maxAmount: null }),
    })
  }

  const toolbar = (
    <section className="tx-toolbar" aria-label="Period and filters">
      <div className="tx-toolbar__period">
        {phone ? (
          <LUISelect
            className="tx-toolbar__preset"
            items={PERIOD_OPTIONS}
            bindValue="value"
            bindLabel="label"
            value={preset}
            onChange={selectPreset}
          />
        ) : (
          <LUISegmentedControl
            options={PERIOD_OPTIONS}
            size="lg"
            value={preset}
            onChange={selectPreset}
          />
        )}
        <p className="tx-toolbar__label" aria-live="polite">
          {periodLabel}
        </p>
      </div>

      {preset === 'custom' && (
        <div className="tx-toolbar__custom">
          <LUIDateInput
            label="From"
            calendar="ad"
            clearable={false}
            value={parseYmd(custom.start)}
            onChange={(date) => setCustomDate('start', date)}
          />
          <LUIDateInput
            label="To"
            calendar="ad"
            clearable={false}
            value={parseYmd(custom.end)}
            onChange={(date) => setCustomDate('end', date)}
          />
        </div>
      )}

      <div className="tx-toolbar__search">
        <LUITextInput
          className="tx-toolbar__search-input"
          aria-label="Search transactions"
          placeholder="Search note, category or account"
          value={filter.search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <LUIButton variant="outlined" size="lg" onClick={openFilters}>
          <LUIIcon name="filter_list" color="inherit" />
          Filters
          {filterCount > 0 && (
            <>
              <span className="tx-toolbar__count">{filterCount}</span>
              <span className="visually-hidden">set</span>
            </>
          )}
        </LUIButton>
      </div>

      {chips.length > 0 && (
        <ul className="tx-chips" aria-label="Active filters">
          {chips.map((chip) => (
            <li key={chip.key}>
              <LUIChip
                variant="primary"
                removable
                removeLabel={`Remove filter ${chip.label}`}
                onRemoved={chip.remove}
              >
                {chip.label}
              </LUIChip>
            </li>
          ))}
          <li>
            <LUIButton variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </LUIButton>
          </li>
        </ul>
      )}
    </section>
  )

  if (loading) {
    return (
      <div className="tx-page">
        {header}
        {toolbar}
        <LUIRow gutter={[16, 16]} align="stretch">
          {[1, 2, 3].map((placeholder) => (
            <LUICol key={placeholder} span={12} md={4}>
              <LUISkeleton height="84px" />
            </LUICol>
          ))}
        </LUIRow>
        <LUISkeleton height="320px" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="tx-page">
        {header}
        <div className="alert error">{getErrorMessage(error)}</div>
      </div>
    )
  }

  const totalCards = (
    <LUIRow gutter={[16, 16]} align="stretch">
      <LUICol span={12} md={4}>
        <LUICard padding="lg" className="tx-total-card">
          <div className="tx-total">
            <span className="tx-total__label">
              <LUIIcon name="caret" size={14} className="rotate-90" color="var(--success)" />
              Income
            </span>
            <span className="tx-total__value is-income">
              {formatMoney(totals.income, currency, 'exceptZero')}
            </span>
          </div>
        </LUICard>
      </LUICol>
      <LUICol span={12} md={4}>
        <LUICard padding="lg" className="tx-total-card">
          <div className="tx-total">
            <span className="tx-total__label">
              <LUIIcon name="caret" size={14} className="rotate-270" color="var(--error)" />
              Expense
            </span>
            <span className="tx-total__value is-expense">
              {formatMoney(-totals.expense, currency, 'exceptZero')}
            </span>
          </div>
        </LUICard>
      </LUICol>
      <LUICol span={12} md={4}>
        <LUICard padding="lg" className="tx-total-card">
          <div className="tx-total">
            <span className="tx-total__label">Net</span>
            <span
              className={`tx-total__value${totals.net > 0 ? ' is-income' : totals.net < 0 ? ' is-expense' : ''}`}
            >
              {formatMoney(totals.net, currency, 'exceptZero')}
            </span>
          </div>
        </LUICard>
      </LUICol>
    </LUIRow>
  )

  let body
  if (!rows.length) {
    body = filtering ? (
      <EmptyState
        icon="search"
        title="No matches"
        message={`Nothing in ${periodLabel} matches your search and filters.`}
      >
        <LUIButton size="lg" onClick={clearFilters}>
          Clear search and filters
        </LUIButton>
      </EmptyState>
    ) : (
      <EmptyState
        icon="receipt"
        title={`No transactions in ${periodLabel}`}
        message="Log an expense, income or transfer and it shows up here."
      >
        <LUIButton size="lg" onClick={() => actions.create()}>
          Add transaction
        </LUIButton>
        {preset !== 'this_month' && (
          <LUIButton variant="outlined" size="lg" onClick={() => setPreset('this_month')}>
            Show this month
          </LUIButton>
        )}
      </EmptyState>
    )
  } else if (desktop) {
    const daysByDate = new Map(days.map((day) => [day.date, day]))
    /** A day's header row: its date, and its net under the Amount column. */
    const dayHeader = (date: unknown): GroupHeader => {
      const day = daysByDate.get(date as string)
      if (!day) return { label: null }
      return {
        label: day.label,
        cells: {
          amount: (
            <span
              className={`tx-day__net${day.net > 0 ? ' is-income' : day.net < 0 ? ' is-expense' : ''}`}
            >
              <span className="visually-hidden">Net </span>
              {formatMoney(day.net, currency, 'exceptZero')}
            </span>
          ),
        },
      }
    }

    body = (
      <div className="tx-table">
        <GroupedTable<TxRow>
          columns={COLUMNS}
          data={rows}
          rowKey="id"
          groupBy="date"
          renderGroup={dayHeader}
          onRowClick={open}
        >
          <LUITableCell<TxRow> column="date">
            {({ row }) => (
              <span className="tx-cell">
                <span className="text-ellipsis">{row.dateLabel}</span>
                {row.upcoming && (
                  <LUIChip size="sm" variant="info">
                    Upcoming
                  </LUIChip>
                )}
              </span>
            )}
          </LUITableCell>
          <LUITableCell<TxRow> column="note">
            {({ row }) => (
              <Link
                className={`tx-cell__note text-ellipsis${row.note ? '' : ' is-empty'}`}
                to="/transactions/$transactionId"
                params={{ transactionId: String(row.id) }}
                title={row.note || undefined}
                onClick={stop}
              >
                {row.note || '—'}
                {!row.note && <span className="visually-hidden">No note</span>}
              </Link>
            )}
          </LUITableCell>
          <LUITableCell<TxRow> column="categoryLabel">
            {({ row }) => (
              <span className="tx-cell">
                <TransactionIcon row={row} size={28} />
                <span className="text-ellipsis">{row.categoryLabel}</span>
              </span>
            )}
          </LUITableCell>
          <LUITableCell<TxRow> column="accountLabel">
            {({ row }) => <span className="tx-cell__text text-ellipsis">{row.accountLabel}</span>}
          </LUITableCell>
          <LUITableCell<TxRow> column="amount">
            {({ row }) => (
              <TransactionAmount kind={row.kind} amount={row.amount} currency={row.currency} />
            )}
          </LUITableCell>
          <LUITableCell<TxRow> column="actions">
            {({ row }) => (
              <span className="tx-cell__actions" onClick={stop}>
                <LUITooltip content="Edit">
                  <LUIButton
                    variant="ghost"
                    size="md"
                    rounded
                    aria-label={`Edit ${row.title}`}
                    onClick={() => actions.edit(row.tx)}
                  >
                    <LUIIcon name="edit" size={18} color="inherit" />
                  </LUIButton>
                </LUITooltip>
                <LUITooltip content="Delete">
                  <LUIButton
                    variant="ghost"
                    size="md"
                    rounded
                    className="tx-cell__delete"
                    aria-label={`Delete ${row.title}`}
                    onClick={() => actions.delete(row.tx)}
                  >
                    <LUIIcon name="trash" size={18} color="inherit" />
                  </LUIButton>
                </LUITooltip>
              </span>
            )}
          </LUITableCell>
        </GroupedTable>
      </div>
    )
  } else {
    body = (
      <div className="tx-days">
        {days.map((day) => (
          <section key={day.date} className="tx-day-group" aria-label={day.label}>
            <div className="tx-day">
              <h2 className="tx-day__label">{day.label}</h2>
              <span
                className={`tx-day__net${day.net > 0 ? ' is-income' : day.net < 0 ? ' is-expense' : ''}`}
              >
                <span className="visually-hidden">Net </span>
                {formatMoney(day.net, currency, 'exceptZero')}
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
    )
  }

  return (
    <div className="tx-page">
      {header}
      {toolbar}
      {totalCards}
      <LUICard padding="none">{body}</LUICard>
    </div>
  )
}
