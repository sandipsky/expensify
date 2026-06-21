import { apiClient } from '../../../lib/apiClient';
import type { IBudget } from '../types';
import type { IBudgetFormValues } from '../validations';

const RESOURCE = '/budgets';

// The API exposes the foreign keys as `account` / `category`; the frontend uses
// the `*Id` suffix. Map between the two at this boundary.
interface IBudgetApi extends Omit<IBudget, 'accountId' | 'categoryId'> {
  account: string;
  category: string;
}

function fromApi(budget: IBudgetApi): IBudget {
  const { account, category, ...rest } = budget;
  return { ...rest, accountId: account, categoryId: category };
}

function toPayload(values: IBudgetFormValues) {
  return {
    amount: values.amount,
    account: values.accountId,
    category: values.categoryId,
    duration: values.duration,
    startAt: values.startAt,
    endAt: values.endAt,
  };
}

export async function listBudgets(): Promise<IBudget[]> {
  const budgets = await apiClient.get<IBudgetApi[]>(`${RESOURCE}?page_size=1000`);
  return budgets.map(fromApi);
}

export async function createBudget(values: IBudgetFormValues): Promise<IBudget> {
  const created = await apiClient.post<IBudgetApi>(RESOURCE, toPayload(values));
  return fromApi(created);
}

export async function updateBudget(
  id: string,
  values: IBudgetFormValues,
): Promise<IBudget> {
  const updated = await apiClient.patch<IBudgetApi>(`${RESOURCE}/${id}`, toPayload(values));
  return fromApi(updated);
}

export function deleteBudget(id: string): Promise<void> {
  return apiClient.delete<void>(`${RESOURCE}/${id}`);
}
