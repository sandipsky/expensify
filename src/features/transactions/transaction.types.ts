export const TX_TYPES = ['expense', 'income', 'transfer'] as const

export type TxType = (typeof TX_TYPES)[number]

export interface ITransaction {
  id: number
  type: TxType
  /** Positive; `type` gives the direction. */
  amount: number
  /** ISO 4217 code, the source account's. */
  currency: string
  /** Source account. */
  accountId: number
  /** Transfers only. */
  toAccountId: number | null
  /** Null for transfers. */
  categoryId: number | null
  /** The user's local date, `YYYY-MM-DD`. */
  date: string
  note: string | null
  createdAt: string
  updatedAt: string
}

// What the client sends when creating/updating - the server owns the id,
// the currency (the account's) and the timestamps.
export type ITransactionBody = Omit<ITransaction, 'id' | 'currency' | 'createdAt' | 'updatedAt'>

/** How the list is narrowed on the server: a date range, an account, or both. */
export interface TransactionQuery {
  from?: string
  to?: string
  /** Entries touching the account, on either side of a transfer. */
  accountId?: number
}
