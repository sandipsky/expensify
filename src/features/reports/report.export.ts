// Every report exports the same way: it describes its tables once (columns
// with a kind, raw values, an optional totals row) and this module writes
// them as an Excel workbook with typed cells or as a PDF.
import type { ExportFormat } from '@/features/transactions/transaction.export'
import { saveFile } from '@/lib/files/download'
import { PDF_HEAD_FILL, loadPdf, pdfText } from '@/lib/files/pdf'
import { type XlsxCell, type XlsxSheet, xlsx } from '@/lib/files/xlsx'
import { formatDate, formatDateTime, formatMoney, fractionDigits } from '@/utils'

export { EXPORT_FORMAT_LABELS, type ExportFormat } from '@/features/transactions/transaction.export'

/**
 * How a column's values read: `money` as an amount, `signed` as an amount
 * with its + or −, `percent` as a whole percent, `change` as a whole percent
 * with its sign, `count` as a plain number, `date` as a `YYYY-MM-DD` date,
 * `text` as is.
 */
export type ColumnKind = 'text' | 'money' | 'signed' | 'percent' | 'change' | 'count' | 'date'

export interface ExportColumn {
  header: string
  kind: ColumnKind
  /** Excel column width, in characters. */
  width?: number
}

/** A raw value: a number for amounts, percents and counts, `YYYY-MM-DD` for dates, null for none. */
export type ExportValue = string | number | null

export interface ExportTable {
  /** The sheet name in Excel and the table's heading in the PDF. */
  name: string
  columns: readonly ExportColumn[]
  rows: readonly (readonly ExportValue[])[]
  /** The totals row, under the rows; its first cell is usually "Total". */
  totals?: readonly ExportValue[]
}

export interface ReportDocument {
  /** "Cash flow". */
  title: string
  /** File name without the extension: `cash-flow-2026-05-01-to-2026-10-31`. */
  fileName: string
  /** What the report covers, one line each: the period, then the filters. */
  details: readonly { label: string; value: string }[]
  /** The headline figures, already formatted. */
  summary: readonly { label: string; value: string }[]
  tables: readonly ExportTable[]
  /** Footnotes, such as how balances were worked out. */
  notes?: readonly string[]
  currency: string
}

/**
 * Saves the report on the device as an Excel workbook (a sheet per table,
 * then an "About" sheet) or a PDF. Resolves to how many rows went into the
 * file; with none, no file is made.
 */
export async function exportReport(report: ReportDocument, format: ExportFormat): Promise<number> {
  const count = report.tables.reduce((sum, table) => sum + table.rows.length, 0)
  if (!count) return 0
  const blob = format === 'xlsx' ? xlsxFile(report) : await pdfFile(report)
  saveFile(blob, `${report.fileName}.${format}`)
  return count
}

/** A file name from the report's key and range: `cash-flow-2026-05-01-to-2026-10-31`. */
export function reportFileName(key: string, range?: { start: string; end: string }): string {
  return range ? `${key}-${range.start}-to-${range.end}` : `${key}-${new Date().toISOString().slice(0, 10)}`
}

// Excel

function xlsxCell(value: ExportValue, kind: ColumnKind, decimals: number): XlsxCell {
  if (value === null || value === '') return null
  if (typeof value === 'string') return kind === 'date' ? { date: value } : value
  switch (kind) {
    case 'money':
    case 'signed':
      return { value, decimals }
    case 'percent':
    case 'change':
    case 'count':
    case 'text':
    case 'date':
      return value
  }
}

/** Percent columns say so in the header, since the cells hold plain numbers. */
function xlsxHeader(column: ExportColumn): string {
  const percent = column.kind === 'percent' || column.kind === 'change'
  return percent && !column.header.includes('%') ? `${column.header} (%)` : column.header
}

function xlsxFile(report: ReportDocument): Blob {
  const decimals = fractionDigits(report.currency)
  const sheets: XlsxSheet[] = report.tables.map((table) => {
    const row = (values: readonly ExportValue[]) =>
      values.map((value, i) => xlsxCell(value, table.columns[i]?.kind ?? 'text', decimals))
    return {
      name: table.name,
      widths: table.columns.map((c) => c.width ?? (c.kind === 'text' ? 24 : 16)),
      rows: [
        table.columns.map(xlsxHeader),
        ...table.rows.map(row),
        ...(table.totals ? [row(table.totals)] : []),
      ],
    }
  })
  sheets.push({
    name: 'About',
    widths: [22, 60],
    rows: [
      ['Item', 'Value'],
      ['Report', report.title],
      ...report.details.map((d) => [d.label, d.value]),
      ['Currency', report.currency],
      ...report.summary.map((s) => [s.label, s.value]),
      ...(report.notes ?? []).map((note) => ['Note', note]),
      ['Generated', formatDateTime(new Date().toISOString())],
    ],
  })
  return xlsx(sheets)
}

// PDF

/** A value as the PDF prints it. */
function pdfValue(value: ExportValue, kind: ColumnKind, currency: string): string {
  if (value === null || value === '') return kind === 'percent' || kind === 'change' ? '—' : ''
  if (typeof value === 'string') return pdfText(kind === 'date' ? formatDate(value) : value)
  switch (kind) {
    case 'money':
      return pdfText(formatMoney(value, currency))
    case 'signed':
      return pdfText(formatMoney(value, currency, 'exceptZero'))
    case 'percent':
      return `${value}%`
    case 'change':
      return `${value > 0 ? '+' : ''}${value}%`
    default:
      return String(value)
  }
}

const MARGIN = 40

/**
 * A landscape document: the title, what it covers and the headline figures,
 * then each table with its totals row. Wide tables get an A3 page and a
 * smaller font. jsPDF loads on first use.
 */
async function pdfFile(report: ReportDocument): Promise<Blob> {
  const { jsPDF, autoTable } = await loadPdf()
  const widest = Math.max(...report.tables.map((t) => t.columns.length))
  const wide = widest > 10
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: wide ? 'a3' : 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const fontSize = wide ? 7 : 9

  let y = 44
  doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(7, 9, 15).text(report.title, MARGIN, y)
  y += 18
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(85)
  const details = report.details.map((d) => `${d.label}: ${d.value}`).join('    ')
  for (const line of doc.splitTextToSize(pdfText(details), pageWidth - 2 * MARGIN) as string[]) {
    doc.text(line, MARGIN, y)
    y += 14
  }
  if (report.summary.length) {
    doc.setTextColor(7, 9, 15).setFontSize(11)
    const summary = report.summary.map((s) => `${s.label} ${s.value}`).join('    ')
    for (const line of doc.splitTextToSize(pdfText(summary), pageWidth - 2 * MARGIN) as string[]) {
      y += 4
      doc.text(line, MARGIN, y)
      y += 12
    }
  }
  y += 8

  for (const table of report.tables) {
    // A heading never sits alone at the foot of a page.
    if (y > doc.internal.pageSize.getHeight() - 120) {
      doc.addPage()
      y = 44
    }
    if (report.tables.length > 1) {
      doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(7, 9, 15).text(pdfText(table.name), MARGIN, y)
      y += 8
    }
    const cells = (values: readonly ExportValue[]) =>
      values.map((value, i) => pdfValue(value, table.columns[i]?.kind ?? 'text', report.currency))
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, bottom: 36 },
      head: [table.columns.map((c) => pdfText(c.header))],
      body: table.rows.map(cells),
      foot: table.totals ? [cells(table.totals)] : undefined,
      showFoot: 'lastPage',
      styles: { font: 'helvetica', fontSize, cellPadding: wide ? 3 : 5, overflow: 'linebreak' },
      headStyles: { fillColor: PDF_HEAD_FILL, textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [235, 238, 245], textColor: [7, 9, 15], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [247, 247, 247] },
      columnStyles: Object.fromEntries(
        table.columns.map((c, i) => [i, { halign: c.kind === 'text' || c.kind === 'date' ? 'left' : 'right' }]),
      ),
      didDrawPage: () => {
        const page = doc.getCurrentPageInfo().pageNumber
        doc
          .setFont('helvetica', 'normal')
          .setFontSize(9)
          .setTextColor(100)
          .text(`Page ${page}`, MARGIN, doc.internal.pageSize.getHeight() - 20)
      },
    })
    const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
    y = (finalY ?? y) + 28
  }

  if (report.notes?.length) {
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(100)
    for (const note of report.notes) {
      const lines = doc.splitTextToSize(pdfText(note), pageWidth - 2 * MARGIN) as string[]
      if (y + lines.length * 12 > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage()
        y = 44
      }
      for (const line of lines) {
        doc.text(line, MARGIN, y)
        y += 12
      }
    }
  }

  return doc.output('blob')
}
