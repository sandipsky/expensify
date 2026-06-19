import { useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Table,
  Tabs,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconCategory,
  IconPencil,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useTransactions } from '../../transactions/hooks/useTransactions';
import { useBudgets } from '../../budgets/hooks/useBudgets';
import { getCategoryIcon } from '../constants';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '../hooks/useCategories';
import type { ICategory, CategoryType } from '../types';
import type { ICategoryFormValues } from '../validations';
import { CategoryFormModal, makeUniqueKey } from './CategoryFormModal';
import './CategoriesPage.css';

type TabValue = 'all' | CategoryType;

export function CategoriesPage() {
  const [tab, setTab] = useState<TabValue>('all');
  const [modalOpened, setModalOpened] = useState(false);
  const [editing, setEditing] = useState<ICategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ICategory | null>(null);

  const { data: categories = [], isLoading } = useCategories();
  const { data: transactions = [] } = useTransactions();
  const { data: budgets = [] } = useBudgets();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const filtered = useMemo(() => {
    if (tab === 'all') return categories;
    return categories.filter((category) => category.type === tab);
  }, [categories, tab]);

  // A category referenced by any transaction or budget cannot be deleted.
  const referencedCategoryIds = useMemo(() => {
    const set = new Set<string>();
    for (const txn of transactions) {
      if (txn.categoryId) set.add(txn.categoryId);
    }
    for (const budget of budgets) {
      set.add(budget.categoryId);
    }
    return set;
  }, [transactions, budgets]);

  const deleteTargetInUse = deleteTarget
    ? referencedCategoryIds.has(deleteTarget.id)
    : false;

  const existingNames = useMemo(() => {
    const set = new Set<string>();
    for (const category of categories) {
      if (editing && category.id === editing.id) continue;
      set.add(makeUniqueKey(category.name, category.type));
    }
    return set;
  }, [categories, editing]);

  const openCreate = () => {
    setEditing(null);
    setModalOpened(true);
  };

  const openEdit = (category: ICategory) => {
    setEditing(category);
    setModalOpened(true);
  };

  const handleSubmit = (values: ICategoryFormValues) => {
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, values: { name: values.name, icon: values.icon } },
        {
          onSuccess: () => {
            setModalOpened(false);
            setEditing(null);
            notifications.show({ message: 'Category updated', color: 'teal' });
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
          notifications.show({ message: 'Category created', color: 'teal' });
        },
        onError: (error) =>
          notifications.show({
            title: 'Could not create category',
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
    if (referencedCategoryIds.has(deleteTarget.id)) {
      notifications.show({
        title: 'Cannot delete',
        message: 'Category is referenced by transactions or budgets.',
        color: 'red',
      });
      return;
    }
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        notifications.show({ message: 'Category deleted', color: 'teal' });
      },
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="categories-page">
      <div className="categories-page-header">
        <div>
          <h1 className="categories-page-title">Categories</h1>
          <p className="categories-page-subtitle">
            Organize transactions by income and expense type.
          </p>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          New category
        </Button>
      </div>

      <Tabs value={tab} onChange={(value) => setTab((value ?? 'all') as TabValue)}>
        <Tabs.List>
          <Tabs.Tab value="all">All</Tabs.Tab>
          <Tabs.Tab value="expense">Expense</Tabs.Tab>
          <Tabs.Tab value="income">Income</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {isLoading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : filtered.length === 0 ? (
        <div className="categories-page-empty">
          <IconCategory size={28} />
          <Stack gap={2} align="center">
            <span>No categories yet</span>
            <span style={{ fontSize: '0.8rem' }}>
              Create your first category to start tagging transactions.
            </span>
          </Stack>
        </div>
      ) : (
        <Table.ScrollContainer
          minWidth={520}
          maxHeight="100%"
          className="categories-page-scroll"
        >
          <Table
            stickyHeader
            highlightOnHover
            withTableBorder
            withColumnBorders={false}
            verticalSpacing="sm"
            className="categories-page-table"
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 56 }} />
                <Table.Th>Name</Table.Th>
                <Table.Th style={{ width: 120 }}>Type</Table.Th>
                <Table.Th style={{ width: 96, textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((category) => {
                const Icon = getCategoryIcon(category.icon);
                return (
                  <Table.Tr key={category.id}>
                    <Table.Td>
                      <div className="categories-page-row-icon">
                        <Icon size={18} />
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>{category.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        variant="light"
                        color={category.type === 'income' ? 'teal' : 'red'}
                      >
                        {category.type}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="flex-end">
                        <Tooltip label="Edit" withArrow>
                          <ActionIcon
                            variant="subtle"
                            aria-label="Edit category"
                            onClick={() => openEdit(category)}
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete" withArrow>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            aria-label="Delete category"
                            onClick={() => setDeleteTarget(category)}
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
      )}

      <CategoryFormModal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        initialValue={editing ?? undefined}
        isSubmitting={isSubmitting}
        existingNames={existingNames}
      />

      <Modal
        opened={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete category"
        centered
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
          </Text>
          {deleteTargetInUse && (
            <Alert color="orange" icon={<IconAlertTriangle size={16} />} variant="light">
              This category is referenced by transactions or budgets and cannot be
              deleted.
            </Alert>
          )}
          {deleteMutation.isError && (
            <Alert color="red" icon={<IconAlertTriangle size={16} />} variant="light">
              {(deleteMutation.error as Error)?.message ?? 'Delete failed'}
            </Alert>
          )}
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
              disabled={deleteTargetInUse}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
