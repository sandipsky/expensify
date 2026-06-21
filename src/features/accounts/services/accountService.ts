import { apiClient } from '../../../lib/apiClient';
import type { IAccount } from '../types';
import type { IAccountFormValues } from '../validations';

const RESOURCE = '/accounts';

export function listAccounts(): Promise<IAccount[]> {
  return apiClient.get<IAccount[]>(`${RESOURCE}?page_size=1000`);
}

export function createAccount(values: IAccountFormValues): Promise<IAccount> {
  return apiClient.post<IAccount>(RESOURCE, {
    name: values.name.trim(),
    initialAmount: values.initialAmount,
    notes: values.notes?.trim() ?? '',
  });
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
