export type CategoryType = 'income' | 'expense';

export interface ICategory {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  icon: string;
  createdAt: string;
}
