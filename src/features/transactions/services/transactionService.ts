import { apiClient } from '../../../lib/apiClient';
import { generateId } from '../../../utils/ids';
import type { ITransaction } from '../types';
import type { ITransactionFormValues } from '../validations';

const RESOURCE = '/transactions';

export function listTransactions(): Promise<ITransaction[]> {
  return apiClient.get<ITransaction[]>(`${RESOURCE}?_sort=date&_order=desc`);
}

function toPayload(values: ITransactionFormValues): Omit<ITransaction, 'id' | 'createdAt'> {
  return {
    kind: values.kind,
    amount: values.amount,
    accountId: values.accountId,
    toAccountId: values.kind === 'transfer' ? values.toAccountId ?? null : null,
    categoryId: values.kind === 'transfer' ? null : values.categoryId ?? null,
    date: values.date,
    notes: values.notes?.trim() ?? '',
  };
}

export function createTransaction(
  values: ITransactionFormValues,
): Promise<ITransaction> {
  const payload: ITransaction = {
    id: generateId('txn'),
    ...toPayload(values),
    createdAt: new Date().toISOString(),
  };
  return apiClient.post<ITransaction>(RESOURCE, payload);
}

export function updateTransaction(
  id: string,
  values: ITransactionFormValues,
): Promise<ITransaction> {
  return apiClient.patch<ITransaction>(`${RESOURCE}/${id}`, toPayload(values));
}

export function deleteTransaction(id: string): Promise<void> {
  return apiClient.delete<void>(`${RESOURCE}/${id}`);
}
