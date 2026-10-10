import { LUIButton, LUIChip, LUIIcon, LUIMenu } from '@lumen-ui/react'
import type { TxRow } from '../transaction.labels'
import { TransactionAmount } from './TransactionAmount'
import { TransactionIcon } from './TransactionIcon'
import './TransactionRow.scss'

interface TransactionRowProps {
  row: TxRow
  onOpen?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

/**
 * One transaction in the phone and tablet list: category icon, the note or
 * category, a line of detail, the signed amount and a menu with its actions.
 * Tapping the row opens it.
 */
export const TransactionRow = ({ row, onOpen, onEdit, onDelete }: TransactionRowProps) => {
  // With a note on top, the category goes in the detail line; otherwise it's already the title.
  const subtitle = row.note ? `${row.categoryLabel} · ${row.accountLabel}` : row.accountLabel

  const menuTrigger = (
    <LUIButton variant="ghost" size="lg" rounded aria-label={`Actions for ${row.title}`}>
      <LUIIcon name="more" color="inherit" />
    </LUIButton>
  )

  return (
    <div className="tx-row">
      <button type="button" className="tx-row__main" onClick={onOpen}>
        <TransactionIcon row={row} size={36} />
        <span className="tx-row__text">
          <span className="tx-row__title">
            <span className="text-ellipsis">{row.title}</span>
            {row.upcoming && (
              <LUIChip size="sm" variant="info">
                Upcoming
              </LUIChip>
            )}
          </span>
          <span className="tx-row__subtitle text-ellipsis">{subtitle}</span>
        </span>
        <TransactionAmount kind={row.kind} amount={row.amount} currency={row.currency} />
      </button>

      <LUIMenu mode="right" closeOnItemClick appendBody dropdownDisplay={menuTrigger}>
        <button type="button" className="dropdown-item tx-row__item" onClick={onEdit}>
          <LUIIcon name="edit" size={18} />
          Edit
        </button>
        <button
          type="button"
          className="dropdown-item tx-row__item tx-row__item--danger"
          onClick={onDelete}
        >
          <LUIIcon name="trash" size={18} color="inherit" />
          Delete
        </button>
      </LUIMenu>
    </div>
  )
}
