import type { CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import { LUIBreadcrumb, LUIIcon } from '@lumen-ui/react'
import { dataColor } from '@/utils'
import { REPORTS } from '../report.labels'
import './ReportsPage.scss'

/**
 * `/reports`: a card per report, each with its icon, name and what it shows.
 * A card opens the report's own page; every report exports to Excel and PDF.
 */
export const ReportsPage = () => (
  <div className="reports-page">
    <div className="reports-page__header">
      <LUIBreadcrumb title="Reports" />
      <p className="reports-page__intro">
        Pick a report to explore it with filters, then export it to Excel or PDF.
      </p>
    </div>

    <ul className="reports-grid" aria-label="Reports">
      {REPORTS.map((report) => (
        <li key={report.key}>
          <Link
            to={report.to}
            className="report-card"
            style={{ '--report-color': dataColor(report.color) } as CSSProperties}
          >
            <span className="report-card__icon" aria-hidden="true">
              <LUIIcon name={report.icon} size={26} color="var(--report-color)" />
            </span>
            <span className="report-card__title">{report.title}</span>
            <span className="report-card__description">{report.description}</span>
            <span className="report-card__foot">
              <span className="report-card__formats">Excel · PDF</span>
              <span className="report-card__open">
                Open report
                <LUIIcon name="caret" size={14} color="inherit" />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </div>
)
