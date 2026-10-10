import { Link } from '@tanstack/react-router'
import { LUIButton, LUICard, LUIIcon } from '@lumen-ui/react'
import { useRecurringActions } from '@/features/recurring/recurring.actions'
import { TransactionAmount } from '@/features/transactions/components/TransactionAmount'
import { TransactionIcon } from '@/features/transactions/components/TransactionIcon'
import { dueLabel } from '../dashboard.labels'
import type { Dashboard } from '../useDashboard'
import './UpcomingCard.scss'

/**
 * Recurring occurrences due now or in the next seven days: name, date and
 * amount, with Confirm and Skip on a due ask-first entry. A row opens the
 * rule. The page hides the card while there's nothing to show.
 */
export const UpcomingCard = ({ dash }: { dash: Dashboard }) => {
  const actions = useRecurringActions()

  return (
    <LUICard
      className="dash-card"
      title="Upcoming"
      padding="none"
      extra={
        <Link className="dash-link" to="/recurring">
          See all
        </Link>
      }
    >
      <ul className="dash-list" aria-label="Upcoming recurring entries">
        {dash.upcoming.map((row) => (
          <li key={row.key}>
            <Link className="upcoming__row" to="/recurring/$ruleId" params={{ ruleId: String(row.view.id) }}>
              <TransactionIcon row={row.view} size={36} />
              <span className="upcoming__text">
                <span className="upcoming__name text-ellipsis">{row.view.name}</span>
                <span className="upcoming__caption text-ellipsis">
                  {dueLabel(row.date, dash.today)} · {row.view.accountLabel}
                </span>
              </span>
              <TransactionAmount
                kind={row.view.kind}
                amount={row.view.amount}
                currency={row.view.currency}
                masked={dash.masked}
              />
            </Link>
            {row.due && row.view.rule.mode === 'confirm' && (
              <div className="upcoming__actions">
                <LUIButton size="lg" onClick={() => actions.confirm(row.view, row.date)}>
                  <LUIIcon name="add" color="inherit" />
                  Confirm
                </LUIButton>
                <LUIButton variant="outlined" size="lg" onClick={() => actions.skip(row.view, row.date)}>
                  Skip
                </LUIButton>
              </div>
            )}
          </li>
        ))}
      </ul>
    </LUICard>
  )
}
