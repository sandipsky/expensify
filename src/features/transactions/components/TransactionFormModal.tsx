import { useEffect, useMemo } from 'react';
import {
  Button,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Textarea,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import dayjs from 'dayjs';
import { useAccounts } from '../../accounts/hooks/useAccounts';
import { useCategories } from '../../categories/hooks/useCategories';
import { zodResolver } from '../../../lib/zodResolver';
import type { ITransaction, TransactionKind } from '../types';
import {
  transactionFormSchema,
  type ITransactionFormValues,
} from '../validations';

interface TransactionFormModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: ITransactionFormValues) => void;
  initialValue?: ITransaction;
  defaultDate?: string;
  isSubmitting?: boolean;
}

const DATE_FORMAT = 'YYYY-MM-DD';

export function TransactionFormModal({
  opened,
  onClose,
  onSubmit,
  initialValue,
  defaultDate,
  isSubmitting = false,
}: TransactionFormModalProps) {
  const isEdit = Boolean(initialValue);

  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();

  const form = useForm<ITransactionFormValues>({
    initialValues: {
      kind: 'expense',
      amount: 0,
      accountId: '',
      toAccountId: null,
      categoryId: null,
      date: dayjs().format(DATE_FORMAT),
      notes: '',
    },
    validate: zodResolver(transactionFormSchema),
    validateInputOnBlur: true,
  });

  useEffect(() => {
    if (!opened) return;
    form.setValues({
      kind: initialValue?.kind ?? 'expense',
      amount: initialValue?.amount ?? 0,
      accountId: initialValue?.accountId ?? accounts[0]?.id ?? '',
      toAccountId: initialValue?.toAccountId ?? null,
      categoryId: initialValue?.categoryId ?? null,
      date: initialValue?.date ?? defaultDate ?? dayjs().format(DATE_FORMAT),
      notes: initialValue?.notes ?? '',
    });
    form.resetDirty();
    form.clearErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, initialValue, defaultDate]);

  const accountOptions = useMemo(
    () => accounts.map((a) => ({ value: a.id, label: a.name })),
    [accounts],
  );

  const categoryOptions = useMemo(() => {
    const kind = form.values.kind;
    if (kind === 'transfer') return [];
    return categories
      .filter((c) => c.type === kind)
      .map((c) => ({ value: c.id, label: c.name }));
  }, [categories, form.values.kind]);

  const handleKindChange = (value: string) => {
    const kind = value as TransactionKind;
    form.setFieldValue('kind', kind);
    if (kind === 'transfer') {
      form.setFieldValue('categoryId', null);
    } else {
      form.setFieldValue('toAccountId', null);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? 'Edit transaction' : 'New transaction'}
      size="md"
    >
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="md">
          <SegmentedControl
            fullWidth
            value={form.values.kind}
            onChange={handleKindChange}
            data={[
              { label: 'Expense', value: 'expense' },
              { label: 'Income', value: 'income' },
              { label: 'Transfer', value: 'transfer' },
            ]}
          />

          <NumberInput
            label="Amount"
            placeholder="0.00"
            prefix="Rs "
            min={0}
            decimalScale={2}
            thousandSeparator=","
            required
            {...form.getInputProps('amount')}
          />

          <Group grow align="flex-start">
            <Select
              label={form.values.kind === 'transfer' ? 'From account' : 'Account'}
              placeholder="Select account"
              data={accountOptions}
              searchable
              required
              {...form.getInputProps('accountId')}
            />
            {form.values.kind === 'transfer' ? (
              <Select
                label="To account"
                placeholder="Select destination"
                data={accountOptions.filter(
                  (a) => a.value !== form.values.accountId,
                )}
                searchable
                required
                {...form.getInputProps('toAccountId')}
              />
            ) : (
              <Select
                label="Category"
                placeholder="Select category"
                data={categoryOptions}
                searchable
                required
                {...form.getInputProps('categoryId')}
              />
            )}
          </Group>

          <DateInput
            label="Date"
            valueFormat="MMM D, YYYY"
            value={form.values.date ? dayjs(form.values.date).toDate() : null}
            onChange={(value) =>
              form.setFieldValue(
                'date',
                value ? dayjs(value).format(DATE_FORMAT) : '',
              )
            }
            error={form.errors.date as string | undefined}
            required
          />

          <Textarea
            label="Notes"
            placeholder="Optional"
            autosize
            minRows={2}
            maxRows={4}
            {...form.getInputProps('notes')}
          />

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Save' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
