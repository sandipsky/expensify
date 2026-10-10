/** One row of a chart's table view. */
export interface ChartTableRow {
  key: string
  /** Row header: the group or segment name. */
  name: string
  /** Formatted values, one per column. */
  cells: readonly string[]
  current: boolean
}

interface ChartTableProps {
  /** Accessible caption: the chart's label. */
  caption: string
  /** Value column headers, after the "Item" column. */
  columns: readonly string[]
  rows: readonly ChartTableRow[]
  /** Make each row header a button that calls `onRowClick` with the row key. */
  clickable?: boolean
  onRowClick?: (key: string) => void
}

/**
 * The table view of a chart: the same values as the plot, readable without
 * hovering. Value columns are right-aligned tabular numbers.
 */
export const ChartTable = ({ caption, columns, rows, clickable, onRowClick }: ChartTableProps) => (
  <div className="chart-table">
    <table>
      <caption className="visually-hidden">{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Item</th>
          {columns.map((column) => (
            <th key={column} scope="col" className="chart-table__num">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} aria-current={row.current ? 'true' : undefined}>
            <th scope="row">
              {clickable ? (
                <button type="button" className="chart-table__row-btn" onClick={() => onRowClick?.(row.key)}>
                  {row.name}
                </button>
              ) : (
                row.name
              )}
            </th>
            {row.cells.map((cell, i) => (
              <td key={i} className="chart-table__num">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
