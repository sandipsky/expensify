export type TransactionKind = 'expense' | 'income' | 'transfer';

export interface ITransactionAttachment {
  name: string;
  mimeType: string;
  size: number;
  // For the json-server mock backend the file is stored inline as a data URL.
  // A real backend would expose a file URL here instead (same field, same UI).
  dataUrl: string;
}

export interface ITransaction {
  id: string;
  userId: string;
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
