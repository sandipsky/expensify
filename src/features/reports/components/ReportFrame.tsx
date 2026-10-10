import type { CSSProperties, ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { LUIButton, LUIIcon, LUIMenu, LUISkeleton, useLUINotification } from '@lumen-ui/react'
import { getErrorMessage } from '@/lib'
import { dataColor } from '@/utils'
import {
  EXPORT_FORMAT_LABELS,
  type ExportFormat,
  type ReportDocument,
  exportReport,
} from '../report.export'
import { type ReportKey, reportInfo } from '../report.labels'
import './ReportFrame.scss'

interface ReportFrameProps {
  report: ReportKey
  /** The filters, laid out in a wrapping row. */
  filters: ReactNode
  /** What the report covers, under the filters: "Nov 1, 2025 – Oct 31, 2026 · All accounts". */
  summary: string
  /** Offered beside the filters while they differ from the report's defaults. */
  onReset?: (() => void) | null
  /** Builds the file to export from what the page shows; null when there's nothing to export. */
  document: () => ReportDocument | null
  /** What the export says when the report has no rows: "No entries in May 2026". */
  emptyMessage: string
  loading?: boolean
  error?: unknown
  children: ReactNode
}

/**
 * A report page: a back link to Reports, the report's name and what it
 * shows, an Export menu (Excel or PDF of what's on screen), the filters,
 * then the report itself. Skeletons stand in while it loads, and an error
 * replaces it when a query fails.
 */
export const ReportFrame = ({
  report,
  filters,
  summary,
  onReset,
  document,
  emptyMessage,
  loading = false,
  error = null,
  children,
}: ReportFrameProps) => {
  const navigate = useNavigate()
  const notify = useLUINotification()
  const info = reportInfo(report)

  async function exportAs(format: ExportFormat) {
    if (loading) return
    const doc = document()
    if (!doc) {
      notify.info('Nothing to export', emptyMessage)
      return
    }
    try {
      const count = await exportReport(doc, format)
      if (count) {
        notify.success(`Exported ${info.title}`, EXPORT_FORMAT_LABELS[format])
      } else {
        notify.info('Nothing to export', emptyMessage)
      }
    } catch (err) {
      notify.error('Could not export', getErrorMessage(err))
    }
  }

  const iconStyle = { '--report-color': dataColor(info.color) } as CSSProperties

  return (
    <div className="report-page">
      <div className="report-page__header">
        <LUIButton
          variant="ghost"
          size="lg"
          rounded
          aria-label="Back to reports"
          onClick={() => navigate({ to: '/reports' })}
        >
          <LUIIcon name="caret" className="rotate-180" color="inherit" />
        </LUIButton>

        <span className="report-page__icon" style={iconStyle} aria-hidden="true">
          <LUIIcon name={info.icon} size={24} color="var(--report-color)" />
        </span>

        <div className="report-page__title">
          <h1 className="text-ellipsis">{info.title}</h1>
          <p>{info.description}</p>
        </div>

        <LUIMenu
          mode="right"
          closeOnItemClick
          appendBody
          dropdownDisplay={
            <LUIButton variant="outlined" size="lg" disabled={loading || !!error}>
              <LUIIcon name="download" color="inherit" />
              Export
            </LUIButton>
          }
        >
          {(['xlsx', 'pdf'] as const).map((format) => (
            <button
              key={format}
              type="button"
              className="dropdown-item report-page__item"
              onClick={() => exportAs(format)}
            >
              <LUIIcon name={format === 'xlsx' ? 'file_alt' : 'file'} size={18} />
              {EXPORT_FORMAT_LABELS[format]}
            </button>
          ))}
        </LUIMenu>
      </div>

      <section className="report-filters" aria-label="Filters">
        {filters}
        {onReset && (
          <LUIButton variant="ghost" size="lg" className="report-filters__reset" onClick={onReset}>
            <LUIIcon name="undo" size={18} color="inherit" />
            Reset
          </LUIButton>
        )}
        <p className="report-filters__summary" aria-live="polite">
          {summary}
        </p>
      </section>

      {error ? (
        <div className="alert error">{getErrorMessage(error)}</div>
      ) : loading ? (
        <div className="report-page__skeleton" aria-busy="true">
          <LUISkeleton height="84px" />
          <LUISkeleton height="260px" />
          <LUISkeleton height="320px" />
        </div>
      ) : (
        children
      )}
    </div>
  )
}
