export const TX_TYPES = ['expense', 'income', 'transfer'] as const

export type TxType = (typeof TX_TYPES)[number]

export interface ITransaction {
  id: string
  type: TxType
  /** Positive; `type` gives the direction. */
  amount: number
  /** ISO 4217 code, the source account's. */
  currency: string
  /** Source account. */
  accountId: string
  /** Transfers only. */
  toAccountId: string | null
  /** Null for transfers. */
  categoryId: string | null
  /** The user's local date, `YYYY-MM-DD`. */
  date: string
  note: string | null
  /** The recurring rule that added it; null for an entry added by hand. */
  recurringRuleId?: string | null
  createdAt: string
  updatedAt: string
}

// What a form saves when creating/updating - transactions.api.ts sets the id,
// the currency (the account's), the rule that added it and the timestamps.
export type ITransactionBody = Omit<
  ITransaction,
  'id' | 'currency' | 'recurringRuleId' | 'createdAt' | 'updatedAt'
>

/** How the list is narrowed in the Firestore query: a date range, an account, or a rule. */
export interface TransactionQuery {
  from?: string
  to?: string
  /** Entries touching the account, on either side of a transfer. */
  accountId?: string
  /** Entries a recurring rule added. */
  recurringRuleId?: string
}
