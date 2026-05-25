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
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconPencil,
  IconPlus,
  IconTrash,
  IconWallet,
} from '@tabler/icons-react';
import { EmptyState, PageHeader } from '../../../components/common';
import { formatCurrency } from '../../../utils/format';
import { useTransactions } from '../../transactions/hooks/useTransactions';
import { computeAccountBalance } from '../../transactions/utils';
import {
  useAccounts,
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
} from '../hooks/useAccounts';
import type { IAccount } from '../types';
import type { IAccountFormValues } from '../validations';
import { AccountFormModal } from './AccountFormModal';
import './AccountsPage.css';

export function AccountsPage() {
  const [modalOpened, setModalOpened] = useState(false);
  const [editing, setEditing] = useState<IAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IAccount | null>(null);

  const { data: accounts = [], isLoading } = useAccounts();
  const { data: transactions = [] } = useTransactions();
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const deleteMutation = useDeleteAccount();

  const accountsWithBalance = useMemo(
    () =>
      accounts.map((account) => ({
        ...account,
        balance: computeAccountBalance(account, transactions),
        txnCount: transactions.filter(
          (t) => t.accountId === account.id || t.toAccountId === account.id,
        ).length,
      })),
    [accounts, transactions],
  );

  const totalBalance = useMemo(
    () => accountsWithBalance.reduce((sum, a) => sum + a.balance, 0),
    [accountsWithBalance],
  );

  const openCreate = () => {
    setEditing(null);
    setModalOpened(true);
  };

  const openEdit = (account: IAccount) => {
    setEditing(account);
    setModalOpened(true);
  };

  const handleSubmit = (values: IAccountFormValues) => {
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, values },
        {
          onSuccess: () => {
            setModalOpened(false);
            setEditing(null);
            notifications.show({ message: 'Account updated', color: 'teal' });
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
          notifications.show({ message: 'Account created', color: 'teal' });
        },
        onError: (error) =>
          notifications.show({
            title: 'Could not create account',
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
    const inUse = transactions.some(
      (t) => t.accountId === deleteTarget.id || t.toAccountId === deleteTarget.id,
    );
    if (inUse) {
      notifications.show({
        title: 'Cannot delete',
        message: 'Account is referenced by transactions.',
        color: 'red',
      });
      return;
    }
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        notifications.show({ message: 'Account deleted', color: 'teal' });
      },
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="page">
      <PageHeader
        title="Accounts"
        subtitle="Track balances across all your money sources."
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            New account
          </Button>
        }
      />

      {!isLoading && accounts.length > 0 && (
        <div className="accounts-total">
          <span className="accounts-total-label">Total balance</span>
          <span className="accounts-total-value">{formatCurrency(totalBalance)}</span>
        </div>
      )}

      {isLoading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={<IconWallet size={28} />}
          title="No accounts yet"
          description="Add a bank, wallet, or cash account to get started."
          action={
            <Button mt="sm" leftSection={<IconPlus size={16} />} onClick={openCreate}>
              Add account
            </Button>
          }
        />
      ) : (
        <div className="accounts-grid">
          {accountsWithBalance.map((account) => (
            <div className="account-card" key={account.id}>
              <div className="account-card-header">
                <div className="account-card-icon">
                  <IconWallet size={20} />
                </div>
                <div className="account-card-actions">
                  <Tooltip label="Edit" withArrow>
                    <ActionIcon
                      variant="subtle"
                      aria-label="Edit account"
                      onClick={() => openEdit(account)}
                    >
                      <IconPencil size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Delete" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label="Delete account"
                      onClick={() => setDeleteTarget(account)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </div>
              </div>
              <div className="account-card-name">{account.name}</div>
              <div
                className={`account-card-balance ${
                  account.balance < 0 ? 'amount-negative' : 'amount-neutral'
                }`}
              >
                {formatCurrency(account.balance)}
              </div>
              <div className="account-card-meta">
                <Badge size="sm" variant="light" color="gray">
                  Initial {formatCurrency(account.initialAmount)}
                </Badge>
                <Text size="xs" c="dimmed">
                  {account.txnCount} {account.txnCount === 1 ? 'txn' : 'txns'}
                </Text>
              </div>
              {account.notes && (
                <div className="account-card-notes">{account.notes}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <AccountFormModal
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
        title="Delete account"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
          </Text>
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
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
