import { formatMoney } from '@/utils'
import { TX_TYPE_LABELS } from '../transaction.labels'
import type { TxType } from '../transaction.types'
import './TransactionAmount.scss'

/** What every amount reads as in privacy mode. */
export const MASKED_AMOUNT = '••••'

interface TransactionAmountProps {
  kind: TxType
  /** Signed: − for an expense. Transfers read unsigned. */
  amount: number
  currency: string
  /** Larger figure for the detail page. */
  size?: 'md' | 'lg'
  /** Privacy mode: the amount reads as ••••, still in its color. */
  masked?: boolean
}

/**
 * A transaction's amount as lists show it: signed and in the income or
 * expense color, with a spoken type so it never relies on color alone.
 * Transfers read unsigned and neutral.
 */
export const TransactionAmount = ({
  kind,
  amount,
  currency,
  size = 'md',
  masked = false,
}: TransactionAmountProps) => (
  <span className={`tx-amount tx-amount--${size} is-${kind}`}>
    <span className="visually-hidden">{TX_TYPE_LABELS[kind]} </span>
    {masked ? MASKED_AMOUNT : formatMoney(amount, currency, kind === 'transfer' ? 'auto' : 'exceptZero')}
  </span>
)
