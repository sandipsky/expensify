import { type DateRange, isYmd, orderedRange } from '@/utils'
import { NO_FILTER, type TransactionFilter } from './transaction.domain'
import { TX_TYPES, type TxType } from './transaction.types'

/**
 * What a link into the list can preset, as the dashboard's drill-downs do:
 * the period, a type and categories.
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
  const { category } = search
  return {
    from,
    to,
    type: TX_TYPES.includes(type) ? type : undefined,
    category:
      (typeof category === 'number' && Number.isInteger(category) && category > 0) ||
      (typeof category === 'string' && category !== '')
        ? category
        : undefined,
  }
}

/** How the list starts from a link: the period to show and the filters already set. */
export interface ListStart {
  range: DateRange | null
  filter: TransactionFilter
}

export function listStartOf(search: TransactionSearch): ListStart {
  const categoryIds = String(search.category ?? '')
    .split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
  return {
    range: search.from && search.to ? orderedRange(search.from, search.to) : null,
    filter: { ...NO_FILTER, type: search.type ?? null, categoryIds },
  }
}

/** The search params that link to the list on the entries behind a figure. */
export function transactionSearchFor(
  range: DateRange,
  type?: TxType,
  categoryIds?: readonly number[],
): TransactionSearch {
  const search: TransactionSearch = { from: range.start, to: range.end }
  if (type) search.type = type
  if (categoryIds?.length === 1) search.category = categoryIds[0]
  else if (categoryIds?.length) search.category = categoryIds.join(',')
  return search
}
