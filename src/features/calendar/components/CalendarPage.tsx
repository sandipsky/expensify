import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Drawer,
  Group,
  Loader,
  SegmentedControl,
  Stack,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconChevronLeft,
  IconChevronRight,
  IconPaperclip,
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

type CalendarView = 'month' | 'week';

export function CalendarPage() {
  const [view, setView] = useState<CalendarView>('month');
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

  const days = useMemo(
    () => (view === 'month' ? buildMonthGrid(cursor) : buildWeekGrid(cursor)),
    [cursor, view],
  );

  const transactionsByDate = useMemo(() => {
    const map = new Map<string, { count: number; net: number }>();
    for (const txn of transactions) {
      const entry = map.get(txn.date) ?? { count: 0, net: 0 };
      entry.count += 1;
      if (txn.kind !== 'transfer') {
        entry.net += txn.kind === 'income' ? txn.amount : -txn.amount;
      }
      map.set(txn.date, entry);
    }
    return map;
  }, [transactions]);

  const periodLabel =
    view === 'month'
      ? cursor.format('MMMM YYYY')
      : `${cursor.startOf('isoWeek').format('MMM D')} – ${cursor
          .endOf('isoWeek')
          .format('MMM D, YYYY')}`;

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

  const goToToday = () => {
    setCursor(view === 'month' ? dayjs().startOf('month') : dayjs().startOf('isoWeek'));
  };

  const step = (direction: -1 | 1) => {
    const unit = view === 'month' ? 'month' : 'week';
    setCursor((c) => c.add(direction, unit));
  };

  const handleViewChange = (value: string) => {
    const next = value as CalendarView;
    setView(next);
    setCursor((c) => {
      if (next === 'month') return c.startOf('month');
      return c.isSame(dayjs(), 'month')
        ? dayjs().startOf('isoWeek')
        : c.startOf('month').startOf('isoWeek');
    });
  };

  return (
    <div className="page">
      <PageHeader
        title="Calendar"
        subtitle="See activity by day. Click a date to drill in or quick-add."
        actions={
          <Group gap="sm" wrap="wrap">
            <SegmentedControl
              value={view}
              onChange={handleViewChange}
              data={[
                { value: 'month', label: 'Month' },
                { value: 'week', label: 'Week' },
              ]}
            />
            <Button variant="default" onClick={goToToday}>
              Today
            </Button>
            <Group gap={4}>
              <ActionIcon
                variant="default"
                aria-label={view === 'month' ? 'Previous month' : 'Previous week'}
                onClick={() => step(-1)}
              >
                <IconChevronLeft size={16} />
              </ActionIcon>
              <ActionIcon
                variant="default"
                aria-label={view === 'month' ? 'Next month' : 'Next week'}
                onClick={() => step(1)}
              >
                <IconChevronRight size={16} />
              </ActionIcon>
            </Group>
          </Group>
        }
      />

      <div className="cal-toolbar">
        <h2 className="cal-month-title">{periodLabel}</h2>
      </div>

      {isLoading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : (
        <div className="cal-grid surface-card" data-view={view}>
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
              const isCurrentMonth =
                view === 'week' ? true : day.month() === cursor.month();
              const isToday = day.isSame(dayjs(), 'day');
              const stats = transactionsByDate.get(dateKey);
              return (
                <div
                  key={dateKey}
                  className="cal-cell"
                  data-current-month={isCurrentMonth}
                  data-today={isToday}
                  data-view={view}
                >
                  <div className="cal-cell-head">
                    <button
                      type="button"
                      className="cal-cell-date-btn"
                      onClick={() => setSelectedDate(dateKey)}
                      aria-label={`View ${day.format('dddd, MMM D')}`}
                    >
                      <span className="cal-cell-date">{day.format('D')}</span>
                    </button>
                    <button
                      type="button"
                      className="cal-cell-add"
                      onClick={() => setQuickAddDate(dateKey)}
                      aria-label={`Add transaction on ${day.format('MMM D')}`}
                    >
                      <IconPlus size={12} />
                    </button>
                  </div>
                  {stats && stats.count > 0 && (
                    <button
                      type="button"
                      className="cal-cell-body"
                      onClick={() => setSelectedDate(dateKey)}
                    >
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
                    </button>
                  )}
                </div>
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
                      <Group gap={6} wrap="nowrap">
                        <Text size="sm" fw={500}>
                          {txn.notes || category?.name || txn.kind}
                        </Text>
                        {txn.attachment && (
                          <Anchor
                            href={txn.attachment.dataUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={txn.attachment.name}
                            aria-label="View attachment"
                            c="dimmed"
                            style={{ display: 'inline-flex' }}
                          >
                            <IconPaperclip size={13} />
                          </Anchor>
                        )}
                      </Group>
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

function buildWeekGrid(cursor: Dayjs): Dayjs[] {
  const start = cursor.startOf('isoWeek');
  const days: Dayjs[] = [];
  for (let i = 0; i < 7; i += 1) {
    days.push(start.add(i, 'day'));
  }
  return days;
}
