import { Link } from '@tanstack/react-router'
import { LUIButton, LUICard, LUIChip, LUIIcon, LUIMenu, LUISkeleton, type LUIIconName } from '@lumen-ui/react'
import { CategoryIcon } from '@/features/categories/components/CategoryIcon'
import { formatMoney } from '@/utils'
import type { BudgetProgress } from '../budget.domain'
import { BUDGET_PERIOD_LABELS, PER_PERIOD } from '../budget.labels'
import type { IBudget } from '../budget.types'
import { BudgetMeter } from './BudgetMeter'
import './BudgetCard.scss'

interface BudgetCardProps {
  budget: IBudget
  /** The current figures; a skeleton shows while they load. Paused budgets have none. */
  progress?: BudgetProgress
  currency: string
  /** "All expenses", or the categories it counts. */
  scope: string
  icon: { icon: LUIIconName; color: string }
  onEdit?: () => void
  onPause?: () => void
  onResume?: () => void
  onDelete?: () => void
}

/**
 * One budget on the Budgets page: name, what it counts, and its current
 * period, or just its limit while paused. The name links to the budget's
 * page and the link covers the whole card.
 */
export const BudgetCard = ({
  budget,
  progress,
  currency,
  scope,
  icon,
  onEdit,
  onPause,
  onResume,
  onDelete,
}: BudgetCardProps) => {
  const menuTrigger = (
    <LUIButton variant="ghost" size="lg" rounded aria-label={`Actions for ${budget.name}`}>
      <LUIIcon name="more" color="inherit" />
    </LUIButton>
  )

  return (
    <LUICard padding="lg" className="budget-card">
      <div className="budget-card__body">
        <div className="budget-card__head">
          <CategoryIcon category={icon} />

          <div className="budget-card__title">
            <Link
              className="budget-card__link text-ellipsis"
              to="/budgets/$budgetId"
              params={{ budgetId: String(budget.id) }}
            >
              {budget.name}
            </Link>
            <span className="budget-card__caption text-ellipsis">
              {BUDGET_PERIOD_LABELS[budget.period]} · {scope}
            </span>
          </div>

          <div className="budget-card__menu">
            <LUIMenu mode="right" closeOnItemClick appendBody dropdownDisplay={menuTrigger}>
              <button type="button" className="dropdown-item budget-card__item" onClick={onEdit}>
                <LUIIcon name="edit" size={18} />
                Edit
              </button>
              {budget.active ? (
                <button type="button" className="dropdown-item budget-card__item" onClick={onPause}>
                  <LUIIcon name="eye_slash" size={18} />
                  Pause
                </button>
              ) : (
                <button type="button" className="dropdown-item budget-card__item" onClick={onResume}>
                  <LUIIcon name="eye" size={18} />
                  Resume
                </button>
              )}
              <button
                type="button"
                className="dropdown-item budget-card__item budget-card__item--danger"
                onClick={onDelete}
              >
                <LUIIcon name="trash" size={18} color="inherit" />
                Delete
              </button>
            </LUIMenu>
          </div>
        </div>

        {!budget.active ? (
          <div className="budget-card__paused">
            <span>
              {formatMoney(budget.amount, currency)} {PER_PERIOD[budget.period]}
            </span>
            <LUIChip size="sm">Paused</LUIChip>
          </div>
        ) : progress ? (
          <BudgetMeter progress={progress} currency={currency} period={budget.period} name={budget.name} />
        ) : (
          <LUISkeleton height="92px" />
        )}
      </div>
    </LUICard>
  )
}
