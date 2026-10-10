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
  /**
   * One id as a number, several as "4,7". The router writes a number-like
   * string with quotes, so a single id travels as a number to keep the URL
   * plain: `category=4`.
   */
  category?: number | string
  /** Accounts, written like `category`. */
  account?: number | string
}

/** An id list from the URL as `idsParamOf` wrote it, or undefined when malformed. */
export function parseIdsParam(value: unknown): number | string | undefined {
  if (typeof value === 'number') return Number.isInteger(value) && value > 0 ? value : undefined
  if (typeof value === 'string' && value !== '') return value
  return undefined
}

/** The ids an id-list param holds; anything that isn't a positive whole number is dropped. */
export function idsOf(param: number | string | undefined): number[] {
  return String(param ?? '')
    .split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
}

/** Ids as an id-list param: one as a number, several as "4,7", none as undefined. */
export function idsParamOf(ids: readonly number[] | undefined): number | string | undefined {
  if (!ids?.length) return undefined
  return ids.length === 1 ? ids[0] : ids.join(',')
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
  categoryIds?: readonly number[],
  accountIds?: readonly number[],
): TransactionSearch {
  const search: TransactionSearch = { from: range.start, to: range.end }
  if (type) search.type = type
  const category = idsParamOf(categoryIds)
  if (category !== undefined) search.category = category
  const account = idsParamOf(accountIds)
  if (account !== undefined) search.account = account
  return search
}
