import type { LUIIconName } from '@lumen-ui/react'
import type { IAccount } from '@/features/accounts/account.types'
import type { ICategory } from '@/features/categories/category.types'
import { PERIOD_PRESETS, type PeriodPreset, formatDate } from '@/utils'
import { isUpcoming } from './transaction.domain'
import { TX_TYPES, type ITransaction, type TxType } from './transaction.types'

export const TX_TYPE_LABELS: Readonly<Record<TxType, string>> = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
}

/** Items for the type segmented control: Expense first, the default. */
export const TX_TYPE_OPTIONS = TX_TYPES.map((value) => ({ value, label: TX_TYPE_LABELS[value] }))

export const PERIOD_LABELS: Readonly<Record<PeriodPreset, string>> = {
  this_month: 'This month',
  last_month: 'Last month',
  this_year: 'This year',
  custom: 'Custom',
}

/** Items for the period switcher. */
export const PERIOD_OPTIONS = PERIOD_PRESETS.map((value) => ({
  value,
  label: PERIOD_LABELS[value],
}))

/** "1 transaction", "12 transactions". */
export function entries(count: number): string {
  return `${count} ${count === 1 ? 'transaction' : 'transactions'}`
}

/** What a transfer's badge draws, since a transfer has no category. */
export const TRANSFER_ICON: LUIIconName = 'refresh'

/** What an entry whose category no longer exists draws. */
export const MISSING_CATEGORY_ICON: LUIIconName = 'help'

/** Names the rows need, looked up by id. */
export interface TxLookups {
  accountsById: ReadonlyMap<number, IAccount>
  categoriesById: ReadonlyMap<number, ICategory>
  today: string
}

/** One transaction as lists show it. */
export interface TxRow {
  id: number
  tx: ITransaction
  date: string
  /** "Sat, 26 Sep 2026". */
  dateLabel: string
  /** The note, when there is one. */
  note: string
  /** The note, else the category, else the type: what a row is called. */
  title: string
  /** The category's name; "Transfer" for transfers; a stand-in when it's gone. */
  categoryLabel: string
  /** "Cash", or "Bank → Cash" for a transfer. */
  accountLabel: string
  /** The category's icon and color, or neutral ones for transfers and missing categories. */
  icon: LUIIconName
  color: string | null
  kind: TxType
  /** + for income, − for expense, unsigned for a transfer. */
  amount: number
  currency: string
  /** Future-dated. */
  upcoming: boolean
}

export function accountName(lookups: TxLookups, id: number | null): string {
  return (id !== null && lookups.accountsById.get(id)?.name) || 'Deleted account'
}

/** Archived categories still name their entries. */
export function categoryOf(
  lookups: TxLookups,
  tx: Pick<ITransaction, 'type' | 'categoryId'>,
): { name: string; icon: LUIIconName; color: string | null } {
  if (tx.type === 'transfer') return { name: TX_TYPE_LABELS.transfer, icon: TRANSFER_ICON, color: null }
  const category = tx.categoryId !== null ? lookups.categoriesById.get(tx.categoryId) : undefined
  if (category) return { name: category.name, icon: category.icon, color: category.color }
  return { name: 'Deleted category', icon: MISSING_CATEGORY_ICON, color: null }
}

export function toRow(tx: ITransaction, lookups: TxLookups): TxRow {
  const account = accountName(lookups, tx.accountId)
  const category = categoryOf(lookups, tx)
  const transfer = tx.type === 'transfer'
  const note = tx.note?.trim() ?? ''
  return {
    id: tx.id,
    tx,
    date: tx.date,
    dateLabel: formatDate(tx.date),
    note,
    title: note || category.name,
    categoryLabel: category.name,
    accountLabel: transfer ? `${account} → ${accountName(lookups, tx.toAccountId)}` : account,
    icon: category.icon,
    color: category.color,
    kind: tx.type,
    amount: tx.type === 'expense' ? -tx.amount : tx.amount,
    currency: tx.currency,
    upcoming: isUpcoming(tx, lookups.today),
  }
}

/** The text the search box looks through: note, category and account names. */
export function searchTextOf(tx: ITransaction, lookups: TxLookups): string {
  const row = toRow(tx, lookups)
  return [row.note, row.categoryLabel, row.accountLabel].join('\n')
}
