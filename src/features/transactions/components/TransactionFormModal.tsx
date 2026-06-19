import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Anchor,
  Button,
  FileInput,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPaperclip, IconTrash } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useAccounts } from '../../accounts/hooks/useAccounts';
import { useCategories } from '../../categories/hooks/useCategories';
import { zodResolver } from '../../../lib/zodResolver';
import { getCurrencySymbol } from '../../../utils/format';
import { formatFileSize, readFileAsAttachment } from '../utils';
import type { ITransaction, TransactionKind } from '../types';
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_SIZE,
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
  const [reading, setReading] = useState(false);

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
      attachment: null,
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
      attachment: initialValue?.attachment ?? null,
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
    // A category is only valid for a single kind, so clear it whenever the kind
    // changes to avoid persisting a stale (mismatched) category.
    form.setFieldValue('categoryId', null);
    // to_account only applies to transfers.
    if (kind !== 'transfer') {
      form.setFieldValue('toAccountId', null);
    }
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      form.setFieldValue('attachment', null);
      return;
    }
    if (
      !ALLOWED_ATTACHMENT_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number],
      )
    ) {
      notifications.show({
        title: 'Unsupported file',
        message: 'Attachment must be an image (PNG, JPG, WEBP) or a PDF.',
        color: 'red',
      });
      return;
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      notifications.show({
        title: 'File too large',
        message: 'Attachment must be 5 MB or smaller.',
        color: 'red',
      });
      return;
    }
    setReading(true);
    try {
      const attachment = await readFileAsAttachment(file);
      form.setFieldValue('attachment', attachment);
      form.clearFieldError('attachment');
    } catch {
      notifications.show({
        title: 'Could not read file',
        message: 'Please try a different file.',
        color: 'red',
      });
    } finally {
      setReading(false);
    }
  };

  const attachment = form.values.attachment;

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
            prefix={`${getCurrencySymbol()} `}
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

          <div>
            <FileInput
              label="Attachment"
              placeholder="Image or PDF (max 5 MB)"
              leftSection={<IconPaperclip size={16} />}
              accept="image/png,image/jpeg,image/webp,application/pdf"
              value={null}
              onChange={handleFileChange}
              disabled={reading}
              clearable={false}
              error={form.errors.attachment as string | undefined}
            />
            {attachment && (
              <Group justify="space-between" mt="xs" gap="xs" wrap="nowrap">
                <Anchor
                  href={attachment.dataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={attachment.name}
                  size="sm"
                  truncate
                >
                  {attachment.name} ({formatFileSize(attachment.size)})
                </Anchor>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label="Remove attachment"
                  onClick={() => form.setFieldValue('attachment', null)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            )}
            {!attachment && (
              <Text size="xs" c="dimmed" mt={4}>
                Optional. PNG, JPG, WEBP, or PDF up to 5 MB.
              </Text>
            )}
          </div>

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={reading}>
              {isEdit ? 'Save' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
