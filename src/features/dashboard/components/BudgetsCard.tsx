import { Link } from '@tanstack/react-router'
import { LUIButton, LUICard, LUIChip, LUIIcon, LUISkeleton } from '@lumen-ui/react'
import { EmptyState } from '@/components/empty-state'
import { Progress } from '@/components/progress'
import { useBudgetActions } from '@/features/budgets/budget.actions'
import type { BudgetProgress } from '@/features/budgets/budget.domain'
import { BUDGET_STATES, iconOf, percentLabel } from '@/features/budgets/budget.labels'
import { CategoryIcon } from '@/features/categories/components/CategoryIcon'
import type { Dashboard } from '../useDashboard'
import './BudgetsCard.scss'

/**
 * Up to five active budgets, most used first: spent of limit, a bar, the
 * state with its icon and safe-to-spend per day. A budget opens its page;
 * "See all" opens Budgets when there are more.
 */
export const BudgetsCard = ({ dash }: { dash: Dashboard }) => {
  const actions = useBudgetActions()
  const rows = dash.budgetRows

  /** Remaining ÷ days left. */
  const perDay = (progress: BudgetProgress): string => {
    const { safePerDay, daysLeft } = progress
    if (safePerDay <= 0) return 'Nothing left to spend'
    const amount = dash.money(safePerDay)
    return daysLeft === 1 ? `${amount} to spend today` : `${amount} a day to spend`
  }

  return (
    <LUICard
      className="dash-card"
      title="Budgets"
      padding="none"
      extra={
        dash.moreBudgets && (
          <Link className="dash-link" to="/budgets">
            See all
          </Link>
        )
      }
    >
      {!rows.length ? (
        <EmptyState
          icon="donut_large"
          title={dash.budgets.length ? 'All your budgets are paused' : 'No budgets yet'}
          message="Set a limit for all your spending, or for categories such as Food or Transport, and see what's safe to spend each day."
        >
          <LUIButton size="lg" onClick={() => actions.create()}>
            Set a budget
          </LUIButton>
        </EmptyState>
      ) : (
        <ul className="dash-list" aria-label="Budgets">
          {rows.map(({ budget, progress }) => {
            const state = progress && BUDGET_STATES[progress.state]
            return (
              <li key={budget.id}>
                <Link
                  className="budgets__row"
                  to="/budgets/$budgetId"
                  params={{ budgetId: String(budget.id) }}
                >
                  <div className="budgets__head">
                    <CategoryIcon category={iconOf(budget, dash.lookups.categoriesById)} size={36} />
                    <span className="budgets__name text-ellipsis">{budget.name}</span>
                    {progress && (
                      <span className="budgets__figures">
                        <span>{dash.money(progress.spent)}</span>
                        <span className="budgets__of">of {dash.money(progress.limit)}</span>
                      </span>
                    )}
                  </div>
                  {progress && state ? (
                    <>
                      {/* A zero limit has nothing left, so its bar reads full. */}
                      <Progress
                        value={progress.percent ?? 100}
                        variant={state.progress}
                        label={`${budget.name} budget used`}
                      />
                      <div className="budgets__status">
                        <LUIChip size="sm" variant={state.chip} className="budgets__state">
                          <LUIIcon name={state.icon} size={14} color="inherit" />
                          {state.label}
                        </LUIChip>
                        <span className="budgets__percent">{percentLabel(progress.percent)}</span>
                        <span className="budgets__per-day">{perDay(progress)}</span>
                      </div>
                    </>
                  ) : (
                    <LUISkeleton height="44px" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </LUICard>
  )
}
