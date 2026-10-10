import { Link } from '@tanstack/react-router'
import { LUIButton, LUICard } from '@lumen-ui/react'
import { EmptyState } from '@/components/empty-state'
import { useAccountActions } from '@/features/accounts/account.actions'
import { totalBalance } from '@/features/accounts/account.domain'
import { ACCOUNT_TYPE_LABELS, balanceView } from '@/features/accounts/account.labels'
import { AccountIcon } from '@/features/accounts/components/AccountIcon'
import type { Dashboard } from '../useDashboard'
import './BalancesCard.scss'

/**
 * The total of the accounts marked "include in total", then every active
 * account with its balance; cards and loans read as the amount owed. The
 * total opens Accounts and an account opens its page.
 */
export const BalancesCard = ({ dash }: { dash: Dashboard }) => {
  const actions = useAccountActions()
  const active = dash.accounts.filter((a) => !a.archived)
  const total = totalBalance(dash.accounts)

  /** "Across 3 accounts · 1 not included". */
  const excluded = active.filter((a) => !a.includeInTotal).length
  const included = active.length - excluded
  const note =
    `Across ${included} ${included === 1 ? 'account' : 'accounts'}` +
    (excluded ? ` · ${excluded} not included` : '')

  return (
    <LUICard
      className="dash-card"
      title="Balances"
      padding="none"
      extra={
        active.length > 0 && (
          <Link className="dash-link" to="/accounts">
            See all
          </Link>
        )
      }
    >
      {!active.length ? (
        <EmptyState
          icon="wallet"
          title={dash.accounts.length ? 'All your accounts are archived' : 'No accounts yet'}
          message="Add the places your money sits: cash, a bank account, a card or a mobile wallet."
        >
          <LUIButton size="lg" onClick={() => actions.create()}>
            Add an account
          </LUIButton>
        </EmptyState>
      ) : (
        <>
          <Link className="balances__total" to="/accounts">
            <span className="balances__label">Total balance</span>
            <span className={`balances__amount${total < 0 ? ' is-negative' : ''}`}>
              {dash.money(total)}
            </span>
            <span className="balances__note">{note}</span>
          </Link>

          <ul className="dash-list" aria-label="Accounts">
            {active.map((account) => {
              const view = balanceView(account)
              const type = ACCOUNT_TYPE_LABELS[account.type]
              return (
                <li key={account.id}>
                  <Link
                    className="balances__row"
                    to="/accounts/$accountId"
                    params={{ accountId: String(account.id) }}
                  >
                    <AccountIcon account={account} size={36} />
                    <span className="balances__text">
                      <span className="balances__name text-ellipsis">{account.name}</span>
                      <span className="balances__caption text-ellipsis">
                        {view.caption === 'Balance' ? type : `${type} · ${view.caption}`}
                      </span>
                    </span>
                    <span className={`balances__value${view.negative ? ' is-negative' : ''}`}>
                      {dash.money(view.amount)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </LUICard>
  )
}
