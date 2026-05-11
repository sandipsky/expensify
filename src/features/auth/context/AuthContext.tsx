import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ILoginCredentials, IUser } from '../types';

const TOKEN_KEY = 'expensify_token';
const USER_KEY = 'expensify_user';

interface AuthContextValue {
  token: string | null;
  user: IUser | null;
  isAuthenticated: boolean;
  login: (credentials: ILoginCredentials) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): IUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as IUser;
  } catch {
    return null;
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [user, setUser] = useState<IUser | null>(() => readStoredUser());

  const login = useCallback((credentials: ILoginCredentials) => {
    const dummyToken = `dummy-token-${Date.now()}`;
    const dummyUser: IUser = {
      name: credentials.email.split('@')[0] || 'User',
      email: credentials.email,
    };

    localStorage.setItem(TOKEN_KEY, dummyToken);
    localStorage.setItem(USER_KEY, JSON.stringify(dummyUser));
    setToken(dummyToken);
    setUser(dummyUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
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
