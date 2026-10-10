import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { LUIButton, LUICard, LUIChip, LUIIcon, LUIMenu, LUISkeleton } from '@lumen-ui/react'
import { EmptyState } from '@/components/empty-state'
import { Progress } from '@/components/progress'
import { useAccounts } from '@/features/accounts/account.query'
import type { IAccount } from '@/features/accounts/account.types'
import { useCategories } from '@/features/categories/category.query'
import type { ICategory } from '@/features/categories/category.types'
import { CategoryIcon } from '@/features/categories/components/CategoryIcon'
import { TransactionRow } from '@/features/transactions/components/TransactionRow'
import { useTransactionActions } from '@/features/transactions/transaction.actions'
import { compareNewestFirst } from '@/features/transactions/transaction.domain'
import { type TxLookups, type TxRow, toRow } from '@/features/transactions/transaction.labels'
import type { ITransactionBody } from '@/features/transactions/transaction.types'
import { getApiErrorMessage, useToday } from '@/lib'
import { DEFAULT_CURRENCY, formatMoney, formatPeriod, fractionDigits, inRange } from '@/utils'
import { useBudgetActions } from '../budget.actions'
import {
  HISTORY_PERIODS,
  type BudgetResult,
  budgetHistory,
  budgetProgress,
  countsToward,
  neededRange,
} from '../budget.domain'
import {
  BUDGET_PERIOD_LABELS,
  BUDGET_STATES,
  PER_PERIOD,
  iconOf,
  percentLabel,
  scopeOf,
} from '../budget.labels'
import { useBudgets, useSpending } from '../budget.query'
import type { IBudget } from '../budget.types'
import { BudgetMeter } from './BudgetMeter'
import './BudgetDetail.scss'

/** How many of a period's transactions show before "Show more". */
const PAGE_SIZE = 50

/** One period in the results list: the current one first, then the past ones. */
interface PeriodRow {
  /** 0 for the current period, −1 for the one before, … */
  offset: number
  label: string
  result: BudgetResult
  /** The period ended before the budget was created: shown for comparison only. */
  beforeBudget: boolean
}

type BudgetDetailProps = {
  budgetId: string
}

/**
 * `/budgets/$budgetId`: the budget's current period, its results for past
 * periods, and the transactions behind whichever period is selected. One
 * query covers every period shown.
 */
export const BudgetDetail = ({ budgetId }: BudgetDetailProps) => {
  const id = Number(budgetId)
  const navigate = useNavigate()
  const budgetsQuery = useBudgets()
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()

  if (budgetsQuery.isLoading || accountsQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <div className="budget-page">
        <LUISkeleton height="56px" />
        <LUISkeleton height="160px" />
        <LUISkeleton height="240px" />
      </div>
    )
  }

  const budget = budgetsQuery.data?.find((b) => b.id === id)
  if (!budget) {
    return (
      <LUICard>
        <EmptyState
          icon="donut_large"
          title="Budget not found"
          message={
            budgetsQuery.isError
              ? getApiErrorMessage(budgetsQuery.error)
              : 'It may have been deleted, perhaps in another tab.'
          }
        >
          <LUIButton size="lg" onClick={() => navigate({ to: '/budgets' })}>
            Back to budgets
          </LUIButton>
        </EmptyState>
      </LUICard>
    )
  }

  // Keyed, so the selected period and the page of rows start over for another budget.
  return (
    <BudgetPage
      key={budget.id}
      budget={budget}
      accounts={accountsQuery.data ?? []}
      categories={categoriesQuery.data ?? []}
    />
  )
}

interface BudgetPageProps {
  budget: IBudget
  accounts: IAccount[]
  categories: ICategory[]
}

const BudgetPage = ({ budget, accounts, categories }: BudgetPageProps) => {
  const navigate = useNavigate()
  const today = useToday()
  const actions = useBudgetActions()
  const txActions = useTransactionActions()
  const [selected, setSelected] = useState(0)
  const [limit, setLimit] = useState(PAGE_SIZE)

  const periods = HISTORY_PERIODS[budget.period]
  const spending = useSpending(neededRange(budget, today, periods))

  // Accounts share one currency until multi-currency exists, and budgets use it.
  const currency = accounts[0]?.currency ?? DEFAULT_CURRENCY
  const money = (amount: number) => formatMoney(amount, currency)
  const categoriesById = new Map(categories.map((c) => [c.id, c]))
  const lookups: TxLookups = {
    accountsById: new Map(accounts.map((a) => [a.id, a])),
    categoriesById,
    today,
  }
  const icon = iconOf(budget, categoriesById)

  // The current period, then the past ones, newest first.
  const txs = spending.data ?? []
  const current = spending.data
    ? budgetProgress(budget, txs, today, fractionDigits(currency))
    : undefined
  const periodRows: PeriodRow[] = current
    ? [
        { offset: 0, label: formatPeriod(current.range), result: current, beforeBudget: false },
        ...budgetHistory(budget, txs, today, periods).map((entry, i) => ({
          offset: -(i + 1),
          label: formatPeriod(entry.range),
          result: entry,
          beforeBudget: entry.beforeBudget,
        })),
      ]
    : []
  const selectedRow = periodRows.find((row) => row.offset === selected) ?? periodRows[0]

  const counted = selectedRow
    ? txs
        .filter((tx) => inRange(tx.date, selectedRow.result.range) && countsToward(budget, tx))
        .sort(compareNewestFirst)
        .map((tx) => toRow(tx, lookups))
    : []
  const rows = counted.slice(0, limit)
  const hiddenCount = counted.length - rows.length

  const select = (row: PeriodRow) => {
    setSelected(row.offset)
    setLimit(PAGE_SIZE)
  }

  const open = (row: TxRow) =>
    navigate({ to: '/transactions/$transactionId', params: { transactionId: String(row.id) } })

  /** An expense form, in the budget's category when it has just one. */
  const addExpense = () => {
    const prefill: Partial<ITransactionBody> = { type: 'expense' }
    if (budget.categoryIds.length === 1) prefill.categoryId = budget.categoryIds[0]
    return txActions.create(prefill)
  }

  const remove = async () => {
    if (await actions.delete(budget)) navigate({ to: '/budgets' })
  }

  const menuTrigger = (
    <LUIButton variant="ghost" size="lg" rounded aria-label="More actions">
      <LUIIcon name="more" color="inherit" />
    </LUIButton>
  )

  return (
    <div className="budget-page">
      <div className="budget-page__header">
        <LUIButton
          variant="ghost"
          size="lg"
          rounded
          aria-label="Back to budgets"
          onClick={() => navigate({ to: '/budgets' })}
        >
          <LUIIcon name="caret" className="rotate-180" color="inherit" />
        </LUIButton>

        <CategoryIcon category={icon} size={48} />

        <div className="budget-page__title">
          <h1 className="text-ellipsis">{budget.name}</h1>
          <div className="budget-page__meta">
            <span>
              {BUDGET_PERIOD_LABELS[budget.period]} limit · {scopeOf(budget, categoriesById)}
            </span>
            {!budget.active && <LUIChip size="sm">Paused</LUIChip>}
            {budget.rollover && <LUIChip size="sm">Rolls over</LUIChip>}
            {!budget.alertThresholds.length && <LUIChip size="sm">No alerts</LUIChip>}
          </div>
        </div>

        <div className="budget-page__actions">
          <LUIButton variant="outlined" size="lg" onClick={() => actions.edit(budget)}>
            <LUIIcon name="edit" color="inherit" />
            Edit
          </LUIButton>
          <LUIMenu mode="right" closeOnItemClick appendBody dropdownDisplay={menuTrigger}>
            {budget.active ? (
              <button
                type="button"
                className="dropdown-item budget-page__item"
                onClick={() => actions.pause(budget)}
              >
                <LUIIcon name="eye_slash" size={18} />
                Pause
              </button>
            ) : (
              <button
                type="button"
                className="dropdown-item budget-page__item"
                onClick={() => actions.resume(budget)}
              >
                <LUIIcon name="eye" size={18} />
                Resume
              </button>
            )}
            <button
              type="button"
              className="dropdown-item budget-page__item budget-page__item--danger"
              onClick={remove}
            >
              <LUIIcon name="trash" size={18} color="inherit" />
              Delete
            </button>
          </LUIMenu>
        </div>
      </div>

      {!budget.active && (
        <p className="alert warn">
          This budget is paused: it keeps its {money(budget.amount)} {PER_PERIOD[budget.period]}{' '}
          limit but sends no alerts. Resume it to track it again.
        </p>
      )}

      {spending.isError && <div className="alert error">{getApiErrorMessage(spending.error)}</div>}

      <LUICard padding="lg">
        {current ? (
          <BudgetMeter progress={current} currency={currency} period={budget.period} name={budget.name} />
        ) : (
          <LUISkeleton height="92px" />
        )}
      </LUICard>

      <LUICard title="Results by period" padding="none">
        {!current ? (
          <div className="budget-page__skeleton">
            {[1, 2, 3].map((placeholder) => (
              <LUISkeleton key={placeholder} height="56px" />
            ))}
          </div>
        ) : (
          <ul className="period-list" aria-label="Results by period">
            {periodRows.map((row) => {
              const state = BUDGET_STATES[row.result.state]
              const isSelected = row === selectedRow
              return (
                <li key={row.offset}>
                  <button
                    type="button"
                    className={`period-row${isSelected ? ' is-selected' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => select(row)}
                  >
                    <span className="period-row__head">
                      <span className="period-row__label">
                        <span className="text-ellipsis">{row.label}</span>
                        {row.offset === 0 && (
                          <LUIChip size="sm" variant="primary">
                            This period
                          </LUIChip>
                        )}
                      </span>
                      <span className="period-row__amounts">
                        {money(row.result.spent)}
                        <span className="period-row__of"> of {money(row.result.limit)}</span>
                      </span>
                    </span>
                    <Progress
                      value={row.result.percent ?? 100}
                      variant={row.beforeBudget ? 'accent' : state.progress}
                      label={`${row.label} used`}
                    />
                    <span className="period-row__foot">
                      {row.beforeBudget ? (
                        <span>Before this budget started</span>
                      ) : (
                        <span className="period-row__state">
                          <LUIIcon name={state.icon} size={14} color={`var(--${state.chip})`} />
                          {state.label}
                        </span>
                      )}
                      <span className="period-row__percent">
                        {percentLabel(row.result.percent)} used
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </LUICard>

      {selectedRow && (
        <LUICard
          title={`Transactions · ${selectedRow.label}`}
          padding="none"
          footer={
            hiddenCount > 0 ? (
              <div className="budget-page__more">
                <LUIButton variant="outlined" size="lg" onClick={() => setLimit(limit + PAGE_SIZE)}>
                  Show more ({hiddenCount})
                </LUIButton>
              </div>
            ) : undefined
          }
        >
          {rows.length === 0 ? (
            <EmptyState
              icon="receipt"
              title="Nothing spent in this period"
              message="Expenses this budget counts show up here."
            >
              {selectedRow.offset === 0 && (
                <LUIButton size="lg" onClick={addExpense}>
                  Add expense
                </LUIButton>
              )}
            </EmptyState>
          ) : (
            <ul className="budget-page__transactions">
              {rows.map((row) => (
                <li key={row.id}>
                  <TransactionRow
                    row={row}
                    onOpen={() => open(row)}
                    onEdit={() => txActions.edit(row.tx)}
                    onDelete={() => txActions.delete(row.tx)}
                  />
                </li>
              ))}
            </ul>
          )}
        </LUICard>
      )}
    </div>
  )
}
