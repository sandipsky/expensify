import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { config } from '../config/env';
import { queryClient } from '../lib/queryClient';
import { login as loginRequest } from '../features/auth/services/authService';
import type { ILoginCredentials, IUser } from '../features/auth/types';

interface AuthState {
  token: string | null;
  user: IUser | null;
}

interface AuthActions {
  login: (credentials: ILoginCredentials) => Promise<IUser>;
  logout: () => void;
}

type AuthStore = AuthState & AuthActions;

const AUTH_STORAGE_KEY = 'expensify-auth';

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set) => ({
        token: null,
        user: null,
        login: async (credentials): Promise<IUser> => {
          const { token, user } = await loginRequest(credentials);
          // Drop any cached server state from a previous session.
          queryClient.clear();
          set({ token, user }, false, 'auth/login');
          return user;
        },
        logout: (): void => {
          queryClient.clear();
          set({ token: null, user: null }, false, 'auth/logout');
          window.location.href = '/login';
        },
      }),
      {
        name: AUTH_STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
        partialize: ({ token, user }): AuthState => ({ token, user }),
      },
    ),
    { name: 'AuthStore', enabled: config.app.isDev },
  ),
);

// Selectors — use with `useAuthStore(selector)` to subscribe to a slice.
export const selectToken = (state: AuthStore): string | null => state.token;
export const selectUser = (state: AuthStore): IUser | null => state.user;
export const selectIsAuthenticated = (state: AuthStore): boolean =>
  Boolean(state.token);
export const selectIsAdmin = (state: AuthStore): boolean =>
  state.user?.role === 'admin';

// Non-reactive helpers for use outside React (route guards, service modules).
export function isAuthenticated(): boolean {
  return Boolean(useAuthStore.getState().token);
}

export function getCurrentUser(): IUser | null {
  return useAuthStore.getState().user;
}

export function getCurrentUserId(): string {
  const user = useAuthStore.getState().user;
  if (!user) {
    throw new Error('No authenticated user');
  }
  return user.id;
}
