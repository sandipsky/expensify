import { useId, useState, type CSSProperties, type ReactNode } from 'react'
import {
  type BarChartGroup,
  type ChartFormat,
  type ChartSeries,
  defaultChartFormat,
  niceTicks,
} from './chart'
import { ChartTable, type ChartTableRow } from './chart-table'
import { ChartTip, type ChartTipRow } from './chart-tip'
import { ChartToggle } from './chart-toggle'
import './chart.scss'

/** A group ready to draw: formatted values and bar heights as % of the top tick. */
interface BarRow {
  group: BarChartGroup
  name: string
  aria: string
  bars: (ChartTipRow & { pct: number })[]
}

export interface BarChartProps {
  /** X positions, left to right. */
  groups: readonly BarChartGroup[]
  /** Bars within each group, in this order. */
  series: readonly ChartSeries[]
  /** Formats values in the tooltip, the table and (unless `tickFormat` is set) the y-axis. */
  format?: ChartFormat
  /** Formats y-axis tick labels; falls back to `format`. */
  tickFormat?: ChartFormat | null
  /** Accessible name of the chart and caption of the table view. */
  label: string
  /** Plot height in px, excluding the x-axis label band below it. */
  height?: number
  /** Key of the highlighted group. */
  selected?: string | null
  /** Make each group (and each table row) a button that calls `onGroupClick`. */
  clickable?: boolean
  /** Show the table view instead of the plot; uncontrolled when left out. */
  showTable?: boolean
  onShowTableChange?: (show: boolean) => void
  /**
   * Offer the "Table" toggle. Turn it off only where the page already shows
   * the same figures in a table of its own.
   */
  tableToggle?: boolean
  onGroupClick?: (group: BarChartGroup) => void
}

/**
 * Grouped column chart: one column per group (x position), one bar per series
 * inside it. HTML/CSS layout, so it fills its container and adapts with
 * container queries.
 *
 * A legend appears for two or more series. Hover or focus shows one tooltip
 * listing every series; the "Table" toggle swaps the plot for an equivalent
 * `<table>`, so no value is reachable only by hovering.
 */
export const BarChart = ({
  groups,
  series,
  format = defaultChartFormat,
  tickFormat = null,
  label,
  height = 200,
  selected = null,
  clickable = false,
  showTable: showTableProp,
  onShowTableChange,
  tableToggle = true,
  onGroupClick,
}: BarChartProps) => {
  const tipId = useId()
  const [hover, setHover] = useState<number | null>(null)
  const [focus, setFocus] = useState<number | null>(null)
  const [showTableState, setShowTableState] = useState(false)
  const showTable = showTableProp ?? showTableState
  const setShowTable = (show: boolean) => {
    setShowTableState(show)
    onShowTableChange?.(show)
  }

  let max = 0
  for (const group of groups) {
    for (const s of series) max = Math.max(max, group.values[s.key] ?? 0)
  }
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1]
  const formatTick = tickFormat ?? format

  const rows: BarRow[] = groups.map((group) => {
    const name = group.title ?? group.label
    const bars = series.map((s) => {
      const value = group.values[s.key] ?? 0
      return {
        key: s.key,
        label: s.label,
        color: s.color,
        value: format(value),
        pct: value > 0 ? (value / top) * 100 : 0,
      }
    })
    const aria = `${name}: ${bars.map((b) => `${b.label} ${b.value}`).join(', ')}`
    return { group, name, aria, bars }
  })

  const tableRows: ChartTableRow[] = rows.map((row) => ({
    key: row.group.key,
    name: row.name,
    cells: row.bars.map((bar) => bar.value),
    current: row.group.key === selected,
  }))

  /** The group whose tooltip is showing (pointer first, then keyboard focus) and where. */
  const tipIndex = hover ?? focus
  const tipRow = tipIndex !== null ? rows[tipIndex] : undefined
  let tipStyle: CSSProperties = {}
  if (tipRow && tipIndex !== null) {
    const n = rows.length
    if (n === 1) {
      tipStyle = { left: '50%', maxWidth: '100%', translate: '-50%' }
    } else {
      // Beside the column band: to its right in the left half, flipped to its
      // left in the right half, and capped to the room left so it never
      // leaves the plot.
      const flip = tipIndex + 0.5 >= n / 2
      const edge = ((flip ? n - tipIndex : tipIndex + 1) / n) * 100
      const offset = `calc(${edge}% + 4px)`
      tipStyle = {
        left: flip ? undefined : offset,
        right: flip ? offset : undefined,
        maxWidth: `calc(${100 - edge}% - 4px)`,
      }
    }
  }

  const onClick = (group: BarChartGroup | undefined) => {
    if (group && clickable) onGroupClick?.(group)
  }

  const hideTip = () => {
    setHover(null)
    setFocus(null)
  }

  const column = (row: BarRow): ReactNode => (
    <>
      <span className="bar-chart__bars">
        {row.bars.map((bar) => (
          <span
            key={bar.key}
            className="bar-chart__bar"
            style={{ height: `${bar.pct}%`, background: bar.color }}
          />
        ))}
      </span>
      <span className="bar-chart__label">{row.group.label}</span>
      {row.group.caption && <span className="bar-chart__caption">{row.group.caption}</span>}
    </>
  )

  const groupClass = (row: BarRow, i: number) =>
    `bar-chart__group${tipIndex === i ? ' is-active' : ''}${row.group.key === selected ? ' is-selected' : ''}`

  const frameStyle = { '--bar-chart-h': `${height}px` } as CSSProperties

  return (
    <div className="chart bar-chart">
      {(series.length >= 2 || tableToggle) && (
        <div className="chart__top">
          {series.length >= 2 && (
            <ul className="chart__legend">
              {series.map((s) => (
                <li key={s.key}>
                  <span className="chart__swatch" style={{ background: s.color }} />
                  {s.label}
                </li>
              ))}
            </ul>
          )}
          {tableToggle && (
            <ChartToggle className="chart__toggle" pressed={showTable} onChange={setShowTable} />
          )}
        </div>
      )}

      {showTable && tableToggle ? (
        <ChartTable
          caption={label}
          columns={series.map((s) => s.label)}
          rows={tableRows}
          clickable={clickable}
          onRowClick={(key) => onClick(groups.find((group) => group.key === key))}
        />
      ) : (
        <div className="bar-chart__frame" style={frameStyle}>
          {rows.length > 0 && (
            <div className="bar-chart__axis" aria-hidden="true">
              {ticks.map((tick) => (
                <span key={tick}>{formatTick(tick)}</span>
              ))}
            </div>
          )}
          <div
            className="bar-chart__plot"
            role={clickable ? 'group' : 'img'}
            aria-label={label}
            onMouseLeave={() => setHover(null)}
          >
            {rows.length > 0 && (
              <div className="bar-chart__grid" aria-hidden="true">
                {ticks.map((tick) => (
                  <span key={tick} />
                ))}
              </div>
            )}
            <div className={`bar-chart__groups${rows.length > 6 ? ' is-dense' : ''}`}>
              {rows.map((row, i) =>
                clickable ? (
                  <button
                    key={row.group.key}
                    type="button"
                    className={groupClass(row, i)}
                    aria-label={row.aria}
                    aria-current={row.group.key === selected ? 'true' : undefined}
                    aria-describedby={tipIndex === i ? tipId : undefined}
                    onClick={() => onClick(row.group)}
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setFocus(i)}
                    onBlur={() => setFocus(null)}
                    onKeyDown={(event) => event.key === 'Escape' && hideTip()}
                  >
                    {column(row)}
                  </button>
                ) : (
                  <div
                    key={row.group.key}
                    className={groupClass(row, i)}
                    aria-current={row.group.key === selected ? 'true' : undefined}
                    onMouseEnter={() => setHover(i)}
                  >
                    {column(row)}
                  </div>
                ),
              )}
            </div>

            {tipRow && (
              <ChartTip
                id={tipId}
                className="bar-chart__tip"
                heading={tipRow.name}
                rows={tipRow.bars}
                style={tipStyle}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
