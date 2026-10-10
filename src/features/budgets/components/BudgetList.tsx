import {
  LUIAccordion,
  LUIAccordionItem,
  LUIBreadcrumb,
  LUIButton,
  LUICard,
  LUICol,
  LUIIcon,
  LUIRow,
  LUISkeleton,
} from '@lumen-ui/react'
import { EmptyState } from '@/components/empty-state'
import { useAccounts } from '@/features/accounts/account.query'
import { useCategories } from '@/features/categories/category.query'
import { getErrorMessage, useToday } from '@/lib'
import { DEFAULT_CURRENCY, fractionDigits, spanOf } from '@/utils'
import { useBudgetActions } from '../budget.actions'
import { budgetProgress, compareBudgets, neededRange } from '../budget.domain'
import { iconOf, scopeOf } from '../budget.labels'
import { useBudgets, useSpending } from '../budget.query'
import type { IBudget } from '../budget.types'
import { BudgetCard } from './BudgetCard'
import './BudgetList.scss'

/**
 * `/budgets`: every active budget with its current period, then the paused
 * ones. All of them read one query over the dates they need.
 */
export const BudgetList = () => {
  const today = useToday()
  const budgetsQuery = useBudgets()
  const accountsQuery = useAccounts()
  const categoriesQuery = useCategories()
  const actions = useBudgetActions()

  const all = [...(budgetsQuery.data ?? [])].sort(compareBudgets)
  const active = all.filter((b) => b.active)
  const paused = all.filter((b) => !b.active)
  const spending = useSpending(spanOf(active.map((b) => neededRange(b, today))))

  if (budgetsQuery.isLoading || accountsQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <div className="budgets-page">
        <LUIBreadcrumb title="Budgets" />
        <LUIRow gutter={[16, 16]} align="stretch">
          {[1, 2, 3].map((placeholder) => (
            <LUICol key={placeholder} span={12} md={6} xl={4}>
              <LUISkeleton height="196px" />
            </LUICol>
          ))}
        </LUIRow>
      </div>
    )
  }

  if (budgetsQuery.isError) {
    return (
      <div className="budgets-page">
        <LUIBreadcrumb title="Budgets" />
        <div className="alert error">{getErrorMessage(budgetsQuery.error)}</div>
      </div>
    )
  }

  // Accounts share one currency until multi-currency exists, and budgets use it.
  const currency = accountsQuery.data?.[0]?.currency ?? DEFAULT_CURRENCY
  const digits = fractionDigits(currency)
  const categoriesById = new Map((categoriesQuery.data ?? []).map((c) => [c.id, c]))

  const addButton = (
    <LUIButton size="lg" onClick={() => actions.create()}>
      <LUIIcon name="add" color="inherit" />
      Add budget
    </LUIButton>
  )

  const grid = (list: IBudget[]) => (
    <LUIRow gutter={[16, 16]} align="stretch">
      {list.map((budget) => (
        <LUICol key={budget.id} span={12} md={6} xl={4}>
          <BudgetCard
            budget={budget}
            progress={
              budget.active && spending.data
                ? budgetProgress(budget, spending.data, today, digits)
                : undefined
            }
            currency={currency}
            scope={scopeOf(budget, categoriesById)}
            icon={iconOf(budget, categoriesById)}
            onEdit={() => actions.edit(budget)}
            onPause={() => actions.pause(budget)}
            onResume={() => actions.resume(budget)}
            onDelete={() => actions.delete(budget)}
          />
        </LUICol>
      ))}
    </LUIRow>
  )

  return (
    <div className="budgets-page">
      <div className="budgets-page__header">
        <LUIBreadcrumb title="Budgets" />
        {all.length > 0 && addButton}
      </div>

      {all.length === 0 ? (
        <LUICard>
          <EmptyState
            icon="donut_large"
            title="No budgets yet"
            message="Set a limit for all your spending, or for categories such as Food or Transport, and see what's safe to spend each day."
          >
            {addButton}
          </EmptyState>
        </LUICard>
      ) : (
        <>
          {spending.isError && (
            <div className="alert error">{getErrorMessage(spending.error)}</div>
          )}

          {active.length > 0 ? (
            grid(active)
          ) : (
            <LUICard>
              <EmptyState
                icon="eye_slash"
                title="All your budgets are paused"
                message="Resume one from the paused list, or add a new budget."
              >
                {addButton}
              </EmptyState>
            </LUICard>
          )}

          {paused.length > 0 && (
            <LUIAccordion>
              <LUIAccordionItem title={`Paused (${paused.length})`}>{grid(paused)}</LUIAccordionItem>
            </LUIAccordion>
          )}
        </>
      )}
    </div>
  )
}
