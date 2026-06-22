import dayjs from 'dayjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatCurrency, getCurrencySymbol } from '../../utils/format';
import type { IAccount } from '../accounts/types';
import type { ICategory } from '../categories/types';
import type { ITransaction, TransactionKind } from './types';

const KIND_LABEL: Record<TransactionKind, string> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
};

interface ExportLookups {
  accountById: Map<string, IAccount>;
  categoryById: Map<string, ICategory>;
}

interface ExportRow {
  Date: string;
  Type: string;
  Description: string;
  Category: string;
  Account: string;
  'To account': string;
  Amount: number;
}

const HEADERS = [
  'Date',
  'Type',
  'Description',
  'Category',
  'Account',
  'To account',
  'Amount',
] as const;

// Expenses are stored as positive amounts; present them as negative so the
// Amount column reads as a signed ledger. Transfers move money between the
// user's own accounts, so they carry no sign.
function signedAmount(txn: ITransaction): number {
  return txn.kind === 'expense' ? -txn.amount : txn.amount;
}

function buildRows(
  transactions: ITransaction[],
  { accountById, categoryById }: ExportLookups,
): ExportRow[] {
  return transactions.map((txn) => {
    const account = accountById.get(txn.accountId);
    const toAccount = txn.toAccountId ? accountById.get(txn.toAccountId) : null;
    const category = txn.categoryId ? categoryById.get(txn.categoryId) : null;
    return {
      Date: dayjs(txn.date).format('YYYY-MM-DD'),
      Type: KIND_LABEL[txn.kind],
      Description: txn.notes || '',
      Category: category?.name ?? '',
      Account: account?.name ?? '',
      'To account': toAccount?.name ?? '',
      Amount: signedAmount(txn),
    };
  });
}

function fileName(extension: string): string {
  return `transactions-${dayjs().format('YYYY-MM-DD')}.${extension}`;
}

export function exportTransactionsToExcel(
  transactions: ITransaction[],
  lookups: ExportLookups,
): void {
  const rows = buildRows(transactions, lookups);
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: [...HEADERS] });
  worksheet['!cols'] = [
    { wch: 12 }, // Date
    { wch: 10 }, // Type
    { wch: 32 }, // Description
    { wch: 18 }, // Category
    { wch: 18 }, // Account
    { wch: 18 }, // To account
    { wch: 14 }, // Amount
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
  XLSX.writeFile(workbook, fileName('xlsx'));
}

export function exportTransactionsToPdf(
  transactions: ITransaction[],
  lookups: ExportLookups,
): void {
  const rows = buildRows(transactions, lookups);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' });
  const symbol = getCurrencySymbol();

  doc.setFontSize(16);
  doc.text('Transactions', 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `Exported ${dayjs().format('MMM D, YYYY h:mm A')}  ·  ${rows.length} record(s)`,
    40,
    58,
  );

  autoTable(doc, {
    startY: 76,
    head: [[...HEADERS.slice(0, -1), `Amount (${symbol})`]],
    body: rows.map((row) => [
      row.Date,
      row.Type,
      row.Description,
      row.Category,
      row.Account,
      row['To account'],
      formatCurrency(row.Amount),
    ]),
    styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [79, 70, 229], halign: 'left' },
    columnStyles: { 6: { halign: 'right' } },
    margin: { left: 40, right: 40 },
  });

  doc.save(fileName('pdf'));
}
