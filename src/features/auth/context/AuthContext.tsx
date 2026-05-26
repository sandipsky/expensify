import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authenticate } from '../services/authService';
import {
  clearSession,
  persistSession,
  readStoredToken,
  readStoredUser,
} from '../session';
import type { ILoginCredentials, IUser } from '../types';

interface AuthContextValue {
  token: string | null;
  user: IUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (credentials: ILoginCredentials) => Promise<IUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [user, setUser] = useState<IUser | null>(() => readStoredUser());

  const login = useCallback(
    async (credentials: ILoginCredentials): Promise<IUser> => {
      const authenticated = await authenticate(credentials);
      const sessionToken = `session-${authenticated.id}-${Date.now()}`;
      persistSession(authenticated, sessionToken);
      queryClient.clear();
      setToken(sessionToken);
      setUser(authenticated);
      return authenticated;
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    clearSession();
    queryClient.clear();
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      isAdmin: user?.role === 'admin',
      login,
      logout,
    }),
    [token, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
