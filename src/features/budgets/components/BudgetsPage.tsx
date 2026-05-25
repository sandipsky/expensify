import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Progress,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconChartPie,
  IconPencil,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { EmptyState, PageHeader } from '../../../components/common';
import { formatCurrency } from '../../../utils/format';
import { useAccounts } from '../../accounts/hooks/useAccounts';
import { useCategories } from '../../categories/hooks/useCategories';
import { useTransactions } from '../../transactions/hooks/useTransactions';
import {
  useBudgets,
  useCreateBudget,
  useDeleteBudget,
  useUpdateBudget,
} from '../hooks/useBudgets';
import { computeBudgetUsage } from '../utils';
import type { IBudget } from '../types';
import type { IBudgetFormValues } from '../validations';
import { BudgetFormModal } from './BudgetFormModal';
import './BudgetsPage.css';

function progressColor(percent: number): string {
  if (percent >= 100) return 'red';
  if (percent >= 80) return 'orange';
  return 'indigo';
}

export function BudgetsPage() {
  const [modalOpened, setModalOpened] = useState(false);
  const [editing, setEditing] = useState<IBudget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IBudget | null>(null);

  const { data: budgets = [], isLoading } = useBudgets();
  const { data: transactions = [] } = useTransactions();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();

  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();

  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const enriched = useMemo(
    () =>
      budgets.map((budget) => ({
        budget,
        usage: computeBudgetUsage(budget, transactions),
        category: categoryById.get(budget.categoryId),
        account: accountById.get(budget.accountId),
      })),
    [budgets, transactions, categoryById, accountById],
  );

  const openCreate = () => {
    setEditing(null);
    setModalOpened(true);
  };

  const openEdit = (budget: IBudget) => {
    setEditing(budget);
    setModalOpened(true);
  };

  const handleSubmit = (values: IBudgetFormValues) => {
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, values },
        {
          onSuccess: () => {
            setModalOpened(false);
            setEditing(null);
            notifications.show({ message: 'Budget updated', color: 'teal' });
          },
          onError: (error) =>
            notifications.show({
              title: 'Update failed',
              message: (error as Error).message,
              color: 'red',
            }),
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          setModalOpened(false);
          notifications.show({ message: 'Budget created', color: 'teal' });
        },
        onError: (error) =>
          notifications.show({
            title: 'Could not create budget',
            message:
              (error as Error).message ||
              'Check that the mock API is running (npm run mock-api).',
            color: 'red',
          }),
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        notifications.show({ message: 'Budget deleted', color: 'teal' });
      },
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="page">
      <PageHeader
        title="Budgets"
        subtitle="Cap your spending per category and account."
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            New budget
          </Button>
        }
      />

      {isLoading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={<IconChartPie size={28} />}
          title="No budgets yet"
          description="Create a budget to track your spending against a target."
          action={
            <Button mt="sm" leftSection={<IconPlus size={16} />} onClick={openCreate}>
              Add budget
            </Button>
          }
        />
      ) : (
        <div className="budgets-grid">
          {enriched.map(({ budget, usage, category, account }) => (
            <div className="budget-card" key={budget.id}>
              <div className="budget-card-header">
                <Stack gap={2}>
                  <Text fw={600}>{category?.name ?? 'Category'}</Text>
                  <Group gap={6}>
                    <Badge size="xs" variant="light" color="gray">
                      {account?.name ?? 'Account'}
                    </Badge>
                    <Badge size="xs" variant="light" color="indigo">
                      {budget.duration}
                    </Badge>
                  </Group>
                </Stack>
                <Group gap={4}>
                  <Tooltip label="Edit" withArrow>
                    <ActionIcon variant="subtle" onClick={() => openEdit(budget)}>
                      <IconPencil size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Delete" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => setDeleteTarget(budget)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </div>

              <div className="budget-card-amounts">
                <div>
                  <span className="budget-card-amount-label">Used</span>
                  <span className="budget-card-amount-value">
                    {formatCurrency(usage.used)}
                  </span>
                </div>
                <div className="budget-card-amount-divider" />
                <div>
                  <span className="budget-card-amount-label">Budget</span>
                  <span className="budget-card-amount-value">
                    {formatCurrency(budget.amount)}
                  </span>
                </div>
              </div>

              <Progress
                value={Math.min(usage.percent, 100)}
                color={progressColor(usage.percent)}
                size="sm"
                radius="xl"
              />

              <div className="budget-card-footer">
                <Text size="xs" c="dimmed">
                  {dayjs(budget.startAt).format('MMM D')} – {dayjs(budget.endAt).format('MMM D, YYYY')}
                </Text>
                <Text
                  size="xs"
                  fw={600}
                  c={usage.remaining < 0 ? 'red' : 'dimmed'}
                >
                  {usage.remaining >= 0
                    ? `${formatCurrency(usage.remaining)} left`
                    : `${formatCurrency(Math.abs(usage.remaining))} over`}
                </Text>
              </div>
            </div>
          ))}
        </div>
      )}

      <BudgetFormModal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        initialValue={editing ?? undefined}
        isSubmitting={isSubmitting}
      />

      <Modal
        opened={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete budget"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">Delete this budget? This cannot be undone.</Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              color="red"
              loading={deleteMutation.isPending}
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
