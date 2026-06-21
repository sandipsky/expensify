import axios from 'axios';
import { apiClient } from '../../../lib/apiClient';
import type { IUser } from '../../auth/types';
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

// The API reports a taken username as a 400 with a `username` field error.
function rethrowUsernameConflict(error: unknown, username: string): never {
  if (axios.isAxiosError(error) && error.response?.status === 400) {
    const data = error.response.data as { errors?: { username?: unknown } } | undefined;
    if (data?.errors?.username) {
      throw new DuplicateUsernameError(username);
    }
  }
  throw error;
}

export function listUsers(): Promise<IUser[]> {
  return apiClient.get<IUser[]>(`${RESOURCE}?page_size=1000`);
}

export async function createUser(values: IUserCreateFormValues): Promise<IUser> {
  const username = values.username.trim().toLowerCase();
  try {
    return await apiClient.post<IUser>(RESOURCE, {
      username,
      password: values.password,
      name: values.name.trim(),
      role: values.role,
    });
  } catch (error) {
    rethrowUsernameConflict(error, username);
  }
}

export async function updateUser(
  id: string,
  values: IUserUpdateFormValues,
): Promise<IUser> {
  const username = values.username.trim().toLowerCase();
  const patch: Record<string, unknown> = {
    username,
    name: values.name.trim(),
    role: values.role,
  };
  if (values.password && values.password.length > 0) {
    patch.password = values.password;
  }
  try {
    return await apiClient.patch<IUser>(`${RESOURCE}/${id}`, patch);
  } catch (error) {
    rethrowUsernameConflict(error, username);
  }
}

export function deleteUser(id: string): Promise<void> {
  return apiClient.delete<void>(`${RESOURCE}/${id}`);
}
