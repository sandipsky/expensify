import type { ReactNode } from 'react'
import type { LUIIconName } from '@lumen-ui/react'
import { TransactionIcon } from '@/features/transactions/components/TransactionIcon'
import './report-row.scss'

/** A thin bar under a row's name: `pct` of the track, in `color`. */
export interface ReportBar {
  pct: number
  color: string
}

export interface ReportRowProps {
  name: string
  caption?: string
  /** The formatted amount. */
  value: string
  /** Under the amount, such as a share of the total. */
  detail?: string
  /** The icon, drawn in `color` on its tint; neutral without a color. */
  icon?: LUIIconName | null
  color?: string | null
  bars?: readonly ReportBar[]
  /** Clickable rows open the entries behind them. */
  clickable?: boolean
  onOpen?: () => void
}

/**
 * One line of a ranked list (categories, payees, accounts): icon, name and
 * caption, share bars, and the amount right-aligned with its detail under it.
 * The bars only repeat what the text says, so they're hidden from screen
 * readers.
 */
export const ReportRow = ({
  name,
  caption = '',
  value,
  detail = '',
  icon = null,
  color = null,
  bars = [],
  clickable = true,
  onOpen,
}: ReportRowProps) => {
  const content: ReactNode = (
    <>
      {icon && <TransactionIcon row={{ icon, color }} size={36} />}
      <span className="report-row__text">
        <span className="report-row__name text-ellipsis">{name}</span>
        {caption && <span className="report-row__caption text-ellipsis">{caption}</span>}
        {bars.map((bar, i) => (
          <span key={i} className="report-row__track" aria-hidden="true">
            <span style={{ width: `${bar.pct}%`, background: bar.color }} />
          </span>
        ))}
      </span>
      <span className="report-row__end">
        <span className="report-row__value">{value}</span>
        {detail && <span className="report-row__detail">{detail}</span>}
      </span>
    </>
  )

  return clickable ? (
    <button type="button" className="report-row" onClick={onOpen}>
      {content}
    </button>
  ) : (
    <div className="report-row">{content}</div>
  )
}
