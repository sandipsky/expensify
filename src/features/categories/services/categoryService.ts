import { apiClient } from '../../../lib/apiClient';
import type { ICategory } from '../types';
import type { ICategoryFormValues } from '../validations';

const RESOURCE = '/categories';

export function listCategories(): Promise<ICategory[]> {
  return apiClient.get<ICategory[]>(RESOURCE);
}

export function createCategory(values: ICategoryFormValues): Promise<ICategory> {
  return apiClient.post<ICategory>(RESOURCE, {
    ...values,
    createdAt: new Date().toISOString(),
  });
}

export function updateCategory(
  id: string,
  values: Partial<Omit<ICategoryFormValues, 'type'>>,
): Promise<ICategory> {
  return apiClient.patch<ICategory>(`${RESOURCE}/${id}`, values);
}

export function deleteCategory(id: string): Promise<void> {
  return apiClient.delete<void>(`${RESOURCE}/${id}`);
}
