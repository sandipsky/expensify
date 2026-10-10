import type { TxType } from '@/features/transactions/transaction.types'
import type { Change } from '../dashboard.domain'
import { changeText, percentText, pointsText } from '../dashboard.labels'
import type { Dashboard } from '../useDashboard'
import { ArrowIcon, type ArrowName } from './ArrowIcon'
import './SummaryCards.scss'

/** How a figure moved: an up or down arrow beside the text, never color. */
interface ChangeView {
  icon: ArrowName | null
  /** Spoken in place of the arrow. */
  direction: string
  text: string
}

interface Tile {
  key: string
  label: string
  /** Income and expense carry an icon in their color besides the sign. */
  icon: ArrowName | null
  iconColor: string
  value: string
  change: ChangeView | null
  /** The list filter the tile opens. */
  type?: TxType
}

const arrow = (delta: number, text: string): ChangeView =>
  delta > 0
    ? { icon: 'arrow_upward', direction: 'up', text }
    : delta < 0
      ? { icon: 'arrow_downward', direction: 'down', text }
      : { icon: null, direction: '', text }

/**
 * Income, expense, net and savings rate for the period, each with its change
 * from the previous period as an amount and a percent. Every tile opens the
 * transaction list on the period: income and expense filtered to their type.
 * The change is left out when the previous period has no entries.
 */
export const SummaryCards = ({ dash }: { dash: Dashboard }) => {
  const { summary, change } = dash

  /** "+Rs 500.00 (+25%)", or the amount alone when there was nothing before. */
  const amountChange = (c: Change): ChangeView => {
    const amount = dash.signedMoney(c.amount)
    return arrow(c.amount, c.percent === null ? amount : `${amount} (${changeText(c.percent)})`)
  }

  const tiles: Tile[] = [
    {
      key: 'income',
      label: 'Income',
      icon: 'south_west',
      iconColor: 'var(--success)',
      value: dash.signedMoney(summary.income),
      change: change && amountChange(change.income),
      type: 'income',
    },
    {
      key: 'expense',
      label: 'Expense',
      icon: 'north_east',
      iconColor: 'var(--error)',
      value: dash.signedMoney(-summary.expense),
      change: change && amountChange(change.expense),
      type: 'expense',
    },
    {
      key: 'net',
      label: 'Net',
      icon: null,
      iconColor: '',
      value: dash.signedMoney(summary.net),
      change: change && amountChange(change.net),
    },
    {
      key: 'savings',
      label: 'Savings rate',
      icon: null,
      iconColor: '',
      value: percentText(summary.savingsRate),
      change:
        change &&
        (change.savingsRate === null
          ? null
          : arrow(change.savingsRate, pointsText(change.savingsRate))),
    },
  ]

  return (
    <div className="summary">
      <div className="summary__grid">
        {tiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            className="tile"
            onClick={() => dash.drillDown({ range: dash.range, type: tile.type })}
          >
            <span className="tile__label">
              {tile.icon && <ArrowIcon name={tile.icon} size={16} color={tile.iconColor} />}
              {tile.label}
            </span>
            <span className="tile__value">{tile.value}</span>
            {tile.change && (
              <span className="tile__change">
                {tile.change.icon && <ArrowIcon name={tile.change.icon} size={14} />}
                {tile.change.text}
                <span className="visually-hidden">
                  {tile.change.direction ? ` ${tile.change.direction}` : ''} from the previous period
                </span>
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
