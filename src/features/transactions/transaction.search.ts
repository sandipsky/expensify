import { type DateRange, isYmd, orderedRange } from '@/utils'
import { NO_FILTER, type TransactionFilter } from './transaction.domain'
import { TX_TYPES, type TxType } from './transaction.types'

/**
 * What a link into the list can preset, as the dashboard's and the reports'
 * drill-downs do: the period, a type, categories and accounts.
 */
export interface TransactionSearch {
  from?: string
  to?: string
  type?: TxType
  /** One category id, or several as "id1,id2". */
  category?: string
  /** Accounts, written like `category`. */
  account?: string
}

/** What a document id can be in a link: letters and digits, as Firestore's auto ids are. */
const ID = /^[A-Za-z0-9]{1,64}$/

/** An id list from the URL as `idsParamOf` wrote it, or undefined when malformed. */
export function parseIdsParam(value: unknown): string | undefined {
  // The router reads a value that looks like a number as one.
  const text = typeof value === 'number' ? String(value) : value
  return typeof text === 'string' && text !== '' ? text : undefined
}

/** The ids an id-list param holds; anything that can't be an id is dropped. */
export function idsOf(param: string | undefined): string[] {
  return (param ?? '').split(',').filter((id) => ID.test(id))
}

/** Ids as an id-list param: "id1,id2", or undefined for none. */
export function idsParamOf(ids: readonly string[] | undefined): string | undefined {
  return ids?.length ? ids.join(',') : undefined
}

/**
 * The URL's search params as the list reads them. Every key is set, as
 * `undefined` when malformed: the router merges the layout route's raw
 * search underneath, so a key left out would let the raw value through.
 */
export function parseTransactionSearch(search: Record<string, unknown>): TransactionSearch {
  const [from, to] =
    isYmd(search.from) && isYmd(search.to) ? [search.from, search.to] : [undefined, undefined]
  const type = search.type as TxType
  return {
    from,
    to,
    type: TX_TYPES.includes(type) ? type : undefined,
    category: parseIdsParam(search.category),
    account: parseIdsParam(search.account),
  }
}

/** How the list starts from a link: the period to show and the filters already set. */
export interface ListStart {
  range: DateRange | null
  filter: TransactionFilter
}

export function listStartOf(search: TransactionSearch): ListStart {
  return {
    range: search.from && search.to ? orderedRange(search.from, search.to) : null,
    filter: {
      ...NO_FILTER,
      type: search.type ?? null,
      categoryIds: idsOf(search.category),
      accountIds: idsOf(search.account),
    },
  }
}

/** The search params that link to the list on the entries behind a figure. */
export function transactionSearchFor(
  range: DateRange,
  type?: TxType,
  categoryIds?: readonly string[],
  accountIds?: readonly string[],
): TransactionSearch {
  const search: TransactionSearch = { from: range.start, to: range.end }
  if (type) search.type = type
  const category = idsParamOf(categoryIds)
  if (category !== undefined) search.category = category
  const account = idsParamOf(accountIds)
  if (account !== undefined) search.account = account
  return search
}
