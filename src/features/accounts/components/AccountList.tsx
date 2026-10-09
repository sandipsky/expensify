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
import { getApiErrorMessage } from '@/lib'
import { DEFAULT_CURRENCY, formatMoney } from '@/utils'
import { useAccountActions } from '../account.actions'
import { totalBalance } from '../account.domain'
import { useAccounts } from '../account.query'
import type { IAccount } from '../account.types'
import { AccountCard } from './AccountCard'
import './AccountList.scss'

/** `/accounts`: the total of included accounts, each account's balance, and archived ones. */
export const AccountList = () => {
  const { data: accounts, isLoading, isError, error } = useAccounts()
  const actions = useAccountActions()

  if (isLoading) {
    return (
      <div className="accounts-page">
        <LUIBreadcrumb title="Accounts" />
        <LUISkeleton height="104px" />
        <LUIRow gutter={[16, 16]} align="stretch">
          {[1, 2, 3].map((placeholder) => (
            <LUICol key={placeholder} span={12} md={6} xl={4}>
              <LUISkeleton height="148px" />
            </LUICol>
          ))}
        </LUIRow>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="accounts-page">
        <LUIBreadcrumb title="Accounts" />
        <div className="alert error">{getApiErrorMessage(error)}</div>
      </div>
    )
  }

  const all = accounts ?? []
  const active = all.filter((a) => !a.archived)
  const archived = all.filter((a) => a.archived)
  // Accounts share one currency until multi-currency exists.
  const currency = all[0]?.currency ?? DEFAULT_CURRENCY
  const total = totalBalance(all)
  const excluded = active.filter((a) => !a.includeInTotal).length
  const included = active.length - excluded
  const totalNote =
    `Across ${included} ${included === 1 ? 'account' : 'accounts'}` +
    (excluded ? ` · ${excluded} not included` : '')

  const addButton = (
    <LUIButton size="lg" onClick={actions.create}>
      <LUIIcon name="add" color="inherit" />
      Add account
    </LUIButton>
  )

  const grid = (list: IAccount[]) => (
    <LUIRow gutter={[16, 16]} align="stretch">
      {list.map((account) => (
        <LUICol key={account.id} span={12} md={6} xl={4}>
          <AccountCard
            account={account}
            onEdit={() => actions.edit(account)}
            onReconcile={() => actions.reconcile(account)}
            onArchive={() => actions.archive(account)}
            onRestore={() => actions.restore(account)}
            onDelete={() => actions.delete(account)}
          />
        </LUICol>
      ))}
    </LUIRow>
  )

  return (
    <div className="accounts-page">
      <div className="accounts-page__header">
        <LUIBreadcrumb title="Accounts" />
        {all.length > 0 && addButton}
      </div>

      {all.length === 0 ? (
        <LUICard>
          <EmptyState
            icon="wallet"
            title="No accounts yet"
            message="Add the places your money sits: cash, a bank account, a card or a mobile wallet."
          >
            {addButton}
          </EmptyState>
        </LUICard>
      ) : (
        <>
          <LUICard padding="lg">
            <div className="accounts-total">
              <span className="accounts-total__label">Total balance</span>
              <span className={`accounts-total__amount${total < 0 ? ' is-negative' : ''}`}>
                {formatMoney(total, currency)}
              </span>
              <span className="accounts-total__note">{totalNote}</span>
            </div>
          </LUICard>

          {active.length > 0 ? (
            grid(active)
          ) : (
            <LUICard>
              <EmptyState
                icon="box"
                title="All your accounts are archived"
                message="Restore one from the archived list, or add a new account."
              >
                {addButton}
              </EmptyState>
            </LUICard>
          )}

          {archived.length > 0 && (
            <LUIAccordion>
              <LUIAccordionItem title={`Archived (${archived.length})`}>
                {grid(archived)}
              </LUIAccordionItem>
            </LUIAccordion>
          )}
        </>
      )}
    </div>
  )
}
