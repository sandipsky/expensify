export type CategoryType = 'income' | 'expense';

export interface ICategory {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  createdAt: string;
}
