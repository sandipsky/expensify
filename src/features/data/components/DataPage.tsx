import { useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Group,
  List,
  Modal,
  Radio,
  ScrollArea,
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
import { useCategories, categoryKeys } from '../../categories/hooks/useCategories';
import { useTransactions, transactionKeys } from '../../transactions/hooks/useTransactions';
import { z } from 'zod';
import { apiClient } from '../../../lib/apiClient';
import type { IAccount } from '../../accounts/types';
import type { IBudget } from '../../budgets/types';
import type { ICategory } from '../../categories/types';
import type { ITransaction } from '../../transactions/types';
import {
  accountImportSchema,
  backupSchema,
  budgetImportSchema,
  categoryImportSchema,
  transactionImportSchema,
  type ConflictPolicy,
  type EntityName,
  type IImportAccount,
  type IImportBudget,
  type IImportCategory,
  type IImportTransaction,
  type IRowError,
} from '../validations';
import './DataPage.css';

interface IBackup {
  exportedAt: string;
  version: number;
  accounts: IAccount[];
  categories: ICategory[];
  budgets: IBudget[];
  transactions: ITransaction[];
}

interface IImportReport {
  accounts: IImportAccount[];
  categories: IImportCategory[];
  budgets: IImportBudget[];
  transactions: IImportTransaction[];
  errors: IRowError[];
  invalidCount: number;
}

const ENTITY_LABELS: Record<EntityName, string> = {
  accounts: 'accounts',
  categories: 'categories',
  budgets: 'budgets',
  transactions: 'transactions',
};

export function DataPage() {
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { data: budgets = [] } = useBudgets();
  const { data: transactions = [] } = useTransactions();
  const queryClient = useQueryClient();

  const fileInput = useRef<HTMLInputElement | null>(null);
  const [report, setReport] = useState<IImportReport | null>(null);
  const [conflictPolicy, setConflictPolicy] = useState<ConflictPolicy>('rename');
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

  const exportCsv = (entity: EntityName) => {
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
      const json: unknown = JSON.parse(text);
      const shape = backupSchema.safeParse(json);
      if (!shape.success) {
        throw new Error('Invalid file — expected an Expensify JSON backup.');
      }
      setReport(buildReport(shape.data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not parse file.');
    } finally {
      event.target.value = '';
    }
  };

  const runImport = async () => {
    if (!report) return;
    setBusy(true);
    try {
      const accountIdMap = new Map<string, string>();
      const categoryIdMap = new Map<string, string>();

      // Index existing records for conflict detection.
      const accountByName = new Map(
        accounts.map((a) => [a.name.trim().toLowerCase(), a]),
      );
      const categoryByKey = new Map(
        categories.map((c) => [categoryKey(c.name, c.type), c]),
      );
      const usedAccountNames = new Set(accountByName.keys());
      const usedCategoryKeys = new Set(categoryByKey.keys());

      let created = 0;
      let updated = 0;
      let skipped = 0;

      // Accounts (unique name).
      for (const incoming of report.accounts) {
        const key = incoming.name.trim().toLowerCase();
        const existing = accountByName.get(key);
        if (existing && conflictPolicy === 'skip') {
          accountIdMap.set(incoming.id, existing.id);
          skipped += 1;
          continue;
        }
        if (existing && conflictPolicy === 'overwrite') {
          await apiClient.patch(`/accounts/${existing.id}`, {
            name: incoming.name,
            initialAmount: incoming.initialAmount,
            notes: incoming.notes,
          });
          accountIdMap.set(incoming.id, existing.id);
          updated += 1;
          continue;
        }
        // Rename policy, or a duplicate of a name already taken this import.
        const name = usedAccountNames.has(key)
          ? dedupeName(incoming.name, usedAccountNames)
          : incoming.name;
        usedAccountNames.add(name.trim().toLowerCase());
        const createdAccount = await apiClient.post<{ id: string }>('/accounts', {
          name,
          initialAmount: incoming.initialAmount,
          notes: incoming.notes,
        });
        accountIdMap.set(incoming.id, createdAccount.id);
        created += 1;
      }

      // Categories (unique name within type).
      for (const incoming of report.categories) {
        const key = categoryKey(incoming.name, incoming.type);
        const existing = categoryByKey.get(key);
        if (existing && conflictPolicy === 'skip') {
          categoryIdMap.set(incoming.id, existing.id);
          skipped += 1;
          continue;
        }
        if (existing && conflictPolicy === 'overwrite') {
          await apiClient.patch(`/categories/${existing.id}`, {
            name: incoming.name,
            icon: incoming.icon,
          });
          categoryIdMap.set(incoming.id, existing.id);
          updated += 1;
          continue;
        }
        // Rename policy, or a duplicate of a name+type already taken this import.
        const name = usedCategoryKeys.has(key)
          ? dedupeName(incoming.name, usedCategoryKeys, (n) =>
              categoryKey(n, incoming.type),
            )
          : incoming.name;
        usedCategoryKeys.add(categoryKey(name, incoming.type));
        const createdCategory = await apiClient.post<{ id: string }>('/categories', {
          name,
          type: incoming.type,
          icon: incoming.icon,
        });
        categoryIdMap.set(incoming.id, createdCategory.id);
        created += 1;
      }

      // Budgets and transactions are always created new, with remapped relations.
      // The API exposes the foreign keys as `account` / `category`.
      for (const incoming of report.budgets) {
        await apiClient.post('/budgets', {
          amount: incoming.amount,
          account: accountIdMap.get(incoming.accountId) ?? incoming.accountId,
          category: categoryIdMap.get(incoming.categoryId) ?? incoming.categoryId,
          duration: incoming.duration,
          startAt: incoming.startAt,
          endAt: incoming.endAt,
        });
        created += 1;
      }

      for (const incoming of report.transactions) {
        await apiClient.post('/transactions', {
          kind: incoming.kind,
          amount: incoming.amount,
          account: accountIdMap.get(incoming.accountId) ?? incoming.accountId,
          toAccount: incoming.toAccountId
            ? accountIdMap.get(incoming.toAccountId) ?? incoming.toAccountId
            : null,
          category: incoming.categoryId
            ? categoryIdMap.get(incoming.categoryId) ?? incoming.categoryId
            : null,
          date: incoming.date,
          notes: incoming.notes,
        });
        created += 1;
      }

      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });

      notifications.show({
        title: 'Import complete',
        message: `${created} created · ${updated} updated · ${skipped} skipped`,
        color: 'teal',
      });
      setReport(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const validTotal = report
    ? report.accounts.length +
      report.categories.length +
      report.budgets.length +
      report.transactions.length
    : 0;

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
                Restore from an Expensify JSON backup. Each row is validated and
                you choose how to resolve duplicate names.
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
        opened={Boolean(report)}
        onClose={() => setReport(null)}
        title="Review import"
        size="lg"
      >
        {report && (
          <Stack gap="md">
            <Group gap="xs">
              <Badge variant="light">{report.accounts.length} accounts</Badge>
              <Badge variant="light">{report.categories.length} categories</Badge>
              <Badge variant="light">{report.budgets.length} budgets</Badge>
              <Badge variant="light">{report.transactions.length} transactions</Badge>
              {report.invalidCount > 0 && (
                <Badge variant="light" color="red">
                  {report.invalidCount} invalid rows
                </Badge>
              )}
            </Group>

            {report.errors.length > 0 && (
              <Alert
                color="orange"
                variant="light"
                icon={<IconAlertTriangle size={16} />}
                title="Some rows could not be imported"
              >
                <ScrollArea.Autosize mah={160}>
                  <List size="xs" spacing={2}>
                    {report.errors.map((e, index) => (
                      <List.Item key={`${e.entity}-${e.row}-${index}`}>
                        {ENTITY_LABELS[e.entity]} row {e.row + 1}: {e.message}
                      </List.Item>
                    ))}
                  </List>
                </ScrollArea.Autosize>
              </Alert>
            )}

            <div>
              <Text size="sm" fw={500} mb={4}>
                On duplicate name
              </Text>
              <Radio.Group
                value={conflictPolicy}
                onChange={(value) => setConflictPolicy(value as ConflictPolicy)}
              >
                <Stack gap={6}>
                  <Radio
                    value="rename"
                    label="Rename — import duplicates as new records with a suffixed name"
                  />
                  <Radio
                    value="skip"
                    label="Skip — keep existing records, ignore incoming duplicates"
                  />
                  <Radio
                    value="overwrite"
                    label="Overwrite — update existing records with imported data"
                  />
                </Stack>
              </Radio.Group>
              <Text size="xs" c="dimmed" mt={6}>
                Applies to accounts (by name) and categories (by name + type).
                Budgets and transactions are always added as new records.
              </Text>
            </div>

            <Group justify="flex-end" gap="sm">
              <Button variant="default" onClick={() => setReport(null)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={runImport} loading={busy} disabled={validTotal === 0}>
                Import {validTotal} {validTotal === 1 ? 'record' : 'records'}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </div>
  );
}

function categoryKey(name: string, type: string): string {
  return `${type}:${name.trim().toLowerCase()}`;
}

function dedupeName(
  name: string,
  used: Set<string>,
  toKey: (n: string) => string = (n) => n.trim().toLowerCase(),
): string {
  let candidate = `${name} (imported)`;
  let counter = 2;
  while (used.has(toKey(candidate))) {
    candidate = `${name} (imported ${counter})`;
    counter += 1;
  }
  return candidate;
}

function buildReport(data: {
  accounts: unknown[];
  categories: unknown[];
  budgets: unknown[];
  transactions: unknown[];
}): IImportReport {
  const errors: IRowError[] = [];

  return {
    accounts: validateRows(data.accounts, accountImportSchema, 'accounts', errors).map(
      withImportId('acc'),
    ),
    categories: validateRows(
      data.categories,
      categoryImportSchema,
      'categories',
      errors,
    ).map(withImportId('cat')),
    budgets: validateRows(data.budgets, budgetImportSchema, 'budgets', errors).map(
      withImportId('bud'),
    ),
    transactions: validateRows(
      data.transactions,
      transactionImportSchema,
      'transactions',
      errors,
    ).map(withImportId('txn')),
    errors,
    invalidCount: errors.length,
  };
}

// Ensures every valid row has a stable id used for relation remapping; the real
// id is assigned at import time.
function withImportId<T extends { id?: string }>(prefix: string) {
  return (item: T, index: number): T & { id: string } => ({
    ...item,
    id: item.id ?? `${prefix}_import_${index}`,
  });
}

function validateRows<T>(
  rows: unknown[],
  schema: z.ZodType<T>,
  entity: EntityName,
  errors: IRowError[],
): T[] {
  const valid: T[] = [];
  rows.forEach((row, index) => {
    const result = schema.safeParse(row);
    if (result.success) {
      valid.push(result.data);
    } else {
      errors.push({
        entity,
        row: index,
        message: result.error.issues.map((i) => i.message).join('; '),
      });
    }
  });
  return valid;
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
