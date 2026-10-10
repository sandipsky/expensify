import type { CSSProperties } from 'react'

/** One line of a chart tooltip. */
export interface ChartTipRow {
  key: string
  color: string
  /** Formatted value: the strong, leading part of the line. */
  value: string
  label: string
}

interface ChartTipProps {
  /** The id the focused mark's `aria-describedby` points at. */
  id: string
  heading?: string
  rows: readonly ChartTipRow[]
  note?: string
  className?: string
  /** Where the chart puts it. */
  style?: CSSProperties
}

/**
 * Chart tooltip body: an optional heading, then per series a line key in the
 * series color, the value (strong) and the series label (secondary), then an
 * optional note. The chart positions it.
 */
export const ChartTip = ({ id, heading, rows, note, className, style }: ChartTipProps) => (
  <div id={id} role="tooltip" className={`chart-tip${className ? ` ${className}` : ''}`} style={style}>
    {heading && <div className="chart-tip__title">{heading}</div>}
    {rows.map((row) => (
      <div key={row.key} className="chart-tip__row">
        <span className="chart-tip__key" style={{ background: row.color }} />
        <strong>{row.value}</strong>
        <span>{row.label}</span>
      </div>
    ))}
    {note && <div className="chart-tip__note">{note}</div>}
  </div>
)
