import type { LUIIconName } from '@lumen-ui/react'

export const ACCOUNT_TYPES = [
  'cash',
  'bank',
  'credit_card',
  'wallet',
  'savings',
  'loan',
  'other',
] as const

export type AccountType = (typeof ACCOUNT_TYPES)[number]

export interface IAccount {
  id: number
  /** 1–40 characters. */
  name: string
  type: AccountType
  /** ISO 4217 code the amounts are in. */
  currency: string
  /** May be negative (cards, loans, overdrafts). */
  openingBalance: number
  /** Opening balance plus every transaction's effect; the server owns it. */
  currentBalance: number
  /** Credit cards only. */
  creditLimit: number | null
  icon: LUIIconName
  /** Hex color, e.g. `#2456E6`. */
  color: string
  includeInTotal: boolean
  archived: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// What the client sends when creating/updating - the server owns the id,
// the current balance, the archived flag, the sort order and the timestamps.
export type IAccountBody = Omit<
  IAccount,
  'id' | 'currentBalance' | 'archived' | 'sortOrder' | 'createdAt' | 'updatedAt'
>
