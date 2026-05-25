import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Drawer,
  Group,
  Loader,
  Stack,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
} from '@tabler/icons-react';
import dayjs, { type Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { PageHeader } from '../../../components/common';
import { formatCurrency, formatSignedCurrency } from '../../../utils/format';
import { useCategories } from '../../categories/hooks/useCategories';
import {
  TransactionFormModal,
  useCreateTransaction,
  useTransactions,
} from '../../transactions';
import './CalendarPage.css';

dayjs.extend(isoWeek);

const DATE_FORMAT = 'YYYY-MM-DD';

export function CalendarPage() {
  const [cursor, setCursor] = useState<Dayjs>(dayjs().startOf('month'));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);

  const { data: transactions = [], isLoading } = useTransactions();
  const { data: categories = [] } = useCategories();
  const createMutation = useCreateTransaction();

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const days = useMemo(() => buildMonthGrid(cursor), [cursor]);

  const transactionsByDate = useMemo(() => {
    const map = new Map<string, { count: number; net: number }>();
    for (const txn of transactions) {
      if (txn.kind === 'transfer') {
        const entry = map.get(txn.date) ?? { count: 0, net: 0 };
        entry.count += 1;
        map.set(txn.date, entry);
        continue;
      }
      const delta = txn.kind === 'income' ? txn.amount : -txn.amount;
      const entry = map.get(txn.date) ?? { count: 0, net: 0 };
      entry.count += 1;
      entry.net += delta;
      map.set(txn.date, entry);
    }
    return map;
  }, [transactions]);

  const monthLabel = cursor.format('MMMM YYYY');

  const selectedTxns = useMemo(
    () =>
      selectedDate
        ? transactions
            .filter((t) => t.date === selectedDate)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        : [],
    [transactions, selectedDate],
  );

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="page">
      <PageHeader
        title="Calendar"
        subtitle="See activity by day. Click a date to drill in or quick-add."
        actions={
          <Group gap="sm">
            <Button
              variant="default"
              onClick={() => setCursor(dayjs().startOf('month'))}
            >
              Today
            </Button>
            <Group gap={4}>
              <ActionIcon
                variant="default"
                aria-label="Previous month"
                onClick={() => setCursor((c) => c.subtract(1, 'month'))}
              >
                <IconChevronLeft size={16} />
              </ActionIcon>
              <ActionIcon
                variant="default"
                aria-label="Next month"
                onClick={() => setCursor((c) => c.add(1, 'month'))}
              >
                <IconChevronRight size={16} />
              </ActionIcon>
            </Group>
          </Group>
        }
      />

      <div className="cal-toolbar">
        <h2 className="cal-month-title">{monthLabel}</h2>
      </div>

      {isLoading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : (
        <div className="cal-grid surface-card">
          <div className="cal-header-row">
            {dayNames.map((d) => (
              <div className="cal-header-cell" key={d}>
                {d}
              </div>
            ))}
          </div>
          <div className="cal-body">
            {days.map((day) => {
              const dateKey = day.format(DATE_FORMAT);
              const isCurrentMonth = day.month() === cursor.month();
              const isToday = day.isSame(dayjs(), 'day');
              const stats = transactionsByDate.get(dateKey);
              return (
                <button
                  key={dateKey}
                  type="button"
                  className="cal-cell"
                  data-current-month={isCurrentMonth}
                  data-today={isToday}
                  onClick={() => setSelectedDate(dateKey)}
                >
                  <div className="cal-cell-head">
                    <span className="cal-cell-date">{day.format('D')}</span>
                    <span
                      className="cal-cell-add"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickAddDate(dateKey);
                      }}
                      aria-label="Quick add"
                      role="button"
                    >
                      <IconPlus size={12} />
                    </span>
                  </div>
                  {stats && stats.count > 0 && (
                    <div className="cal-cell-body">
                      <Badge size="xs" variant="light" color="gray">
                        {stats.count} {stats.count === 1 ? 'txn' : 'txns'}
                      </Badge>
                      {stats.net !== 0 && (
                        <span
                          className={
                            stats.net > 0 ? 'amount-positive' : 'amount-negative'
                          }
                          style={{ fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          {formatSignedCurrency(stats.net)}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Drawer
        opened={Boolean(selectedDate)}
        onClose={() => setSelectedDate(null)}
        position="right"
        size="sm"
        title={
          selectedDate ? dayjs(selectedDate).format('dddd, MMM D, YYYY') : ''
        }
        padding="lg"
      >
        <Stack gap="sm">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {selectedTxns.length}{' '}
              {selectedTxns.length === 1 ? 'transaction' : 'transactions'}
            </Text>
            <Button
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={() => {
                if (selectedDate) setQuickAddDate(selectedDate);
              }}
            >
              Add
            </Button>
          </Group>

          {selectedTxns.length === 0 ? (
            <Text c="dimmed" size="sm">
              No transactions on this day.
            </Text>
          ) : (
            <Stack gap="xs">
              {selectedTxns.map((txn) => {
                const category = txn.categoryId
                  ? categoryById.get(txn.categoryId)
                  : null;
                const isIncome = txn.kind === 'income';
                const isExpense = txn.kind === 'expense';
                return (
                  <div className="cal-day-item" key={txn.id}>
                    <Stack gap={2}>
                      <Text size="sm" fw={500}>
                        {txn.notes || category?.name || txn.kind}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {category?.name ?? (txn.kind === 'transfer' ? 'Transfer' : '—')}
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
                      {formatCurrency(txn.amount)}
                    </Text>
                  </div>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Drawer>

      <TransactionFormModal
        opened={Boolean(quickAddDate)}
        onClose={() => setQuickAddDate(null)}
        defaultDate={quickAddDate ?? undefined}
        onSubmit={(values) =>
          createMutation.mutate(values, {
            onSuccess: () => {
              setQuickAddDate(null);
              notifications.show({ message: 'Transaction added', color: 'teal' });
            },
            onError: (error) =>
              notifications.show({
                title: 'Could not add transaction',
                message:
                  (error as Error).message ||
                  'Check that the mock API is running (npm run mock-api).',
                color: 'red',
              }),
          })
        }
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}

function buildMonthGrid(cursor: Dayjs): Dayjs[] {
  const start = cursor.startOf('month').startOf('isoWeek');
  const end = cursor.endOf('month').endOf('isoWeek');
  const days: Dayjs[] = [];
  let d = start;
  while (d.isBefore(end) || d.isSame(end, 'day')) {
    days.push(d);
    d = d.add(1, 'day');
  }
  return days;
}
