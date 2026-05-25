import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import type { BudgetDuration, IBudget } from './types';
import type { ITransaction } from '../transactions/types';

dayjs.extend(quarterOfYear);

const DATE_FORMAT = 'YYYY-MM-DD';

export function deriveBudgetRange(
  duration: BudgetDuration,
  reference: Date = new Date(),
): { startAt: string; endAt: string } {
  const ref = dayjs(reference);
  switch (duration) {
    case 'weekly':
      return {
        startAt: ref.startOf('week').format(DATE_FORMAT),
        endAt: ref.endOf('week').format(DATE_FORMAT),
      };
    case 'monthly':
      return {
        startAt: ref.startOf('month').format(DATE_FORMAT),
        endAt: ref.endOf('month').format(DATE_FORMAT),
      };
    case 'quarterly':
      return {
        startAt: ref.startOf('quarter').format(DATE_FORMAT),
        endAt: ref.endOf('quarter').format(DATE_FORMAT),
      };
    case 'yearly':
      return {
        startAt: ref.startOf('year').format(DATE_FORMAT),
        endAt: ref.endOf('year').format(DATE_FORMAT),
      };
    case 'custom':
    default:
      return {
        startAt: ref.format(DATE_FORMAT),
        endAt: ref.add(1, 'month').format(DATE_FORMAT),
      };
  }
}

export function computeBudgetUsage(
  budget: IBudget,
  transactions: ITransaction[],
): { used: number; remaining: number; percent: number } {
  let used = 0;
  for (const txn of transactions) {
    if (txn.kind !== 'expense') continue;
    if (txn.categoryId !== budget.categoryId) continue;
    if (txn.accountId !== budget.accountId) continue;
    if (txn.date < budget.startAt || txn.date > budget.endAt) continue;
    used += txn.amount;
  }
  const remaining = budget.amount - used;
  const percent = budget.amount > 0 ? (used / budget.amount) * 100 : 0;
  return {
    used: Math.round(used * 100) / 100,
    remaining: Math.round(remaining * 100) / 100,
    percent: Math.round(percent * 10) / 10,
  };
}
