import { useState } from 'react';
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
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { EmptyState, PageHeader } from '../../../components/common';
import { selectUser, useAuthStore } from '../../auth';
import type { IUser } from '../../auth/types';
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useUsers,
} from '../hooks/useUsers';
import { DuplicateUsernameError } from '../services/userService';
import type {
  IUserCreateFormValues,
  IUserUpdateFormValues,
} from '../validations';
import { UserFormModal } from './UserFormModal';
import './UsersPage.css';

export function UsersPage() {
  const currentUser = useAuthStore(selectUser);
  const [modalOpened, setModalOpened] = useState(false);
  const [editing, setEditing] = useState<IUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IUser | null>(null);

  const { data: users = [], isLoading } = useUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const openCreate = () => {
    setEditing(null);
    setModalOpened(true);
  };

  const openEdit = (user: IUser) => {
    setEditing(user);
    setModalOpened(true);
  };

  const closeModal = () => {
    setModalOpened(false);
    setEditing(null);
  };

  const handleSubmit = (
    values: IUserCreateFormValues | IUserUpdateFormValues,
  ) => {
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, values: values as IUserUpdateFormValues },
        {
          onSuccess: () => {
            closeModal();
            notifications.show({ message: 'User updated', color: 'teal' });
          },
          onError: (error) =>
            notifications.show({
              title: 'Update failed',
              message:
                error instanceof DuplicateUsernameError
                  ? error.message
                  : (error as Error).message,
              color: 'red',
            }),
        },
      );
    } else {
      createMutation.mutate(values as IUserCreateFormValues, {
        onSuccess: () => {
          closeModal();
          notifications.show({ message: 'User created', color: 'teal' });
        },
        onError: (error) =>
          notifications.show({
            title: 'Could not create user',
            message:
              error instanceof DuplicateUsernameError
                ? error.message
                : (error as Error).message,
            color: 'red',
          }),
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        notifications.show({ message: 'User deleted', color: 'teal' });
      },
      onError: (error) =>
        notifications.show({
          title: 'Delete failed',
          message: (error as Error).message,
          color: 'red',
        }),
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const editingSelf = editing?.id === currentUser?.id;

  return (
    <div className="page">
      <PageHeader
        title="Users"
        subtitle="Manage who can sign in and access their own data."
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            New user
          </Button>
        }
      />

      {isLoading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<IconUsers size={28} />}
          title="No users yet"
          description="Add a user to grant them access."
          action={
            <Button mt="sm" leftSection={<IconPlus size={16} />} onClick={openCreate}>
              Add user
            </Button>
          }
        />
      ) : (
        <div className="users-table-wrap surface-card">
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Username</Table.Th>
                <Table.Th>Display name</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th className="users-table-actions-col" />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.map((user) => {
                const isSelf = user.id === currentUser?.id;
                return (
                  <Table.Tr key={user.id}>
                    <Table.Td>
                      <Text fw={500}>{user.username}</Text>
                    </Table.Td>
                    <Table.Td>{user.name}</Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        variant="light"
                        color={user.role === 'admin' ? 'indigo' : 'gray'}
                      >
                        {user.role}
                      </Badge>
                      {isSelf && (
                        <Badge ml="xs" size="sm" variant="light" color="teal">
                          you
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {dayjs(user.createdAt).format('MMM D, YYYY')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end" wrap="nowrap">
                        <Tooltip label="Edit" withArrow>
                          <ActionIcon
                            variant="subtle"
                            aria-label="Edit user"
                            onClick={() => openEdit(user)}
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip
                          label={isSelf ? 'You cannot delete yourself' : 'Delete'}
                          withArrow
                        >
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            aria-label="Delete user"
                            disabled={isSelf}
                            onClick={() => setDeleteTarget(user)}
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
        </div>
      )}

      <UserFormModal
        opened={modalOpened}
        onClose={closeModal}
        onSubmit={handleSubmit}
        initialValue={editing ?? undefined}
        isSubmitting={isSubmitting}
        lockRole={editingSelf}
      />

      <Modal
        opened={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete user"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Delete <strong>{deleteTarget?.username}</strong>? Their data will
            remain in the database but they will no longer be able to sign in.
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
