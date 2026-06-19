import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import type { BudgetDuration, IBudget } from './types';
import type { ITransaction } from '../transactions/types';

dayjs.extend(quarterOfYear);
dayjs.extend(isoWeek);

const DATE_FORMAT = 'YYYY-MM-DD';

export function deriveBudgetRange(
  duration: BudgetDuration,
  reference: Date = new Date(),
): { startAt: string; endAt: string } {
  const ref = dayjs(reference);
  switch (duration) {
    case 'weekly':
      return {
        startAt: ref.startOf('isoWeek').format(DATE_FORMAT),
        endAt: ref.endOf('isoWeek').format(DATE_FORMAT),
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

// The window a budget's usage is measured over. Recurring durations advance to
// the current period (so a "monthly" budget tracks this month, not the month it
// was created); custom budgets use their stored, fixed range.
export function getBudgetWindow(
  budget: Pick<IBudget, 'duration' | 'startAt' | 'endAt'>,
  reference: Date = new Date(),
): { startAt: string; endAt: string } {
  if (budget.duration === 'custom') {
    return { startAt: budget.startAt, endAt: budget.endAt };
  }
  return deriveBudgetRange(budget.duration, reference);
}

export function isBudgetActive(
  budget: Pick<IBudget, 'duration' | 'startAt' | 'endAt'>,
  reference: Date = new Date(),
): boolean {
  const { startAt, endAt } = getBudgetWindow(budget, reference);
  const today = dayjs(reference).format(DATE_FORMAT);
  return today >= startAt && today <= endAt;
}

export interface IBudgetUsage {
  used: number;
  remaining: number;
  percent: number;
  startAt: string;
  endAt: string;
}

export function computeBudgetUsage(
  budget: IBudget,
  transactions: ITransaction[],
  reference: Date = new Date(),
): IBudgetUsage {
  const { startAt, endAt } = getBudgetWindow(budget, reference);
  let used = 0;
  for (const txn of transactions) {
    if (txn.kind !== 'expense') continue;
    if (txn.categoryId !== budget.categoryId) continue;
    if (txn.accountId !== budget.accountId) continue;
    if (txn.date < startAt || txn.date > endAt) continue;
    used += txn.amount;
  }
  const remaining = budget.amount - used;
  const percent = budget.amount > 0 ? (used / budget.amount) * 100 : 0;
  return {
    used: Math.round(used * 100) / 100,
    remaining: Math.round(remaining * 100) / 100,
    percent: Math.round(percent * 10) / 10,
    startAt,
    endAt,
  };
}
