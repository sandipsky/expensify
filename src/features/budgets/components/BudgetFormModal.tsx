import { useEffect, useMemo } from 'react';
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import dayjs from 'dayjs';
import { zodResolver } from '../../../lib/zodResolver';
import { getCurrencySymbol } from '../../../utils/format';
import { useAccounts } from '../../accounts/hooks/useAccounts';
import { useCategories } from '../../categories/hooks/useCategories';
import { deriveBudgetRange } from '../utils';
import type { BudgetDuration, IBudget } from '../types';
import { budgetFormSchema, type IBudgetFormValues } from '../validations';

interface BudgetFormModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: IBudgetFormValues) => void;
  initialValue?: IBudget;
  isSubmitting?: boolean;
}

const DATE_FORMAT = 'YYYY-MM-DD';

const DURATION_OPTIONS: { value: BudgetDuration; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
];

export function BudgetFormModal({
  opened,
  onClose,
  onSubmit,
  initialValue,
  isSubmitting = false,
}: BudgetFormModalProps) {
  const isEdit = Boolean(initialValue);

  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();

  const expenseCategories = useMemo(
    () =>
      categories
        .filter((c) => c.type === 'expense')
        .map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );

  const form = useForm<IBudgetFormValues>({
    initialValues: {
      amount: 0,
      categoryId: '',
      accountId: '',
      duration: 'monthly',
      startAt: '',
      endAt: '',
    },
    validate: zodResolver(budgetFormSchema),
    validateInputOnBlur: true,
  });

  useEffect(() => {
    if (!opened) return;
    const range = initialValue
      ? { startAt: initialValue.startAt, endAt: initialValue.endAt }
      : deriveBudgetRange('monthly');
    form.setValues({
      amount: initialValue?.amount ?? 0,
      categoryId: initialValue?.categoryId ?? expenseCategories[0]?.value ?? '',
      accountId: initialValue?.accountId ?? accounts[0]?.id ?? '',
      duration: initialValue?.duration ?? 'monthly',
      startAt: range.startAt,
      endAt: range.endAt,
    });
    form.resetDirty();
    form.clearErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, initialValue]);

  const handleDurationChange = (value: string | null) => {
    const duration = (value ?? 'monthly') as BudgetDuration;
    form.setFieldValue('duration', duration);
    if (duration !== 'custom') {
      const range = deriveBudgetRange(duration);
      form.setFieldValue('startAt', range.startAt);
      form.setFieldValue('endAt', range.endAt);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? 'Edit budget' : 'New budget'}
      size="md"
    >
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="md">
          <NumberInput
            label="Amount"
            placeholder="0.00"
            prefix={`${getCurrencySymbol()} `}
            min={0}
            decimalScale={2}
            thousandSeparator=","
            required
            {...form.getInputProps('amount')}
          />

          <Group grow>
            <Select
              label="Category"
              placeholder="Expense category"
              data={expenseCategories}
              searchable
              required
              {...form.getInputProps('categoryId')}
            />
            <Select
              label="Account"
              placeholder="Select account"
              data={accounts.map((a) => ({ value: a.id, label: a.name }))}
              searchable
              required
              {...form.getInputProps('accountId')}
            />
          </Group>

          <Select
            label="Duration"
            data={DURATION_OPTIONS}
            value={form.values.duration}
            onChange={handleDurationChange}
          />

          <Group grow>
            <DateInput
              label="Start"
              valueFormat="MMM D, YYYY"
              disabled={form.values.duration !== 'custom'}
              value={form.values.startAt ? dayjs(form.values.startAt).toDate() : null}
              onChange={(value) =>
                form.setFieldValue(
                  'startAt',
                  value ? dayjs(value).format(DATE_FORMAT) : '',
                )
              }
              error={form.errors.startAt as string | undefined}
            />
            <DateInput
              label="End"
              valueFormat="MMM D, YYYY"
              disabled={form.values.duration !== 'custom'}
              value={form.values.endAt ? dayjs(form.values.endAt).toDate() : null}
              onChange={(value) =>
                form.setFieldValue(
                  'endAt',
                  value ? dayjs(value).format(DATE_FORMAT) : '',
                )
              }
              error={form.errors.endAt as string | undefined}
            />
          </Group>

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
