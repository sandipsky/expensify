import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconArrowsExchange,
  IconPencil,
  IconPlus,
  IconReceipt2,
  IconSearch,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { EmptyState, PageHeader } from '../../../components/common';
import { formatCurrency } from '../../../utils/format';
import { useAccounts } from '../../accounts/hooks/useAccounts';
import { useCategories } from '../../categories/hooks/useCategories';
import {
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from '../hooks/useTransactions';
import type { ITransaction, TransactionKind } from '../types';
import type { ITransactionFormValues } from '../validations';
import { TransactionFormModal } from './TransactionFormModal';
import './TransactionsPage.css';

type KindFilter = TransactionKind | 'all';

const KIND_META: Record<
  TransactionKind,
  { label: string; color: string; sign: 1 | -1 | 0 }
> = {
  income: { label: 'Income', color: 'teal', sign: 1 },
  expense: { label: 'Expense', color: 'red', sign: -1 },
  transfer: { label: 'Transfer', color: 'gray', sign: 0 },
};

export function TransactionsPage() {
  const [modalOpened, setModalOpened] = useState(false);
  const [editing, setEditing] = useState<ITransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ITransaction | null>(null);

  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: transactions = [], isLoading } = useTransactions();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (kindFilter !== 'all' && t.kind !== kindFilter) return false;
      if (accountFilter && t.accountId !== accountFilter && t.toAccountId !== accountFilter)
        return false;
      if (categoryFilter && t.categoryId !== categoryFilter) return false;
      if (q && !t.notes.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [transactions, kindFilter, accountFilter, categoryFilter, search]);

  const openCreate = () => {
    setEditing(null);
    setModalOpened(true);
  };

  const openEdit = (txn: ITransaction) => {
    setEditing(txn);
    setModalOpened(true);
  };

  const handleSubmit = (values: ITransactionFormValues) => {
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, values },
        {
          onSuccess: () => {
            setModalOpened(false);
            setEditing(null);
            notifications.show({ message: 'Transaction updated', color: 'teal' });
          },
          onError: (error) => {
            notifications.show({
              title: 'Update failed',
              message: (error as Error).message,
              color: 'red',
            });
          },
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          setModalOpened(false);
          notifications.show({ message: 'Transaction added', color: 'teal' });
        },
        onError: (error) => {
          notifications.show({
            title: 'Could not add transaction',
            message:
              (error as Error).message ||
              'Check that the mock API is running (npm run mock-api).',
            color: 'red',
          });
        },
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        notifications.show({ message: 'Transaction deleted', color: 'teal' });
      },
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const resetFilters = () => {
    setKindFilter('all');
    setAccountFilter(null);
    setCategoryFilter(null);
    setSearch('');
  };

  const hasActiveFilters =
    kindFilter !== 'all' || accountFilter || categoryFilter || search;

  return (
    <div className="page txn-page">
      <PageHeader
        title="Transactions"
        subtitle="All movements across your accounts."
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            New transaction
          </Button>
        }
      />

      <div className="txn-filters surface-card surface-card-padded">
        <TextInput
          placeholder="Search notes…"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          className="txn-filters-search"
        />
        <Select
          placeholder="All kinds"
          value={kindFilter === 'all' ? null : kindFilter}
          onChange={(value) => setKindFilter((value as KindFilter) ?? 'all')}
          data={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
            { value: 'transfer', label: 'Transfer' },
          ]}
          clearable
        />
        <Select
          placeholder="All accounts"
          value={accountFilter}
          onChange={setAccountFilter}
          data={accounts.map((a) => ({ value: a.id, label: a.name }))}
          clearable
          searchable
        />
        <Select
          placeholder="All categories"
          value={categoryFilter}
          onChange={setCategoryFilter}
          data={categories.map((c) => ({ value: c.id, label: c.name }))}
          clearable
          searchable
        />
        {hasActiveFilters && (
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconX size={14} />}
            onClick={resetFilters}
          >
            Reset
          </Button>
        )}
      </div>

      {isLoading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IconReceipt2 size={28} />}
          title={transactions.length === 0 ? 'No transactions yet' : 'Nothing matches your filters'}
          description={
            transactions.length === 0
              ? 'Record your first transaction to start tracking.'
              : 'Try removing some filters.'
          }
          action={
            transactions.length === 0 ? (
              <Button mt="sm" leftSection={<IconPlus size={16} />} onClick={openCreate}>
                Add transaction
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="surface-card txn-table-wrap">
          <Table.ScrollContainer
            minWidth={760}
            maxHeight="100%"
            className="txn-table-scroll"
          >
            <Table
              stickyHeader
              verticalSpacing="sm"
              highlightOnHover
              className="txn-table"
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 44 }} />
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Category</Table.Th>
                  <Table.Th>Account</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
                  <Table.Th style={{ width: 88 }} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.map((txn) => {
                  const meta = KIND_META[txn.kind];
                  const fromAccount = accountById.get(txn.accountId);
                  const toAccount = txn.toAccountId
                    ? accountById.get(txn.toAccountId)
                    : null;
                  const category = txn.categoryId
                    ? categoryById.get(txn.categoryId)
                    : null;

                  const KindIcon =
                    txn.kind === 'income'
                      ? IconArrowDownLeft
                      : txn.kind === 'expense'
                        ? IconArrowUpRight
                        : IconArrowsExchange;

                  return (
                    <Table.Tr key={txn.id}>
                      <Table.Td>
                        <div className="txn-kind-badge" data-kind={txn.kind}>
                          <KindIcon size={16} />
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={2}>
                          <Text fw={500}>{txn.notes || meta.label}</Text>
                          {txn.kind === 'transfer' && toAccount && (
                            <Text size="xs" c="dimmed">
                              {fromAccount?.name} → {toAccount.name}
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        {category ? (
                          <Badge size="sm" variant="light" color={category.type === 'income' ? 'teal' : 'indigo'}>
                            {category.name}
                          </Badge>
                        ) : (
                          <Text size="sm" c="dimmed">
                            —
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{fromAccount?.name ?? '—'}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {dayjs(txn.date).format('MMM D, YYYY')}
                        </Text>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text
                          fw={600}
                          className={
                            meta.sign === 1
                              ? 'amount-positive'
                              : meta.sign === -1
                                ? 'amount-negative'
                                : 'amount-neutral'
                          }
                        >
                          {meta.sign === 1 ? '+' : meta.sign === -1 ? '−' : ''}
                          {formatCurrency(txn.amount)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} justify="flex-end">
                          <Tooltip label="Edit" withArrow>
                            <ActionIcon
                              variant="subtle"
                              aria-label="Edit transaction"
                              onClick={() => openEdit(txn)}
                            >
                              <IconPencil size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Delete" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              aria-label="Delete transaction"
                              onClick={() => setDeleteTarget(txn)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </div>
      )}

      <TransactionFormModal
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
        title="Delete transaction"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">Delete this transaction? This cannot be undone.</Text>
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
