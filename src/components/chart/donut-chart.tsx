import { useId, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { type ChartFormat, type DonutSegment, defaultChartFormat } from './chart'
import { ChartTable, type ChartTableRow } from './chart-table'
import { ChartTip, type ChartTipRow } from './chart-tip'
import { ChartToggle } from './chart-toggle'
import './chart.scss'

/** Half the surface gap between neighboring segments, in px at `size`. */
const HALF_GAP = 1

/** A segment ready to draw: its path, formatted value and whole-percent share. */
interface DonutArc {
  segment: DonutSegment
  path: string
  share: number
  text: string
  aria: string
  /**
   * Tooltip placement, as % of `size`: anchored on the inner edge at the
   * segment's middle angle and shifted by the matching outer-edge fraction of
   * its own size, so it opens toward the hole (not over the segment) and never
   * leaves the ring's box.
   */
  tip: { left: number; top: number; shift: string }
}

const round = (n: number): number => Math.round(n * 100) / 100

/** Share of `total` as a whole percent; 0 for non-positive values. */
const shareOf = (value: number, total: number): number =>
  value > 0 && total > 0 ? Math.round((value * 100) / total) : 0

/**
 * Path of a ring segment from angle `a0` to `a1` (radians, clockwise from 3
 * o'clock) with edges pulled in by HALF_GAP px, parallel to the radius, so
 * neighbors are split by an even 2px gap. Slivers too thin for the gap
 * collapse to nothing at that radius.
 */
function sectorPath(c: number, outer: number, inner: number, a0: number, a1: number): string {
  const mid = (a0 + a1) / 2
  const pull = (radius: number) => (radius > HALF_GAP ? Math.asin(HALF_GAP / radius) : Math.PI)
  const edges = (radius: number): [number, number] => {
    const p = pull(radius)
    return a1 - a0 > 2 * p ? [a0 + p, a1 - p] : [mid, mid]
  }
  const point = (radius: number, a: number) =>
    `${round(c + radius * Math.cos(a))} ${round(c + radius * Math.sin(a))}`
  const [o0, o1] = edges(outer)
  const [i0, i1] = edges(inner)
  const large = (from: number, to: number) => (to - from > Math.PI ? 1 : 0)
  return (
    `M${point(outer, o0)}A${outer} ${outer} 0 ${large(o0, o1)} 1 ${point(outer, o1)}` +
    `L${point(inner, i1)}A${inner} ${inner} 0 ${large(i0, i1)} 0 ${point(inner, i0)}Z`
  )
}

/** Path of a full ring: two circles, drawn with `fill-rule: evenodd` so the hole stays open. */
function ringPath(c: number, outer: number, inner: number): string {
  const circle = (r: number, sweep: number) =>
    `M${round(c - r)} ${c}A${r} ${r} 0 1 ${sweep} ${round(c + r)} ${c}` +
    `A${r} ${r} 0 1 ${sweep} ${round(c - r)} ${c}Z`
  return circle(outer, 1) + (inner > 0 ? circle(inner, 0) : '')
}

export interface DonutChartProps {
  /** Segments in drawing order, clockwise from 12 o'clock (largest first, "Other" last). */
  segments: readonly DonutSegment[]
  /** Formats values in the legend, tooltip and table. */
  format?: ChartFormat
  /** Accessible name of the chart and caption of the table view. */
  label: string
  /** Outer diameter in px; the ring also shrinks to fit a narrower container. */
  size?: number
  /** Ring width in px at `size`. */
  thickness?: number
  /** Key of the highlighted segment; the others dim. */
  selected?: string | null
  /** Make segments (and table rows) focusable buttons that call `onSegmentClick`. */
  clickable?: boolean
  /** Render the legend list (swatch, label, value, share). */
  legend?: boolean
  /** Show the table view instead of the chart; uncontrolled when left out. */
  showTable?: boolean
  onShowTableChange?: (show: boolean) => void
  /** Render the "Table" toggle. */
  tableToggle?: boolean
  onSegmentClick?: (segment: DonutSegment) => void
  /** Centered in the hole, usually the total. */
  children?: ReactNode
}

/**
 * Donut chart for part-to-whole: an SVG ring of segments in the order given,
 * with an optional legend and a centered slot for content (usually the total).
 *
 * Zero and negative values are left out of the ring and the legend (the table
 * still lists them). Hover or focus lifts a segment and shows its value and
 * share; the "Table" toggle swaps the chart for an equivalent `<table>`.
 */
export const DonutChart = ({
  segments,
  format = defaultChartFormat,
  label,
  size = 200,
  thickness = 28,
  selected = null,
  clickable = false,
  legend = true,
  showTable: showTableProp,
  onShowTableChange,
  tableToggle = true,
  onSegmentClick,
  children,
}: DonutChartProps) => {
  const tipId = useId()
  const [hover, setHover] = useState<string | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const [showTableState, setShowTableState] = useState(false)
  const showTable = showTableProp ?? showTableState
  const setShowTable = (show: boolean) => {
    setShowTableState(show)
    onShowTableChange?.(show)
  }

  /** Sum of the positive segment values: the whole the shares are taken of. */
  const total = segments.reduce((sum, s) => (s.value > 0 ? sum + s.value : sum), 0)
  const c = size / 2
  const inner = Math.max(0, c - thickness)
  const holeRatio = c > 0 ? inner / c : 0
  const positive = segments.filter((s) => s.value > 0)
  const arcs: DonutArc[] = []
  // Clockwise from 12 o'clock, each segment starting where the last ended.
  let angle = -Math.PI / 2
  for (const segment of positive) {
    const a0 = angle
    const a1 = a0 + (segment.value / total) * 2 * Math.PI
    angle = a1
    const mid = (a0 + a1) / 2
    const share = shareOf(segment.value, total)
    const text = format(segment.value)
    arcs.push({
      segment,
      path: positive.length === 1 ? ringPath(c, c, inner) : sectorPath(c, c, inner, a0, a1),
      share,
      text,
      aria: `${segment.label}: ${text}, ${share}%`,
      tip: {
        left: round(50 + 50 * holeRatio * Math.cos(mid)),
        top: round(50 + 50 * holeRatio * Math.sin(mid)),
        shift: `${-round(50 + 50 * Math.cos(mid))}% ${-round(50 + 50 * Math.sin(mid))}%`,
      },
    })
  }

  /** Every segment, for the table view. */
  const tableRows: ChartTableRow[] = segments.map((segment) => ({
    key: segment.key,
    name: segment.label,
    cells: [format(segment.value), `${shareOf(segment.value, total)}%`],
    current: segment.key === selected,
  }))

  /** The lifted segment: pointer first, then keyboard focus, then `selected`. */
  const emphasisKey = hover ?? focus ?? selected
  const emphasis = arcs.some((a) => a.segment.key === emphasisKey) ? emphasisKey : null

  const tipArc = arcs.find((a) => a.segment.key === (hover ?? focus)) ?? null
  const tipRows: ChartTipRow[] = tipArc
    ? [
        {
          key: tipArc.segment.key,
          color: tipArc.segment.color,
          value: tipArc.text,
          label: tipArc.segment.label,
        },
      ]
    : []

  /** Diameter of the hole as % of the ring, to size the centered slot. */
  const holePct = (Math.max(0, size - 2 * thickness) / size) * 100

  const activate = (segment: DonutSegment) => {
    if (clickable) onSegmentClick?.(segment)
  }

  const onKeyDown = (event: KeyboardEvent<SVGPathElement>, segment: DonutSegment) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activate(segment)
    } else if (event.key === 'Escape') {
      setHover(null)
      setFocus(null)
    }
  }

  const onRowClick = (key: string) => {
    const segment = segments.find((s) => s.key === key)
    if (segment) activate(segment)
  }

  const style = { '--donut-size': `${size}px` } as CSSProperties

  return (
    <div className="chart donut-chart" style={style}>
      {tableToggle && (
        <div className="chart__top">
          <ChartToggle className="chart__toggle" pressed={showTable} onChange={setShowTable} />
        </div>
      )}

      {showTable ? (
        <ChartTable
          caption={label}
          columns={['Amount', 'Share']}
          rows={tableRows}
          clickable={clickable}
          onRowClick={onRowClick}
        />
      ) : (
        <div className="donut-chart__body">
          <div className="donut-chart__ring" style={{ width: size }}>
            <svg
              viewBox={`0 0 ${size} ${size}`}
              width={size}
              height={size}
              role={clickable ? 'group' : 'img'}
              aria-label={label}
              onMouseLeave={() => setHover(null)}
            >
              {arcs.length ? (
                arcs.map((arc) => (
                  <path
                    key={arc.segment.key}
                    className={`donut-chart__arc${emphasis !== null && emphasis !== arc.segment.key ? ' is-dim' : ''}`}
                    fillRule="evenodd"
                    d={arc.path}
                    style={{ fill: arc.segment.color }}
                    role={clickable ? 'button' : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    aria-label={arc.aria}
                    aria-current={arc.segment.key === selected ? 'true' : undefined}
                    aria-describedby={tipArc === arc ? tipId : undefined}
                    onClick={() => activate(arc.segment)}
                    onKeyDown={(event) => onKeyDown(event, arc.segment)}
                    onMouseEnter={() => setHover(arc.segment.key)}
                    onFocus={() => setFocus(arc.segment.key)}
                    onBlur={() => setFocus(null)}
                  />
                ))
              ) : (
                <circle
                  className="donut-chart__track"
                  cx={size / 2}
                  cy={size / 2}
                  r={size / 2 - thickness / 2}
                  strokeWidth={thickness}
                />
              )}
            </svg>

            <div className="donut-chart__center" style={{ width: `${holePct}%` }}>
              {children}
            </div>

            {tipArc && (
              <ChartTip
                id={tipId}
                rows={tipRows}
                note={`${tipArc.share}%`}
                style={{
                  left: `${tipArc.tip.left}%`,
                  top: `${tipArc.tip.top}%`,
                  translate: tipArc.tip.shift,
                }}
              />
            )}
          </div>

          {legend && arcs.length > 0 && (
            <ul className="donut-chart__legend">
              {arcs.map((arc) => (
                <li
                  key={arc.segment.key}
                  className={emphasis === arc.segment.key ? 'is-on' : undefined}
                  onMouseEnter={() => setHover(arc.segment.key)}
                  onMouseLeave={() => setHover(null)}
                >
                  <span className="chart__swatch" style={{ background: arc.segment.color }} />
                  <span className="donut-chart__name">{arc.segment.label}</span>
                  <span className="donut-chart__num">{arc.text}</span>
                  <span className="donut-chart__num">{arc.share}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
