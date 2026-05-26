import { apiClient } from '../../../lib/apiClient';
import type { ILoginCredentials, IStoredUser, IUser } from '../types';

const RESOURCE = '/users';

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid username or password');
    this.name = 'InvalidCredentialsError';
  }
}

export async function authenticate(
  credentials: ILoginCredentials,
): Promise<IUser> {
  const username = credentials.username.trim().toLowerCase();
  const matches = await apiClient.get<IStoredUser[]>(
    `${RESOURCE}?username=${encodeURIComponent(username)}`,
  );
  const stored = matches[0];
  if (!stored || stored.password !== credentials.password) {
    throw new InvalidCredentialsError();
  }
  return stripPassword(stored);
}

export function stripPassword(user: IStoredUser): IUser {
  const { password: _password, ...rest } = user;
  return rest;
}
