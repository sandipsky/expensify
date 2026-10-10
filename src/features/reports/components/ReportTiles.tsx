import { LUICard } from '@lumen-ui/react'
import './ReportTiles.scss'

export interface ReportTile {
  label: string
  value: string
  /** Colors the value: income green, expense red. The value carries its sign too. */
  tone?: 'income' | 'expense' | null
  /** A line under the value, such as an average or the change. */
  note?: string
}

/** The report's headline figures: a row of four on desktops, two on tablets, one on phones. */
export const ReportTiles = ({ tiles }: { tiles: readonly ReportTile[] }) => (
  <ul className="report-tiles" aria-label="Summary">
    {tiles.map((tile) => (
      <li key={tile.label}>
        <LUICard padding="lg" className="report-tile">
          <div className="report-tile__body">
            <span className="report-tile__label">{tile.label}</span>
            <span className={`report-tile__value${tile.tone ? ` is-${tile.tone}` : ''}`}>
              {tile.value}
            </span>
            {tile.note && <span className="report-tile__note">{tile.note}</span>}
          </div>
        </LUICard>
      </li>
    ))}
  </ul>
)
