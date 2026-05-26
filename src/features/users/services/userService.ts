import { apiClient } from '../../../lib/apiClient';
import { generateId } from '../../../utils/ids';
import type { IStoredUser, IUser } from '../../auth/types';
import type {
  IUserCreateFormValues,
  IUserUpdateFormValues,
} from '../validations';

const RESOURCE = '/users';

export class DuplicateUsernameError extends Error {
  constructor(username: string) {
    super(`Username "${username}" is already taken`);
    this.name = 'DuplicateUsernameError';
  }
}

function toPublicUser(stored: IStoredUser): IUser {
  const { password: _password, ...rest } = stored;
  return rest;
}

export async function listUsers(): Promise<IUser[]> {
  const users = await apiClient.get<IStoredUser[]>(RESOURCE);
  return users.map(toPublicUser);
}

async function findByUsername(username: string): Promise<IStoredUser | null> {
  const matches = await apiClient.get<IStoredUser[]>(
    `${RESOURCE}?username=${encodeURIComponent(username)}`,
  );
  return matches[0] ?? null;
}

export async function createUser(values: IUserCreateFormValues): Promise<IUser> {
  const username = values.username.trim().toLowerCase();
  const existing = await findByUsername(username);
  if (existing) {
    throw new DuplicateUsernameError(username);
  }
  const payload: IStoredUser = {
    id: generateId('usr'),
    username,
    password: values.password,
    name: values.name.trim(),
    role: values.role,
    createdAt: new Date().toISOString(),
  };
  const created = await apiClient.post<IStoredUser>(RESOURCE, payload);
  return toPublicUser(created);
}

export async function updateUser(
  id: string,
  values: IUserUpdateFormValues,
): Promise<IUser> {
  const username = values.username.trim().toLowerCase();
  const existing = await findByUsername(username);
  if (existing && existing.id !== id) {
    throw new DuplicateUsernameError(username);
  }
  const patch: Partial<IStoredUser> = {
    username,
    name: values.name.trim(),
    role: values.role,
  };
  if (values.password && values.password.length > 0) {
    patch.password = values.password;
  }
  const updated = await apiClient.patch<IStoredUser>(`${RESOURCE}/${id}`, patch);
  return toPublicUser(updated);
}

export function deleteUser(id: string): Promise<void> {
  return apiClient.delete<void>(`${RESOURCE}/${id}`);
}
