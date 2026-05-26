import { useEffect } from 'react';
import {
  Button,
  Group,
  Modal,
  PasswordInput,
  Select,
  Stack,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { zodResolver } from '../../../lib/zodResolver';
import type { IUser } from '../../auth/types';
import {
  userCreateFormSchema,
  userUpdateFormSchema,
  type IUserCreateFormValues,
  type IUserUpdateFormValues,
} from '../validations';

interface UserFormModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (values: IUserCreateFormValues | IUserUpdateFormValues) => void;
  initialValue?: IUser;
  isSubmitting?: boolean;
  lockRole?: boolean;
}

export function UserFormModal({
  opened,
  onClose,
  onSubmit,
  initialValue,
  isSubmitting = false,
  lockRole = false,
}: UserFormModalProps) {
  const isEdit = Boolean(initialValue);

  const form = useForm<IUserUpdateFormValues>({
    initialValues: {
      username: '',
      password: '',
      name: '',
      role: 'user',
    },
    validate: zodResolver(isEdit ? userUpdateFormSchema : userCreateFormSchema),
    validateInputOnBlur: true,
  });

  useEffect(() => {
    if (!opened) return;
    form.setValues({
      username: initialValue?.username ?? '',
      password: '',
      name: initialValue?.name ?? '',
      role: initialValue?.role ?? 'user',
    });
    form.resetDirty();
    form.clearErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, initialValue]);

  const handleSubmit = (values: IUserUpdateFormValues) => {
    if (isEdit) {
      onSubmit(values);
    } else {
      onSubmit({
        username: values.username,
        password: values.password ?? '',
        name: values.name,
        role: values.role,
      } as IUserCreateFormValues);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? 'Edit user' : 'New user'}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Username"
            placeholder="e.g. jane.doe"
            required
            autoFocus
            data-autofocus
            autoComplete="off"
            {...form.getInputProps('username')}
          />
          <TextInput
            label="Display name"
            placeholder="Jane Doe"
            required
            {...form.getInputProps('name')}
          />
          <PasswordInput
            label={isEdit ? 'New password' : 'Password'}
            placeholder={isEdit ? 'Leave blank to keep current password' : 'At least 3 characters'}
            required={!isEdit}
            autoComplete="new-password"
            {...form.getInputProps('password')}
          />
          <Select
            label="Role"
            data={[
              { value: 'user', label: 'User' },
              { value: 'admin', label: 'Admin' },
            ]}
            disabled={lockRole}
            description={
              lockRole ? 'You cannot change your own role.' : undefined
            }
            {...form.getInputProps('role')}
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
