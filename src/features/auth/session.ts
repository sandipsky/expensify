import type { IUser } from './types';

export const TOKEN_KEY = 'expensify_token';
export const USER_KEY = 'expensify_user';

export function readStoredUser(): IUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as IUser;
  } catch {
    return null;
  }
}

export function readStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(readStoredToken());
}

export function getCurrentUserId(): string {
  const user = readStoredUser();
  if (!user) {
    throw new Error('No authenticated user');
  }
  return user.id;
}

export function persistSession(user: IUser, token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
