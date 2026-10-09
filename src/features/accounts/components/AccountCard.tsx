import { Link } from '@tanstack/react-router'
import { LUIButton, LUICard, LUIChip, LUIIcon, LUIMenu } from '@lumen-ui/react'
import { Progress } from '@/components/progress'
import { formatMoney } from '@/utils'
import { ACCOUNT_TYPE_LABELS, balanceView, utilizationView } from '../account.labels'
import type { IAccount } from '../account.types'
import { AccountIcon } from './AccountIcon'
import './AccountCard.scss'

interface AccountCardProps {
  account: IAccount
  onEdit?: () => void
  onReconcile?: () => void
  onArchive?: () => void
  onRestore?: () => void
  onDelete?: () => void
}

/**
 * One account on the Accounts page: icon, name, type and balance, the amount
 * owed and credit use for cards, and a menu with the account's actions. The
 * name links to the account page and the link covers the whole card.
 */
export const AccountCard = ({
  account,
  onEdit,
  onReconcile,
  onArchive,
  onRestore,
  onDelete,
}: AccountCardProps) => {
  const balance = balanceView(account)
  const used = utilizationView(account)

  const menuTrigger = (
    <LUIButton variant="ghost" size="lg" rounded aria-label={`Actions for ${account.name}`}>
      <LUIIcon name="more" color="inherit" />
    </LUIButton>
  )

  return (
    <LUICard padding="lg" className="account-card">
      <div className="account-card__body">
        <div className="account-card__head">
          <AccountIcon account={account} />

          <div className="account-card__title">
            <Link
              className="account-card__link text-ellipsis"
              to="/accounts/$accountId"
              params={{ accountId: String(account.id) }}
            >
              {account.name}
            </Link>
            <span className="account-card__type">{ACCOUNT_TYPE_LABELS[account.type]}</span>
          </div>

          <div className="account-card__menu">
            <LUIMenu mode="right" closeOnItemClick appendBody dropdownDisplay={menuTrigger}>
              {account.archived ? (
                <button type="button" className="dropdown-item account-card__item" onClick={onRestore}>
                  <LUIIcon name="undo" size={18} />
                  Restore
                </button>
              ) : (
                <>
                  <button type="button" className="dropdown-item account-card__item" onClick={onEdit}>
                    <LUIIcon name="edit" size={18} />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="dropdown-item account-card__item"
                    onClick={onReconcile}
                  >
                    <LUIIcon name="calculator" size={18} />
                    Reconcile
                  </button>
                  <button type="button" className="dropdown-item account-card__item" onClick={onArchive}>
                    <LUIIcon name="box" size={18} />
                    Archive
                  </button>
                </>
              )}
              <button
                type="button"
                className="dropdown-item account-card__item account-card__item--danger"
                onClick={onDelete}
              >
                <LUIIcon name="trash" size={18} color="inherit" />
                Delete
              </button>
            </LUIMenu>
          </div>
        </div>

        <div className="account-card__balance">
          <span className="account-card__caption">{balance.caption}</span>
          <span className={`account-card__amount${balance.negative ? ' is-negative' : ''}`}>
            {formatMoney(balance.amount, account.currency)}
          </span>
        </div>

        {used && (
          <div className="account-card__credit">
            <Progress value={used.percent} variant={used.variant} label="Credit used" />
            <span className="account-card__caption">
              {used.percent}% of {formatMoney(account.creditLimit ?? 0, account.currency)} limit
              used
            </span>
          </div>
        )}

        {(account.archived || !account.includeInTotal) && (
          <div className="account-card__chips">
            {account.archived && <LUIChip size="sm">Archived</LUIChip>}
            {!account.includeInTotal && <LUIChip size="sm">Not in total</LUIChip>}
          </div>
        )}
      </div>
    </LUICard>
  )
}
