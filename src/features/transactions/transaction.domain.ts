// Transaction rules: pure functions shared by the form, the list, the detail
// page and the export, and later the dashboard and reports.
import type { ITransaction, ITransactionBody, TxType } from './transaction.types'

/** Longest note. */
export const MAX_NOTE_LENGTH = 500

/** Where this device remembers the account the last entry used. */
const LAST_ACCOUNT_KEY = 'expensify.last-account'

/**
 * Newest first: by date, then creation. Entries created later on the same
 * day come first, so a new entry tops today's list.
 */
export function compareNewestFirst(
  a: Pick<ITransaction, 'date' | 'createdAt' | 'id'>,
  b: Pick<ITransaction, 'date' | 'createdAt' | 'id'>,
): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1
  return b.id - a.id
}

/** Dated after today: it already counts in balances and shows as "Upcoming". */
export function isUpcoming(tx: Pick<ITransaction, 'date'>, today: string): boolean {
  return tx.date > today
}

/** The fields a transaction is written with, for an edit to start from or a duplicate to copy. */
export function toBody(tx: ITransaction): ITransactionBody {
  return {
    type: tx.type,
    amount: tx.amount,
    accountId: tx.accountId,
    toAccountId: tx.toAccountId,
    categoryId: tx.categoryId,
    date: tx.date,
    note: tx.note,
  }
}

/** The two accounts a transfer touches, or the one account otherwise. */
export function accountIdsOf(tx: Pick<ITransaction, 'accountId' | 'toAccountId'>): number[] {
  return tx.toAccountId !== null ? [tx.accountId, tx.toAccountId] : [tx.accountId]
}

export interface Totals {
  income: number
  expense: number
  /** Income − expense. */
  net: number
}

/** Income, expense and net. Transfers only move money, so they don't count. */
export function totalsOf(txs: readonly Pick<ITransaction, 'type' | 'amount'>[]): Totals {
  let income = 0
  let expense = 0
  for (const tx of txs) {
    if (tx.type === 'income') income += tx.amount
    else if (tx.type === 'expense') expense += tx.amount
  }
  return { income, expense, net: income - expense }
}

export interface DayGroup<T> {
  date: string
  items: T[]
}

/** Items already sorted newest first, grouped into runs of the same date. */
export function groupByDay<T extends { date: string }>(items: readonly T[]): DayGroup<T>[] {
  const days: DayGroup<T>[] = []
  for (const item of items) {
    const last = days[days.length - 1]
    if (last?.date === item.date) last.items.push(item)
    else days.push({ date: item.date, items: [item] })
  }
  return days
}

/** What the list shows of a period. Every part narrows the result. */
export interface TransactionFilter {
  type: TxType | null
  /** Entries touching any of these accounts, on either side of a transfer. */
  accountIds: readonly number[]
  /** Entries in any of these categories. */
  categoryIds: readonly number[]
  /** Inclusive bounds on `amount`. */
  minAmount: number | null
  maxAmount: number | null
  /** Words to find in the note; every word must match. */
  search: string
}

export const NO_FILTER: TransactionFilter = {
  type: null,
  accountIds: [],
  categoryIds: [],
  minAmount: null,
  maxAmount: null,
  search: '',
}

/** How many filters are set, not counting the search box. */
export function activeFilterCount(filter: TransactionFilter): number {
  return (
    (filter.type ? 1 : 0) +
    filter.accountIds.length +
    filter.categoryIds.length +
    (filter.minAmount !== null || filter.maxAmount !== null ? 1 : 0)
  )
}

/** Whether every word of `search` appears in the text, ignoring case. */
export function matchesSearch(text: string, search: string): boolean {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const haystack = text.toLowerCase()
  return words.every((word) => haystack.includes(word))
}

/**
 * The entries that pass every part of the filter, in their original order.
 * The search looks at the note and at the names `searchText` gives an entry,
 * so a category or account name finds its entries too.
 */
export function filterTransactions<T extends ITransaction>(
  txs: readonly T[],
  filter: TransactionFilter,
  searchText: (tx: T) => string = (tx) => tx.note ?? '',
): T[] {
  const accounts = new Set(filter.accountIds)
  const categories = new Set(filter.categoryIds)
  return txs.filter((tx) => {
    if (filter.type && tx.type !== filter.type) return false
    if (accounts.size && !accountIdsOf(tx).some((id) => accounts.has(id))) return false
    if (categories.size && (tx.categoryId === null || !categories.has(tx.categoryId))) return false
    if (filter.minAmount !== null && tx.amount < filter.minAmount) return false
    if (filter.maxAmount !== null && tx.amount > filter.maxAmount) return false
    return matchesSearch(searchText(tx), filter.search)
  })
}

/** The account this device last saved an entry on, if storage allows. */
export function readLastAccountId(): number | null {
  try {
    const value = Number(localStorage.getItem(LAST_ACCOUNT_KEY))
    return Number.isInteger(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

export function writeLastAccountId(id: number): void {
  try {
    localStorage.setItem(LAST_ACCOUNT_KEY, String(id))
  } catch {
    // Storage blocked: the next entry starts on the first account instead.
  }
}

/**
 * The account a new entry starts on: the one this device used last while
 * it's still active, otherwise the first active account.
 */
export function defaultAccountId(
  accounts: readonly { id: number; archived: boolean }[],
  last: number | null = readLastAccountId(),
): number | null {
  const active = accounts.filter((a) => !a.archived)
  return (active.find((a) => a.id === last) ?? active[0])?.id ?? null
}
