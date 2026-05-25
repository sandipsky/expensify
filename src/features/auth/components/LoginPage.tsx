import { type FormEvent, useEffect, useState } from 'react';
import {
  Button,
  Paper,
  PasswordInput,
  Stack,
  TextInput,
  Title,
} from '@mantine/core';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@expensify.app');
  const [password, setPassword] = useState('demo');

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/' });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login({ email, password });
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
              label="Email"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              required
            />
            <PasswordInput
              label="Password"
              placeholder="Your password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
            />
            <Button type="submit" fullWidth mt="sm" size="md">
              Sign in
            </Button>
            <p className="login-page-hint">
              Demo mode — any email/password works.
            </p>
          </Stack>
        </form>
      </Paper>
    </div>
  );
}
