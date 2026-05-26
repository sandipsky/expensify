import { useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  Text,
} from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconDownload,
  IconFileText,
  IconUpload,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { PageHeader } from '../../../components/common';
import { useAccounts, accountKeys } from '../../accounts/hooks/useAccounts';
import { useBudgets, budgetKeys } from '../../budgets/hooks/useBudgets';
import { useCategories } from '../../categories/hooks/useCategories';
import { categoryKeys } from '../../categories/hooks/useCategories';
import { useTransactions, transactionKeys } from '../../transactions/hooks/useTransactions';
import { apiClient } from '../../../lib/apiClient';
import { getCurrentUserId } from '../../auth';
import { generateId } from '../../../utils/ids';
import type { IAccount } from '../../accounts/types';
import type { IBudget } from '../../budgets/types';
import type { ICategory } from '../../categories/types';
import type { ITransaction } from '../../transactions/types';
import './DataPage.css';

interface IBackup {
  exportedAt: string;
  version: number;
  accounts: IAccount[];
  categories: ICategory[];
  budgets: IBudget[];
  transactions: ITransaction[];
}

export function DataPage() {
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { data: budgets = [] } = useBudgets();
  const { data: transactions = [] } = useTransactions();
  const queryClient = useQueryClient();

  const fileInput = useRef<HTMLInputElement | null>(null);
  const [importData, setImportData] = useState<IBackup | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportJson = () => {
    const payload: IBackup = {
      exportedAt: new Date().toISOString(),
      version: 1,
      accounts,
      categories,
      budgets,
      transactions,
    };
    downloadFile(
      `expensify-backup-${dayjs().format('YYYYMMDD-HHmm')}.json`,
      JSON.stringify(payload, null, 2),
      'application/json',
    );
    notifications.show({ message: 'JSON export downloaded', color: 'teal' });
  };

  const exportCsv = (
    entity: 'accounts' | 'categories' | 'budgets' | 'transactions',
  ) => {
    const rows = {
      accounts: accountsToCsv(accounts),
      categories: categoriesToCsv(categories),
      budgets: budgetsToCsv(budgets),
      transactions: transactionsToCsv(transactions),
    }[entity];
    downloadFile(
      `expensify-${entity}-${dayjs().format('YYYYMMDD')}.csv`,
      rows,
      'text/csv',
    );
    notifications.show({ message: `${entity} CSV exported`, color: 'teal' });
  };

  const onFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as IBackup;
      if (
        !Array.isArray(parsed.accounts) ||
        !Array.isArray(parsed.categories) ||
        !Array.isArray(parsed.transactions) ||
        !Array.isArray(parsed.budgets)
      ) {
        throw new Error('Invalid file shape — expected an Expensify JSON backup.');
      }
      setImportData(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not parse file.');
    } finally {
      event.target.value = '';
    }
  };

  const runImport = async () => {
    if (!importData) return;
    setBusy(true);
    try {
      const userId = getCurrentUserId();
      const accountIdMap = new Map<string, string>();
      const categoryIdMap = new Map<string, string>();

      const remappedAccounts = importData.accounts.map((a) => {
        const newId = generateId('acc');
        accountIdMap.set(a.id, newId);
        return { ...a, id: newId, userId };
      });
      const remappedCategories = importData.categories.map((c) => {
        const newId = generateId('cat');
        categoryIdMap.set(c.id, newId);
        return { ...c, id: newId, userId };
      });
      const remappedBudgets = importData.budgets.map((b) => ({
        ...b,
        id: generateId('bud'),
        userId,
        accountId: accountIdMap.get(b.accountId) ?? b.accountId,
        categoryId: categoryIdMap.get(b.categoryId) ?? b.categoryId,
      }));
      const remappedTransactions = importData.transactions.map((t) => ({
        ...t,
        id: generateId('txn'),
        userId,
        accountId: accountIdMap.get(t.accountId) ?? t.accountId,
        toAccountId: t.toAccountId
          ? accountIdMap.get(t.toAccountId) ?? t.toAccountId
          : null,
        categoryId: t.categoryId
          ? categoryIdMap.get(t.categoryId) ?? t.categoryId
          : null,
      }));

      let created = 0;
      const sequence: Array<{ path: string; items: { id: string }[] }> = [
        { path: '/accounts', items: remappedAccounts },
        { path: '/categories', items: remappedCategories },
        { path: '/budgets', items: remappedBudgets },
        { path: '/transactions', items: remappedTransactions },
      ];

      for (const group of sequence) {
        for (const item of group.items) {
          await apiClient.post(group.path, item);
          created += 1;
        }
      }

      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });

      notifications.show({
        title: 'Import complete',
        message: `Created ${created} items for your account`,
        color: 'teal',
      });
      setImportData(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const previewCounts = importData
    ? {
        accounts: importData.accounts.length,
        categories: importData.categories.length,
        budgets: importData.budgets.length,
        transactions: importData.transactions.length,
      }
    : null;

  return (
    <div className="page">
      <PageHeader
        title="Import / Export"
        subtitle="Back up your data or restore from a JSON backup."
      />

      <div className="data-grid">
        <section className="surface-card surface-card-padded data-section">
          <div className="data-section-head">
            <div className="data-section-icon">
              <IconDownload size={18} />
            </div>
            <div>
              <h3 className="data-section-title">Export data</h3>
              <p className="data-section-subtitle">
                Download a full JSON backup or CSV per entity.
              </p>
            </div>
          </div>

          <Stack gap="sm">
            <Button leftSection={<IconDownload size={16} />} onClick={exportJson}>
              Download JSON backup
            </Button>
            <div className="data-csv-grid">
              <Button
                variant="default"
                size="sm"
                leftSection={<IconFileText size={14} />}
                onClick={() => exportCsv('accounts')}
              >
                Accounts CSV
              </Button>
              <Button
                variant="default"
                size="sm"
                leftSection={<IconFileText size={14} />}
                onClick={() => exportCsv('categories')}
              >
                Categories CSV
              </Button>
              <Button
                variant="default"
                size="sm"
                leftSection={<IconFileText size={14} />}
                onClick={() => exportCsv('budgets')}
              >
                Budgets CSV
              </Button>
              <Button
                variant="default"
                size="sm"
                leftSection={<IconFileText size={14} />}
                onClick={() => exportCsv('transactions')}
              >
                Transactions CSV
              </Button>
            </div>
          </Stack>
        </section>

        <section className="surface-card surface-card-padded data-section">
          <div className="data-section-head">
            <div className="data-section-icon" data-tone="primary">
              <IconUpload size={18} />
            </div>
            <div>
              <h3 className="data-section-title">Import data</h3>
              <p className="data-section-subtitle">
                Restore from an Expensify JSON backup. All items are imported as
                new records under your account.
              </p>
            </div>
          </div>

          <Stack gap="sm">
            <input
              ref={fileInput}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={onFileSelected}
            />
            <Button
              variant="default"
              leftSection={<IconUpload size={16} />}
              onClick={() => fileInput.current?.click()}
            >
              Choose JSON file…
            </Button>
            {error && (
              <Alert
                color="red"
                variant="light"
                icon={<IconAlertTriangle size={16} />}
                title="Import error"
              >
                {error}
              </Alert>
            )}
          </Stack>
        </section>
      </div>

      <Modal
        opened={Boolean(importData)}
        onClose={() => setImportData(null)}
        title="Confirm import"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm">
            Found{' '}
            <Badge variant="light">{previewCounts?.accounts ?? 0} accounts</Badge>,{' '}
            <Badge variant="light">{previewCounts?.categories ?? 0} categories</Badge>,{' '}
            <Badge variant="light">{previewCounts?.budgets ?? 0} budgets</Badge>,{' '}
            <Badge variant="light">
              {previewCounts?.transactions ?? 0} transactions
            </Badge>{' '}
            in the file.
          </Text>
          <Text size="sm" c="dimmed">
            Items will be added to your account with new IDs. Relations between
            transactions, budgets, accounts, and categories are preserved.
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setImportData(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={runImport} loading={busy}>
              Import
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}

function downloadFile(name: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const head = headers.join(',');
  const body = rows.map((r) => r.map(escapeCsv).join(',')).join('\n');
  return `${head}\n${body}`;
}

function accountsToCsv(items: IAccount[]): string {
  return toCsv(
    ['id', 'name', 'initialAmount', 'notes', 'createdAt'],
    items.map((a) => [a.id, a.name, a.initialAmount, a.notes, a.createdAt]),
  );
}

function categoriesToCsv(items: ICategory[]): string {
  return toCsv(
    ['id', 'name', 'type', 'icon', 'createdAt'],
    items.map((c) => [c.id, c.name, c.type, c.icon, c.createdAt]),
  );
}

function budgetsToCsv(items: IBudget[]): string {
  return toCsv(
    ['id', 'amount', 'categoryId', 'accountId', 'duration', 'startAt', 'endAt', 'createdAt'],
    items.map((b) => [
      b.id,
      b.amount,
      b.categoryId,
      b.accountId,
      b.duration,
      b.startAt,
      b.endAt,
      b.createdAt,
    ]),
  );
}

function transactionsToCsv(items: ITransaction[]): string {
  return toCsv(
    [
      'id',
      'kind',
      'amount',
      'accountId',
      'toAccountId',
      'categoryId',
      'date',
      'notes',
      'createdAt',
    ],
    items.map((t) => [
      t.id,
      t.kind,
      t.amount,
      t.accountId,
      t.toAccountId,
      t.categoryId,
      t.date,
      t.notes,
      t.createdAt,
    ]),
  );
}
