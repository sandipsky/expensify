import type { ReactNode } from 'react'
import './ReportTable.scss'

export interface ReportColumn<T> {
  key: string
  header: ReactNode
  /** Amounts and counts line up on the right. */
  numeric?: boolean
  /** The cell. The first column's cell is the row's header, and its button when rows open. */
  cell: (row: T) => ReactNode
  /** The totals row's cell; the row shows when any column has one. */
  total?: ReactNode
}

interface ReportTableProps<T> {
  /** What the table lists, for screen readers. */
  caption: string
  columns: readonly ReportColumn<T>[]
  rows: readonly T[]
  rowKey: (row: T) => string | number
  /** Opens a row: the whole row is clickable and its first cell becomes a button. */
  onRowClick?: ((row: T) => void) | null
  /** Whether a row opens; all of them do when left out. */
  canOpen?: (row: T) => boolean
  /** Marks a row, such as the selected one. */
  isCurrent?: (row: T) => boolean
  /** Dims a row, such as a period from before a budget started. */
  isMuted?: (row: T) => boolean
}

/**
 * A report's table: a plain `<table>` with right-aligned tabular numbers, a
 * totals row and, when rows open something, a button in each row's first
 * cell so the keyboard can reach it. Wide tables scroll sideways inside
 * their card with the first column pinned.
 */
export function ReportTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  onRowClick = null,
  canOpen = () => true,
  isCurrent,
  isMuted,
}: ReportTableProps<T>) {
  const totals = columns.some((c) => c.total !== undefined)
  const numClass = (column: ReportColumn<T>) => (column.numeric ? 'report-table__num' : undefined)

  return (
    <div className="report-table">
      <table>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={numClass(column)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const open = onRowClick && canOpen(row) ? () => onRowClick(row) : undefined
            const className = [open ? 'is-clickable' : '', isMuted?.(row) ? 'is-muted' : '']
              .filter(Boolean)
              .join(' ')
            return (
              <tr
                key={rowKey(row)}
                className={className || undefined}
                aria-current={isCurrent?.(row) ? 'true' : undefined}
                onClick={open}
              >
                {columns.map((column, i) =>
                  i === 0 ? (
                    <th key={column.key} scope="row" className={numClass(column)}>
                      {open ? (
                        <button
                          type="button"
                          className="report-table__open"
                          onClick={(event) => {
                            // The row handles the click; this keeps it from firing twice.
                            event.stopPropagation()
                            open()
                          }}
                        >
                          {column.cell(row)}
                        </button>
                      ) : (
                        column.cell(row)
                      )}
                    </th>
                  ) : (
                    <td key={column.key} className={numClass(column)}>
                      {column.cell(row)}
                    </td>
                  ),
                )}
              </tr>
            )
          })}
        </tbody>
        {totals && (
          <tfoot>
            <tr>
              {columns.map((column, i) =>
                i === 0 ? (
                  <th key={column.key} scope="row" className={numClass(column)}>
                    {column.total ?? 'Total'}
                  </th>
                ) : (
                  <td key={column.key} className={numClass(column)}>
                    {column.total}
                  </td>
                ),
              )}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
