import { Link } from '@tanstack/react-router'
import { LUIButton, LUIChip, LUIIcon, LUIMenu } from '@lumen-ui/react'
import { TransactionAmount } from '@/features/transactions/components/TransactionAmount'
import { TransactionIcon } from '@/features/transactions/components/TransactionIcon'
import { type RuleView, nextLabel } from '../recurring.labels'
import './RuleRow.scss'

interface RuleRowProps {
  view: RuleView
  today: string
  onEdit?: () => void
  onPause?: () => void
  onResume?: () => void
  onDelete?: () => void
}

/**
 * One rule on the Recurring page: what it adds, how often, from which
 * account, its amount and next date, and a menu with its actions. The name
 * links to the rule's page, and the link covers the row.
 */
export const RuleRow = ({ view, today, onEdit, onPause, onResume, onDelete }: RuleRowProps) => {
  const asksFirst = view.rule.mode === 'confirm'
  const missing = view.status === 'missing_account'

  const menuTrigger = (
    <LUIButton variant="ghost" size="lg" rounded aria-label={`Actions for ${view.name}`}>
      <LUIIcon name="more" color="inherit" />
    </LUIButton>
  )

  return (
    <div className="rule-row">
      <TransactionIcon row={view} size={40} />

      <div className="rule-row__text">
        <Link className="rule-row__link" to="/recurring/$ruleId" params={{ ruleId: String(view.id) }}>
          <span className="text-ellipsis">{view.name}</span>
        </Link>
        <span className="rule-row__caption">
          {view.schedule} · {view.accountLabel}
        </span>
        {(asksFirst || missing) && (
          <span className="rule-row__chips">
            {asksFirst && <LUIChip size="sm">Asks first</LUIChip>}
            {missing && (
              <LUIChip size="sm" variant="error">
                Account deleted
              </LUIChip>
            )}
          </span>
        )}
      </div>

      <span className="rule-row__end">
        <TransactionAmount kind={view.kind} amount={view.amount} currency={view.currency} />
        <span className="rule-row__next">{nextLabel(view, today)}</span>
      </span>

      <div className="rule-row__menu">
        <LUIMenu mode="right" closeOnItemClick appendBody dropdownDisplay={menuTrigger}>
          <button type="button" className="dropdown-item rule-row__item" onClick={onEdit}>
            <LUIIcon name="edit" size={18} />
            Edit
          </button>
          {/* An ended rule has nothing to pause: edit its end to run it again. */}
          {view.status !== 'ended' &&
            (view.rule.active ? (
              <button type="button" className="dropdown-item rule-row__item" onClick={onPause}>
                <LUIIcon name="eye_slash" size={18} />
                Pause
              </button>
            ) : (
              <button type="button" className="dropdown-item rule-row__item" onClick={onResume}>
                <LUIIcon name="eye" size={18} />
                Resume
              </button>
            ))}
          <button
            type="button"
            className="dropdown-item rule-row__item rule-row__item--danger"
            onClick={onDelete}
          >
            <LUIIcon name="trash" size={18} color="inherit" />
            Delete
          </button>
        </LUIMenu>
      </div>
    </div>
  )
}
