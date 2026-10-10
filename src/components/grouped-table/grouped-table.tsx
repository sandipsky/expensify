import { Children, isValidElement, useState, type KeyboardEvent, type Key, type ReactNode } from 'react'
import {
  LUITableCell,
  type LUITableCellProps,
  type TableCellContext,
  type TableColumn,
  type TableSort,
} from '@lumen-ui/react'
import './grouped-table.scss'

/** What a group's header row shows: a label, and optionally cells under given columns. */
export interface GroupHeader {
  /** Spans the columns before the first entry in `cells`, or the whole row without any. */
  label: ReactNode
  /** Drawn under the column of the same key, such as a day's total under its Amount column. */
  cells?: Partial<Record<string, ReactNode>>
}

export interface GroupedTableProps<T extends object> {
  columns: readonly TableColumn[]
  data: readonly T[]
  /** Row identity: a property name or a function. */
  rowKey: (keyof T & string) | ((row: T) => Key)
  /** Active sort; leave it out and the table keeps its own. `null` means unsorted. */
  sort?: TableSort | null
  onSortChange?: (sort: TableSort | null) => void
  onRowClick?: (row: T) => void
  /** Puts a header row above each run of rows sharing this key, while the table is unsorted. */
  groupBy?: (keyof T & string) | ((row: T) => unknown)
  /** The header row of a group, given its key and rows. Needed for groups to show. */
  renderGroup?: (key: unknown, rows: readonly T[]) => GroupHeader
  /** `LUITableCell` elements declaring custom cell renderers, as `LUITable` takes them. */
  children?: ReactNode
}

/** One rendered body row: a group header or a data row. */
type Entry<T> =
  | { kind: 'group'; key: unknown; rows: T[]; index: number }
  | { kind: 'row'; row: T; index: number }

/** Nulls last, numbers by value, everything else as text with numbers in order. */
function compare(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

const alignClass = (column: TableColumn) =>
  column.align === 'right' ? 'text-end' : column.align === 'center' ? 'text-center' : undefined

/**
 * `LUITable` with groups: the same markup, classes, sorting and cell
 * renderers, plus a header row above each run of rows that share a key (a
 * date, say), as expensify-web's table draws them. Groups show while the
 * table is unsorted; sorting by a column lists the rows on their own, and
 * clearing the sort brings the groups back. Header clicks cycle ascending,
 * descending, unsorted.
 */
export function GroupedTable<T extends object>({
  columns,
  data,
  rowKey,
  sort: sortProp,
  onSortChange,
  onRowClick,
  groupBy,
  renderGroup,
  children,
}: GroupedTableProps<T>) {
  const [ownSort, setOwnSort] = useState<TableSort | null>(null)
  const sort = sortProp === undefined ? ownSort : sortProp

  const renderers = new Map<string, LUITableCellProps<T>['children']>()
  Children.forEach(children, (child) => {
    if (isValidElement<LUITableCellProps<T>>(child) && child.type === LUITableCell) {
      renderers.set(child.props.column, child.props.children)
    }
  })

  const keyOfRow = (row: T): Key =>
    typeof rowKey === 'function' ? rowKey(row) : (row[rowKey] as Key)

  const valueOf = (row: T, key: string): unknown => (row as Record<string, unknown>)[key]

  let rows: readonly T[] = data
  if (sort) {
    const factor = sort.direction === 'asc' ? 1 : -1
    rows = [...data].sort((a, b) => compare(valueOf(a, sort.key), valueOf(b, sort.key)) * factor)
  }

  // Data rows, with a header before each group while grouped and unsorted.
  const entries: Entry<T>[] = []
  const grouped = !!groupBy && !!renderGroup && !sort
  const groupKeyOf = (row: T): unknown =>
    typeof groupBy === 'function' ? groupBy(row) : groupBy ? valueOf(row, groupBy) : undefined
  let header: Extract<Entry<T>, { kind: 'group' }> | null = null
  for (const [index, row] of rows.entries()) {
    if (grouped) {
      const key = groupKeyOf(row)
      if (!header || header.key !== key) {
        header = { kind: 'group', key, rows: [], index }
        entries.push(header)
      }
      header.rows.push(row)
    }
    entries.push({ kind: 'row', row, index })
  }

  const toggleSort = (column: TableColumn) => {
    if (!column.sortable) return
    const next: TableSort | null =
      !sort || sort.key !== column.key
        ? { key: column.key, direction: 'asc' }
        : sort.direction === 'asc'
          ? { key: column.key, direction: 'desc' }
          : null
    setOwnSort(next)
    onSortChange?.(next)
  }

  const onHeaderKeyDown = (event: KeyboardEvent, column: TableColumn) => {
    if (column.sortable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      toggleSort(column)
    }
  }

  const direction = (column: TableColumn) =>
    sort && sort.key === column.key ? sort.direction : 'none'

  const headerClass = (column: TableColumn) =>
    [column.sortable ? `sort-by ${direction(column)}` : '', alignClass(column) ?? '']
      .filter(Boolean)
      .join(' ') || undefined

  const ariaSort = (column: TableColumn) => {
    if (!column.sortable) return undefined
    const d = direction(column)
    return d === 'asc' ? 'ascending' : d === 'desc' ? 'descending' : 'none'
  }

  const groupRow = (entry: Extract<Entry<T>, { kind: 'group' }>) => {
    const { label, cells = {} } = renderGroup!(entry.key, entry.rows)
    const first = columns.findIndex((column) => cells[column.key] !== undefined)
    const span = first === -1 ? columns.length : Math.max(1, first)
    return (
      <tr key={`group:${String(entry.key)}:${entry.index}`} className="l-table__group">
        <th scope="colgroup" colSpan={span}>
          {label}
        </th>
        {first !== -1 &&
          columns.slice(span).map((column) => (
            <td key={column.key} className={alignClass(column)}>
              {cells[column.key]}
            </td>
          ))}
      </tr>
    )
  }

  return (
    <div className="table-responsive">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={headerClass(column)}
                style={column.width ? { width: column.width } : undefined}
                tabIndex={column.sortable ? 0 : undefined}
                aria-sort={ariaSort(column)}
                onClick={() => toggleSort(column)}
                onKeyDown={(event) => onHeaderKeyDown(event, column)}
              >
                <span className="th-label">{column.header}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) =>
            entry.kind === 'group' ? (
              groupRow(entry)
            ) : (
              <tr key={keyOfRow(entry.row)} onClick={() => onRowClick?.(entry.row)}>
                {columns.map((column) => {
                  const render = renderers.get(column.key)
                  const value = valueOf(entry.row, column.key)
                  const context: TableCellContext<T> = {
                    row: entry.row,
                    value,
                    column,
                    index: entry.index,
                  }
                  return (
                    <td key={column.key} className={alignClass(column)}>
                      {render ? render(context) : (value as ReactNode)}
                    </td>
                  )
                })}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  )
}
