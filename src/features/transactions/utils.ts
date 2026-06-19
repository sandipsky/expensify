import type { IAccount } from '../accounts/types';
import type { ITransaction, ITransactionAttachment } from './types';

export function readFileAsAttachment(file: File): Promise<ITransactionAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        mimeType: file.type,
        size: file.size,
        dataUrl: String(reader.result),
      });
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function computeAccountBalance(
  account: IAccount,
  transactions: ITransaction[],
): number {
  let balance = account.initialAmount;
  for (const txn of transactions) {
    if (txn.kind === 'income' && txn.accountId === account.id) {
      balance += txn.amount;
    } else if (txn.kind === 'expense' && txn.accountId === account.id) {
      balance -= txn.amount;
    } else if (txn.kind === 'transfer') {
      if (txn.accountId === account.id) balance -= txn.amount;
      if (txn.toAccountId === account.id) balance += txn.amount;
    }
  }
  return Math.round(balance * 100) / 100;
}

export function totalsByKind(transactions: ITransaction[]): {
  income: number;
  expense: number;
  net: number;
} {
  let income = 0;
  let expense = 0;
  for (const txn of transactions) {
    if (txn.kind === 'income') income += txn.amount;
    else if (txn.kind === 'expense') expense += txn.amount;
  }
  return { income, expense, net: income - expense };
}

export function isWithinRange(date: string, from?: string, to?: string): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}
