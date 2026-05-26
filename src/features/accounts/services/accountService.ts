import { apiClient } from '../../../lib/apiClient';
import { getCurrentUserId } from '../../auth';
import { generateId } from '../../../utils/ids';
import type { IAccount } from '../types';
import type { IAccountFormValues } from '../validations';

const RESOURCE = '/accounts';

export function listAccounts(): Promise<IAccount[]> {
  return apiClient.get<IAccount[]>(
    `${RESOURCE}?userId=${encodeURIComponent(getCurrentUserId())}`,
  );
}

export function createAccount(values: IAccountFormValues): Promise<IAccount> {
  const payload: IAccount = {
    id: generateId('acc'),
    userId: getCurrentUserId(),
    name: values.name.trim(),
    initialAmount: values.initialAmount,
    notes: values.notes?.trim() ?? '',
    createdAt: new Date().toISOString(),
  };
  return apiClient.post<IAccount>(RESOURCE, payload);
}

export function updateAccount(
  id: string,
  values: IAccountFormValues,
): Promise<IAccount> {
  return apiClient.patch<IAccount>(`${RESOURCE}/${id}`, {
    name: values.name.trim(),
    initialAmount: values.initialAmount,
    notes: values.notes?.trim() ?? '',
  });
}

export function deleteAccount(id: string): Promise<void> {
  return apiClient.delete<void>(`${RESOURCE}/${id}`);
}
