import { useMemo, useState } from 'react';
import { Badge, Group, Loader, Progress, SegmentedControl, Stack, Text } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconArrowsExchange,
  IconChartPie,
  IconScale,
  IconWallet,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { PageHeader, StatCard } from '../../../components/common';
import { formatCurrency } from '../../../utils/format';
import { useAccounts } from '../../accounts/hooks/useAccounts';
import { useCategories } from '../../categories/hooks/useCategories';
import { useTransactions } from '../../transactions/hooks/useTransactions';
import { computeAccountBalance, totalsByKind } from '../../transactions/utils';
import { useBudgets } from '../../budgets/hooks/useBudgets';
import { computeBudgetUsage, isBudgetActive } from '../../budgets/utils';
import { SpendingByCategoryChart } from './SpendingByCategoryChart';
import { IncomeExpenseTrendChart } from './IncomeExpenseTrendChart';
import './DashboardPage.css';

type PeriodKey = 'this-month' | 'last-month' | 'last-3-months' | 'ytd' | 'custom';

const DATE_FORMAT = 'YYYY-MM-DD';

function getPeriodRange(period: PeriodKey): { from: string; to: string; label: string } {
  const now = dayjs();
  switch (period) {
    case 'last-month': {
      const ref = now.subtract(1, 'month');
      return {
        from: ref.startOf('month').format(DATE_FORMAT),
        to: ref.endOf('month').format(DATE_FORMAT),
        label: ref.format('MMM YYYY'),
      };
    }
    case 'last-3-months':
      return {
        from: now.subtract(2, 'month').startOf('month').format(DATE_FORMAT),
        to: now.endOf('month').format(DATE_FORMAT),
        label: 'Last 3 months',
      };
    case 'ytd':
      return {
        from: now.startOf('year').format(DATE_FORMAT),
        to: now.endOf('day').format(DATE_FORMAT),
        label: 'Year to date',
      };
    case 'this-month':
    default:
      return {
        from: now.startOf('month').format(DATE_FORMAT),
        to: now.endOf('month').format(DATE_FORMAT),
        label: now.format('MMM YYYY'),
      };
  }
}

export function DashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>('this-month');
  const [customRange, setCustomRange] = useState<[string | null, string | null]>([
    null,
    null,
  ]);

  const range = useMemo(() => {
    if (period === 'custom') {
      const [from, to] = customRange;
      const resolvedFrom = from ?? dayjs().startOf('month').format(DATE_FORMAT);
      const resolvedTo = to ?? dayjs().endOf('month').format(DATE_FORMAT);
      return {
        from: resolvedFrom,
        to: resolvedTo,
        label:
          from && to
            ? `${dayjs(from).format('MMM D')} – ${dayjs(to).format('MMM D, YYYY')}`
            : 'Custom range',
      };
    }
    return getPeriodRange(period);
  }, [period, customRange]);

  const { data: accounts = [], isLoading: aLoading } = useAccounts();
  const { data: transactions = [], isLoading: tLoading } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { data: budgets = [] } = useBudgets();

  const isLoading = aLoading || tLoading;

  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + computeAccountBalance(a, transactions), 0),
    [accounts, transactions],
  );

  const inRange = useMemo(
    () => transactions.filter((t) => t.date >= range.from && t.date <= range.to),
    [transactions, range.from, range.to],
  );

  const totals = useMemo(() => totalsByKind(inRange), [inRange]);

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const recent = useMemo(
    () =>
      [...transactions]
        .sort((a, b) =>
          b.date === a.date
            ? b.createdAt.localeCompare(a.createdAt)
            : b.date.localeCompare(a.date),
        )
        .slice(0, 6),
    [transactions],
  );

  const accountSummaries = useMemo(
    () =>
      accounts
        .map((a) => ({ account: a, balance: computeAccountBalance(a, transactions) }))
        .sort((a, b) => b.balance - a.balance),
    [accounts, transactions],
  );

  const budgetSummaries = useMemo(
    () =>
      budgets
        .filter((b) => isBudgetActive(b))
        .map((b) => ({
          budget: b,
          usage: computeBudgetUsage(b, transactions),
          category: categoryById.get(b.categoryId),
        }))
        .sort((a, b) => b.usage.percent - a.usage.percent),
    [budgets, transactions, categoryById],
  );

  return (
    <div className="page">
      <PageHeader
        title="Dashboard"
        subtitle={`Overview for ${range.label}`}
        actions={
          <Group gap="sm" wrap="wrap">
            <SegmentedControl
              value={period}
              onChange={(value) => setPeriod(value as PeriodKey)}
              data={[
                { value: 'this-month', label: 'This month' },
                { value: 'last-month', label: 'Last month' },
                { value: 'last-3-months', label: '3 mo' },
                { value: 'ytd', label: 'YTD' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
            {period === 'custom' && (
              <DatePickerInput
                type="range"
                valueFormat="MMM D, YYYY"
                placeholder="Pick a date range"
                clearable
                value={[
                  customRange[0] ? dayjs(customRange[0]).toDate() : null,
                  customRange[1] ? dayjs(customRange[1]).toDate() : null,
                ]}
                onChange={([from, to]) =>
                  setCustomRange([
                    from ? dayjs(from).format(DATE_FORMAT) : null,
                    to ? dayjs(to).format(DATE_FORMAT) : null,
                  ])
                }
                miw={240}
              />
            )}
          </Group>
        }
      />

      {isLoading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : (
        <>
          <div className="dash-stat-grid">
            <StatCard
              label="Total balance"
              value={formatCurrency(totalBalance)}
              icon={<IconWallet size={18} />}
              tone="primary"
              hint={`Across ${accounts.length} accounts`}
            />
            <StatCard
              label="Income"
              value={formatCurrency(totals.income)}
              icon={<IconArrowDownLeft size={18} />}
              tone="positive"
            />
            <StatCard
              label="Expenses"
              value={formatCurrency(totals.expense)}
              icon={<IconArrowUpRight size={18} />}
              tone="negative"
            />
            <StatCard
              label="Net"
              value={formatCurrency(totals.net)}
              icon={<IconScale size={18} />}
              tone={totals.net >= 0 ? 'positive' : 'negative'}
            />
          </div>

          <div className="dash-chart-grid">
            <div className="surface-card surface-card-padded dash-card">
              <div className="dash-card-header">
                <h3 className="dash-card-title">Spending by category</h3>
                <Text size="xs" c="dimmed">
                  {range.label}
                </Text>
              </div>
              <SpendingByCategoryChart transactions={inRange} categories={categories} />
            </div>
            <div className="surface-card surface-card-padded dash-card">
              <div className="dash-card-header">
                <h3 className="dash-card-title">Income vs Expense</h3>
                <Text size="xs" c="dimmed">
                  Last 6 months
                </Text>
              </div>
              <IncomeExpenseTrendChart transactions={transactions} />
            </div>
          </div>

          <div className="dash-bottom-grid">
            <div className="surface-card surface-card-padded dash-card">
              <div className="dash-card-header">
                <h3 className="dash-card-title">Recent transactions</h3>
              </div>
              {recent.length === 0 ? (
                <Text c="dimmed" size="sm" py="md">
                  No transactions yet.
                </Text>
              ) : (
                <Stack gap="xs">
                  {recent.map((t) => {
                    const cat = t.categoryId ? categoryById.get(t.categoryId) : null;
                    const isIncome = t.kind === 'income';
                    const isExpense = t.kind === 'expense';
                    const Icon = isIncome
                      ? IconArrowDownLeft
                      : isExpense
                        ? IconArrowUpRight
                        : IconArrowsExchange;
                    return (
                      <div className="dash-recent-row" key={t.id}>
                        <div className="dash-recent-icon" data-kind={t.kind}>
                          <Icon size={14} />
                        </div>
                        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" fw={500} truncate>
                            {t.notes || cat?.name || t.kind}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {dayjs(t.date).format('MMM D')}
                            {cat ? ` • ${cat.name}` : ''}
                          </Text>
                        </Stack>
                        <Text
                          size="sm"
                          fw={600}
                          className={
                            isIncome
                              ? 'amount-positive'
                              : isExpense
                                ? 'amount-negative'
                                : 'amount-neutral'
                          }
                        >
                          {isIncome ? '+' : isExpense ? '−' : ''}
                          {formatCurrency(t.amount)}
                        </Text>
                      </div>
                    );
                  })}
                </Stack>
              )}
            </div>

            <div className="surface-card surface-card-padded dash-card">
              <div className="dash-card-header">
                <h3 className="dash-card-title">Accounts</h3>
              </div>
              {accountSummaries.length === 0 ? (
                <Text c="dimmed" size="sm" py="md">
                  No accounts yet.
                </Text>
              ) : (
                <Stack gap="xs">
                  {accountSummaries.map(({ account, balance }) => (
                    <div className="dash-account-row" key={account.id}>
                      <Stack gap={0}>
                        <Text size="sm" fw={500}>
                          {account.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Initial {formatCurrency(account.initialAmount)}
                        </Text>
                      </Stack>
                      <Text
                        size="sm"
                        fw={600}
                        className={
                          balance < 0 ? 'amount-negative' : 'amount-neutral'
                        }
                      >
                        {formatCurrency(balance)}
                      </Text>
                    </div>
                  ))}
                </Stack>
              )}
            </div>

            <div className="surface-card surface-card-padded dash-card dash-card-budgets">
              <div className="dash-card-header">
                <h3 className="dash-card-title">Budget progress</h3>
                <IconChartPie size={16} />
              </div>
              {budgetSummaries.length === 0 ? (
                <Text c="dimmed" size="sm" py="md">
                  No active budgets.
                </Text>
              ) : (
                <Stack gap="md">
                  {budgetSummaries.slice(0, 4).map(({ budget, usage, category }) => (
                    <Stack gap={4} key={budget.id}>
                      <Group justify="space-between" gap="xs">
                        <Text size="sm" fw={500}>
                          {category?.name ?? 'Category'}
                        </Text>
                        <Badge
                          size="xs"
                          variant="light"
                          color={usage.percent >= 100 ? 'red' : usage.percent >= 80 ? 'orange' : 'indigo'}
                        >
                          {usage.percent.toFixed(0)}%
                        </Badge>
                      </Group>
                      <Progress
                        value={Math.min(usage.percent, 100)}
                        size="sm"
                        radius="xl"
                        color={usage.percent >= 100 ? 'red' : usage.percent >= 80 ? 'orange' : 'indigo'}
                      />
                      <Group justify="space-between">
                        <Text size="xs" c="dimmed">
                          {formatCurrency(usage.used)} / {formatCurrency(budget.amount)}
                        </Text>
                      </Group>
                    </Stack>
                  ))}
                </Stack>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
