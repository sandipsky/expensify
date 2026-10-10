import { saveFile } from '@/lib/files/download'
import { PDF_HEAD_FILL, loadPdf, pdfText } from '@/lib/files/pdf'
import { type XlsxCell, xlsx } from '@/lib/files/xlsx'
import { type DateRange, formatMoney, formatPeriod, fractionDigits } from '@/utils'
import { type Totals } from './transaction.domain'
import { TX_TYPE_LABELS, type TxRow } from './transaction.labels'

export type ExportFormat = 'xlsx' | 'pdf'

export const EXPORT_FORMAT_LABELS: Readonly<Record<ExportFormat, string>> = {
  xlsx: 'Excel',
  pdf: 'PDF',
}

export interface ExportInput {
  /** What the list shows, newest first; the file runs oldest first, as a statement reads. */
  rows: readonly TxRow[]
  range: DateRange
  /** Income, expense and net of the rows. */
  totals: Totals
  currency: string
}

/** `transactions-2026-09-01-to-2026-09-30.xlsx`. */
export function exportFileName(range: DateRange, extension: string): string {
  return `transactions-${range.start}-to-${range.end}.${extension}`
}

/** Oldest first: by date, then creation, then id, so the file reads like a statement. */
function statementOrder(rows: readonly TxRow[]): TxRow[] {
  return [...rows].sort(
    (a, b) =>
      compare(a.date, b.date) || compare(a.tx.createdAt, b.tx.createdAt) || compare(a.id, b.id),
  )
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Account names split for the file: the source, and the destination for a transfer. */
function accountsOf(row: TxRow): { account: string; toAccount: string } {
  if (row.kind !== 'transfer') return { account: row.accountLabel, toAccount: '' }
  const [account, toAccount = ''] = row.accountLabel.split(' → ')
  return { account, toAccount }
}

/**
 * Saves the rows as a file on the device: an Excel workbook with typed cells,
 * or a PDF statement. Resolves to how many rows went into the file; with
 * none, no file is made.
 */
export async function exportTransactions(
  input: ExportInput,
  format: ExportFormat,
): Promise<number> {
  const rows = statementOrder(input.rows)
  if (!rows.length) return 0
  const blob = format === 'xlsx' ? xlsxFile(rows) : await pdfFile(rows, input)
  saveFile(blob, exportFileName(input.range, format))
  return rows.length
}

const XLSX_HEADERS = [
  'Date',
  'Type',
  'Amount',
  'Currency',
  'Account',
  'To account',
  'Category',
  'Note',
] as const

/** Column widths of the Excel sheet, in characters, in header order. */
const XLSX_WIDTHS = [12, 10, 14, 9, 18, 18, 22, 48]

/** One sheet, amounts as numbers in the currency's places, so sums work in Excel. */
function xlsxFile(rows: readonly TxRow[]): Blob {
  const data: XlsxCell[][] = rows.map((row) => {
    const { account, toAccount } = accountsOf(row)
    return [
      { date: row.date },
      TX_TYPE_LABELS[row.kind],
      { value: row.tx.amount, decimals: fractionDigits(row.currency) },
      row.currency,
      account,
      toAccount,
      row.kind === 'transfer' ? '' : row.categoryLabel,
      row.note,
    ]
  })
  return xlsx([{ name: 'Transactions', widths: XLSX_WIDTHS, rows: [[...XLSX_HEADERS], ...data] }])
}

/** A landscape statement: the period and its totals, then one row per entry. jsPDF loads on first use. */
async function pdfFile(rows: readonly TxRow[], input: ExportInput): Promise<Blob> {
  const { jsPDF, autoTable } = await loadPdf()
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const money = (amount: number, signDisplay: 'auto' | 'exceptZero' = 'auto') =>
    pdfText(formatMoney(amount, input.currency, signDisplay))
  const period = formatPeriod(input.range)
  const { income, expense, net } = input.totals

  doc.setFont('helvetica', 'bold').setFontSize(16).text('Transactions', 40, 44)
  doc
    .setFont('helvetica', 'normal')
    .setFontSize(11)
    .setTextColor(85)
    .text(pdfText(`${period} · ${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`), 40, 62)
  doc
    .setTextColor(7, 9, 15)
    .text(
      pdfText(
        `Income ${money(income)}    Expense ${money(-expense)}    Net ${money(net, 'exceptZero')}`,
      ),
      40,
      80,
    )

  autoTable(doc, {
    startY: 96,
    margin: { left: 40, right: 40 },
    head: [['Date', 'Description', 'Category', 'Account', 'Type', 'Amount']],
    body: rows.map((row) => [
      pdfText(row.dateLabel),
      pdfText(row.note),
      row.kind === 'transfer' ? '' : pdfText(row.categoryLabel),
      pdfText(row.accountLabel),
      TX_TYPE_LABELS[row.kind],
      money(row.amount, row.kind === 'transfer' ? 'auto' : 'exceptZero'),
    ]),
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 5, overflow: 'linebreak' },
    headStyles: { fillColor: PDF_HEAD_FILL, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [247, 247, 247] },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 120 },
      3: { cellWidth: 130 },
      4: { cellWidth: 60 },
      5: { cellWidth: 90, halign: 'right' },
    },
    didDrawPage: (data) => {
      const page = doc.getCurrentPageInfo().pageNumber
      doc
        .setFontSize(9)
        .setTextColor(100)
        .text(`Page ${page}`, data.settings.margin.left, doc.internal.pageSize.getHeight() - 20)
    },
  })

  return doc.output('blob')
}
