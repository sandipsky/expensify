import { type FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Paper,
  PasswordInput,
  Stack,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../context/AuthContext';
import { InvalidCredentialsError } from '../services/authService';
import './LoginPage.css';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/' });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login({ username, password });
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        setError('Invalid username or password.');
      } else {
        setError(
          err instanceof Error ? err.message : 'Sign in failed. Please try again.',
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <Paper className="login-page-card" radius="lg" p="xl">
        <div className="login-page-brand">
          <span className="login-page-brand-mark">E</span>
        </div>
        <Title order={2} ta="center" mb="xs">
          Welcome back
        </Title>
        <p className="login-page-hint" style={{ marginBottom: '1.5rem' }}>
          Sign in to manage your finances
        </p>

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Username"
              placeholder="your username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.currentTarget.value)}
              required
              autoFocus
            />
            <PasswordInput
              label="Password"
              placeholder="Your password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
            />
            {error && (
              <Alert
                color="red"
                variant="light"
                icon={<IconAlertCircle size={16} />}
              >
                {error}
              </Alert>
            )}
            <Button type="submit" fullWidth mt="sm" size="md" loading={busy}>
              Sign in
            </Button>
            <p className="login-page-hint">
              Default admin: <strong>admin</strong> / <strong>admin</strong>
            </p>
          </Stack>
        </form>
      </Paper>
    </div>
  );
}
