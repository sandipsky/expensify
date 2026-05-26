export type BudgetDuration =
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'custom';

export interface IBudget {
  id: string;
  userId: string;
  amount: number;
  categoryId: string;
  accountId: string;
  duration: BudgetDuration;
  startAt: string;
  endAt: string;
  createdAt: string;
}
