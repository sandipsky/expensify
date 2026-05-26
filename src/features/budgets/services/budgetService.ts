import { apiClient } from '../../../lib/apiClient';
import { getCurrentUserId } from '../../auth';
import { generateId } from '../../../utils/ids';
import type { IBudget } from '../types';
import type { IBudgetFormValues } from '../validations';

const RESOURCE = '/budgets';

export function listBudgets(): Promise<IBudget[]> {
  return apiClient.get<IBudget[]>(
    `${RESOURCE}?userId=${encodeURIComponent(getCurrentUserId())}`,
  );
}

export function createBudget(values: IBudgetFormValues): Promise<IBudget> {
  const payload: IBudget = {
    id: generateId('bud'),
    userId: getCurrentUserId(),
    amount: values.amount,
    categoryId: values.categoryId,
    accountId: values.accountId,
    duration: values.duration,
    startAt: values.startAt,
    endAt: values.endAt,
    createdAt: new Date().toISOString(),
  };
  return apiClient.post<IBudget>(RESOURCE, payload);
}

export function updateBudget(
  id: string,
  values: IBudgetFormValues,
): Promise<IBudget> {
  return apiClient.patch<IBudget>(`${RESOURCE}/${id}`, {
    amount: values.amount,
    categoryId: values.categoryId,
    accountId: values.accountId,
    duration: values.duration,
    startAt: values.startAt,
    endAt: values.endAt,
  });
}

export function deleteBudget(id: string): Promise<void> {
  return apiClient.delete<void>(`${RESOURCE}/${id}`);
}
