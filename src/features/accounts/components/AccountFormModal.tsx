import { useEffect } from 'react';
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  TextInput,
  Textarea,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { zodResolver } from '../../../lib/zodResolver';
import { getCurrencySymbol } from '../../../utils/format';
import type { IAccount } from '../types';
import { accountFormSchema, type IAccountFormValues } from '../validations';

interface AccountFormModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: IAccountFormValues) => void;
  initialValue?: IAccount;
  isSubmitting?: boolean;
}

export function AccountFormModal({
  opened,
  onClose,
  onSubmit,
  initialValue,
  isSubmitting = false,
}: AccountFormModalProps) {
  const isEdit = Boolean(initialValue);

  const form = useForm<IAccountFormValues>({
    initialValues: {
      name: '',
      initialAmount: 0,
      notes: '',
    },
    validate: zodResolver(accountFormSchema),
    validateInputOnBlur: true,
  });

  useEffect(() => {
    if (!opened) return;
    form.setValues({
      name: initialValue?.name ?? '',
      initialAmount: initialValue?.initialAmount ?? 0,
      notes: initialValue?.notes ?? '',
    });
    form.resetDirty();
    form.clearErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, initialValue]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? 'Edit account' : 'New account'}
      size="md"
    >
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="e.g. Main Checking"
            required
            autoFocus
            data-autofocus
            {...form.getInputProps('name')}
          />
          <NumberInput
            label="Initial amount"
            placeholder="0.00"
            prefix={`${getCurrencySymbol()} `}
            decimalScale={2}
            thousandSeparator=","
            allowNegative
            required
            {...form.getInputProps('initialAmount')}
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
