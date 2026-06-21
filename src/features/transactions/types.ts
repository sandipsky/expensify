export type TransactionKind = 'expense' | 'income' | 'transfer';

export interface ITransactionAttachment {
  name: string;
  mimeType: string;
  size: number;
  // A browser-resolvable URL to the file. For a freshly picked file (before
  // upload) this is a base64 data URL; once stored it is the server file URL.
  dataUrl: string;
}

export interface ITransaction {
  id: string;
  kind: TransactionKind;
  amount: number;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  date: string;
  notes: string;
  attachment: ITransactionAttachment | null;
  createdAt: string;
}

export interface ITransactionFilters {
  kind?: TransactionKind | 'all';
  accountId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  search?: string;
}
