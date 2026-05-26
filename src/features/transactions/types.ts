export type TransactionKind = 'expense' | 'income' | 'transfer';

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
