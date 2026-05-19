import { useEffect } from 'react';
import {
  Button,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { zodResolver } from '../../../lib/zodResolver';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '../constants';
import type { ICategory } from '../types';
import { categoryFormSchema, type ICategoryFormValues } from '../validations';
import './CategoryFormModal.css';

interface CategoryFormModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: ICategoryFormValues) => void;
  initialValue?: ICategory;
  isSubmitting?: boolean;
  existingNames?: Set<string>;
}

function makeUniqueKey(name: string, type: string): string {
  return `${type}:${name.trim().toLowerCase()}`;
}

export function CategoryFormModal({
  opened,
  onClose,
  onSubmit,
  initialValue,
  isSubmitting = false,
  existingNames,
}: CategoryFormModalProps) {
  const isEdit = Boolean(initialValue);

  const form = useForm<ICategoryFormValues>({
    initialValues: {
      name: '',
      type: 'expense',
      icon: DEFAULT_CATEGORY_ICON,
    },
    validate: zodResolver(categoryFormSchema),
    validateInputOnBlur: true,
  });

  useEffect(() => {
    if (!opened) return;
    form.setValues({
      name: initialValue?.name ?? '',
      type: initialValue?.type ?? 'expense',
      icon: initialValue?.icon ?? DEFAULT_CATEGORY_ICON,
    });
    form.resetDirty();
    form.clearErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, initialValue]);

  const handleSubmit = (values: ICategoryFormValues) => {
    if (existingNames) {
      const key = makeUniqueKey(values.name, values.type);
      if (existingNames.has(key)) {
        form.setFieldError('name', 'A category with this name and type already exists');
        return;
      }
    }
    onSubmit(values);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? 'Edit category' : 'New category'}
      centered
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="e.g. Groceries"
            required
            autoFocus
            data-autofocus
            {...form.getInputProps('name')}
          />

          <div>
            <div className="category-form-modal-icon-label">Type</div>
            <SegmentedControl
              fullWidth
              data={[
                { label: 'Expense', value: 'expense' },
                { label: 'Income', value: 'income' },
              ]}
              disabled={isEdit}
              {...form.getInputProps('type')}
            />
          </div>

          <div>
            <div className="category-form-modal-icon-label">Icon</div>
            <div className="category-form-modal-icon-grid">
              {CATEGORY_ICONS.map((entry) => {
                const Icon = entry.Component;
                const isActive = entry.key === form.values.icon;
                return (
                  <button
                    key={entry.key}
                    type="button"
                    title={entry.label}
                    aria-label={entry.label}
                    aria-pressed={isActive}
                    data-active={isActive}
                    className="category-form-modal-icon-button"
                    onClick={() => form.setFieldValue('icon', entry.key)}
                  >
                    <Icon size={18} />
                  </button>
                );
              })}
            </div>
          </div>

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

export { makeUniqueKey };
