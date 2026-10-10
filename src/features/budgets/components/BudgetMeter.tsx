import { LUIChip, LUIIcon } from '@lumen-ui/react'
import { Progress } from '@/components/progress'
import { formatMoney, formatPeriod } from '@/utils'
import type { BudgetProgress } from '../budget.domain'
import {
  BUDGET_STATES,
  PREVIOUS_PERIOD,
  daysLeftLabel,
  percentLabel,
} from '../budget.labels'
import type { BudgetPeriod } from '../budget.types'
import './BudgetMeter.scss'

interface BudgetMeterProps {
  progress: BudgetProgress
  currency: string
  period: BudgetPeriod
  /** The budget's name, for the bar's accessible label. */
  name: string
}

/**
 * A budget's current period at a glance: spent of limit, a bar, the state
 * with its icon, what's left, and what's safe to spend each day. With
 * rollover it says what came in from the period before.
 */
export const BudgetMeter = ({ progress, currency, period, name }: BudgetMeterProps) => {
  const state = BUDGET_STATES[progress.state]
  const money = (amount: number) => formatMoney(amount, currency)
  const previous = PREVIOUS_PERIOD[period]

  const remaining =
    progress.remaining < 0 ? `${money(-progress.remaining)} over` : `${money(progress.remaining)} left`

  const perDay =
    progress.safePerDay <= 0
      ? 'Nothing left to spend'
      : progress.daysLeft === 1
        ? `${money(progress.safePerDay)} to spend today`
        : `${money(progress.safePerDay)} a day to spend`

  const carry =
    progress.carry > 0
      ? `Includes ${money(progress.carry)} left over from ${previous}`
      : progress.carry < 0
        ? `${money(-progress.carry)} overspent ${previous} comes off this limit`
        : ''

  return (
    <div className="budget-meter">
      <div className="budget-meter__figures">
        <span className="budget-meter__spent">
          {money(progress.spent)}
          <span className="budget-meter__of"> of {money(progress.limit)}</span>
        </span>
        <span className="budget-meter__percent">{percentLabel(progress.percent)}</span>
      </div>

      {/* A zero limit has nothing left, so its bar reads full. */}
      <Progress value={progress.percent ?? 100} variant={state.progress} label={`${name} budget used`} />

      <div className="budget-meter__status">
        <LUIChip size="sm" variant={state.chip} className="budget-meter__state">
          <LUIIcon name={state.icon} size={14} color="inherit" />
          {state.label}
        </LUIChip>
        <span className={`budget-meter__remaining${progress.remaining < 0 ? ' is-over' : ''}`}>
          {remaining}
        </span>
      </div>

      <div className="budget-meter__details">
        <span>
          {formatPeriod(progress.range)} · {daysLeftLabel(progress.daysLeft)}
        </span>
        <span className="budget-meter__per-day">{perDay}</span>
      </div>

      {carry && <p className="budget-meter__carry">{carry}</p>}
    </div>
  )
}
