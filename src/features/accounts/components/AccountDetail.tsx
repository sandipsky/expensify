import { useNavigate } from '@tanstack/react-router'
import {
  LUIButton,
  LUICard,
  LUIChip,
  LUICol,
  LUIIcon,
  LUIMenu,
  LUIRow,
  LUISkeleton,
} from '@lumen-ui/react'
import { EmptyState } from '@/components/empty-state'
import { Progress } from '@/components/progress'
import { AccountTransactions } from '@/features/transactions/components/AccountTransactions'
import { formatMoney } from '@/utils'
import { useAccountActions } from '../account.actions'
import { flipForLiability, isLiability } from '../account.domain'
import { ACCOUNT_TYPE_LABELS, balanceView, utilizationView } from '../account.labels'
import { useAccount } from '../account.query'
import type { IAccount } from '../account.types'
import { AccountIcon } from './AccountIcon'
import './AccountDetail.scss'

type AccountDetailProps = {
  accountId: string
}

const CURRENT_CAPTIONS = {
  Balance: 'Current balance',
  Owed: 'Amount owed',
  'In credit': 'In credit',
} as const

/** `/accounts/$accountId`: the account's figures and, once they exist, its transactions. */
export const AccountDetail = ({ accountId }: AccountDetailProps) => {
  const id = Number(accountId)
  const navigate = useNavigate()
  const account = useAccount(id)
  const actions = useAccountActions()

  const backToAccounts = () => navigate({ to: '/accounts' })

  if (account.isLoading) {
    return (
      <div className="account-page">
        <LUISkeleton height="56px" />
        <LUISkeleton height="104px" />
        <LUISkeleton height="240px" />
      </div>
    )
  }

  if (account.isError || !account.data) {
    return (
      <LUICard>
        <EmptyState
          icon="wallet"
          title="Account not found"
          message="It may have been deleted, perhaps on another device."
        >
          <LUIButton size="lg" onClick={backToAccounts}>
            Back to accounts
          </LUIButton>
        </EmptyState>
      </LUICard>
    )
  }

  return <AccountPage account={account.data} actions={actions} />
}

interface AccountPageProps {
  account: IAccount
  actions: ReturnType<typeof useAccountActions>
}

const AccountPage = ({ account, actions }: AccountPageProps) => {
  const navigate = useNavigate()
  const view = balanceView(account)
  const current = { ...view, caption: CURRENT_CAPTIONS[view.caption] }
  const opening = {
    caption: isLiability(account.type) ? 'Opening amount owed' : 'Opening balance',
    amount: flipForLiability(account.type, account.openingBalance),
  }
  const used = utilizationView(account)

  const remove = async () => {
    if (await actions.delete(account)) navigate({ to: '/accounts' })
  }

  const menuTrigger = (
    <LUIButton variant="ghost" size="lg" rounded aria-label="More actions">
      <LUIIcon name="more" color="inherit" />
    </LUIButton>
  )

  return (
    <div className="account-page">
      <div className="account-page__header">
        <LUIButton
          variant="ghost"
          size="lg"
          rounded
          aria-label="Back to accounts"
          onClick={() => navigate({ to: '/accounts' })}
        >
          <LUIIcon name="caret" className="rotate-180" color="inherit" />
        </LUIButton>

        <AccountIcon account={account} size={48} />

        <div className="account-page__title">
          <h1 className="text-ellipsis">{account.name}</h1>
          <div className="account-page__meta">
            <span>{ACCOUNT_TYPE_LABELS[account.type]}</span>
            {account.archived && <LUIChip size="sm">Archived</LUIChip>}
            {!account.includeInTotal && <LUIChip size="sm">Not in total</LUIChip>}
          </div>
        </div>

        <div className="account-page__actions">
          {account.archived ? (
            <LUIButton variant="outlined" size="lg" onClick={() => actions.restore(account)}>
              <LUIIcon name="undo" color="inherit" />
              Restore
            </LUIButton>
          ) : (
            <>
              <LUIButton variant="outlined" size="lg" onClick={() => actions.reconcile(account)}>
                <LUIIcon name="calculator" color="inherit" />
                Reconcile
              </LUIButton>
              <LUIButton variant="outlined" size="lg" onClick={() => actions.edit(account)}>
                <LUIIcon name="edit" color="inherit" />
                Edit
              </LUIButton>
            </>
          )}
          <LUIMenu mode="right" closeOnItemClick appendBody dropdownDisplay={menuTrigger}>
            {!account.archived && (
              <button
                type="button"
                className="dropdown-item account-page__item"
                onClick={() => actions.archive(account)}
              >
                <LUIIcon name="box" size={18} />
                Archive
              </button>
            )}
            <button
              type="button"
              className="dropdown-item account-page__item account-page__item--danger"
              onClick={remove}
            >
              <LUIIcon name="trash" size={18} color="inherit" />
              Delete
            </button>
          </LUIMenu>
        </div>
      </div>

      {account.archived && (
        <p className="alert warn">
          This account is archived, so it's hidden from pickers, the dashboard and your total
          balance. Restore it to use it again.
        </p>
      )}

      <LUIRow gutter={[16, 16]} align="stretch">
        <LUICol span={12} md={4}>
          <LUICard padding="lg" className="account-stat-card">
            <div className="account-stat">
              <span className="account-stat__label">{current.caption}</span>
              <span className={`account-stat__value${current.negative ? ' is-negative' : ''}`}>
                {formatMoney(current.amount, account.currency)}
              </span>
            </div>
          </LUICard>
        </LUICol>
        <LUICol span={12} md={4}>
          <LUICard padding="lg" className="account-stat-card">
            <div className="account-stat">
              <span className="account-stat__label">{opening.caption}</span>
              <span className="account-stat__value">
                {formatMoney(opening.amount, account.currency)}
              </span>
            </div>
          </LUICard>
        </LUICol>
        {used && (
          <LUICol span={12} md={4}>
            <LUICard padding="lg" className="account-stat-card">
              <div className="account-stat">
                <span className="account-stat__label">Credit limit</span>
                <span className="account-stat__value">
                  {formatMoney(account.creditLimit ?? 0, account.currency)}
                </span>
                <Progress value={used.percent} variant={used.variant} label="Credit used" />
                <span className="account-stat__label">{used.percent}% used</span>
              </div>
            </LUICard>
          </LUICol>
        )}
      </LUIRow>

      <AccountTransactions account={account} />
    </div>
  )
}
